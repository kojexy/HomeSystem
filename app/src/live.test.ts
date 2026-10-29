// Tests the app against a real Home Assistant (its "demo" devices).
// Skipped unless HA_URL and HA_TOKEN are set — CI starts HA for this: .github/workflows/live-test.yml
import { describe, expect, it } from "vitest";
import { createConnection, createLongLivedTokenAuth } from "home-assistant-js-websocket";
import { createHassBackend } from "./ha/hass";
import type { ConnectionStatus, Entities, HomeBackend, Rooms } from "./ha/types";
import { climateTarget, primaryAction, stateText } from "./lib/domains";
import { alarmOf, groupByRoom, insights, ofDomain, planMode, summarize } from "./lib/home";

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const HA_URL = env.HA_URL ?? "";
const HA_TOKEN = env.HA_TOKEN ?? "";

/** Waits until check() passes, or fails with the last error. */
async function until<T>(check: () => T | undefined | null | false, ms = 15000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = check();
    if (v) return v;
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 200));
  }
}

function connect(token = HA_TOKEN) {
  const backend: HomeBackend = createHassBackend({ mode: "live", hassUrl: HA_URL, token, go2rtcUrl: "" });
  const live = { entities: {} as Entities, rooms: null as Rooms | null, status: "connecting" as ConnectionStatus };
  const unsub = backend.subscribe(
    (e) => (live.entities = e),
    (s) => (live.status = s),
    (r) => (live.rooms = r)
  );
  const close = () => {
    unsub();
    backend.close();
  };
  return { backend, live, close };
}

describe.skipIf(!HA_URL || !HA_TOKEN)("live Home Assistant", () => {
  it("rejects a wrong token", async () => {
    const { live, close } = connect("not-a-token");
    await until(() => live.status === "auth-failed");
    close();
  });

  it("connects, loads devices and rooms, and runs real actions", async () => {
    // A room for the test, the way the user makes them in HA → Areas.
    const admin = await createConnection({ auth: createLongLivedTokenAuth(HA_URL, HA_TOKEN) });
    const area = await admin.sendMessagePromise<{ area_id: string }>({ type: "config/area_registry/create", name: `Test room ${Date.now()}` });

    const { live, close } = connect();
    await until(() => live.status === "online");
    const entities = await until(() => (Object.keys(live.entities).length > 20 ? live.entities : null));

    const lights = ofDomain(entities, "light");
    expect(lights.length).toBeGreaterThan(2);
    // Like the HA UI: the room goes on the light's device; the app must find it through the device.
    const reg = await admin.sendMessagePromise<{ device_id: string | null }>({ type: "config/entity_registry/get", entity_id: lights[0].entity_id });
    expect(reg.device_id).toBeTruthy();
    await admin.sendMessagePromise({ type: "config/device_registry/update", device_id: reg.device_id, area_id: area.area_id });
    admin.close();

    // Rooms: the app reloads them when it reconnects; a fresh connection picks the new room up.
    close();
    const second = connect();
    await until(() => second.live.status === "online" && second.live.rooms?.areas.some((a) => a.id === area.area_id));
    await until(() => Object.keys(second.live.entities).length > 20);
    const rooms = groupByRoom(second.live.entities, second.live.rooms!);
    expect(rooms.find((r) => r.id === area.area_id)?.entities.map((e) => e.entity_id)).toContain(lights[0].entity_id);

    // A tap on a light tile toggles the real light.
    const light = second.live.entities[lights[0].entity_id];
    const before = light.state;
    await second.backend.callService("light", "toggle", { entity_id: light.entity_id });
    await until(() => second.live.entities[light.entity_id].state !== before);
    expect(primaryAction(light)?.service).toBe("toggle");

    // The alarm arms with its code and disarms again.
    const alarm = alarmOf(second.live.entities);
    expect(alarm?.attributes.code_format).toBeTruthy();
    await second.backend.callService("alarm_control_panel", "alarm_arm_away", { entity_id: alarm!.entity_id, code: "1234" });
    await until(() => ["arming", "armed_away"].includes(second.live.entities[alarm!.entity_id].state));
    await second.backend.callService("alarm_control_panel", "alarm_disarm", { entity_id: alarm!.entity_id, code: "1234" });
    await until(() => second.live.entities[alarm!.entity_id].state === "disarmed");

    // A wrong code is refused with a readable error.
    await expect(
      second.backend.callService("alarm_control_panel", "alarm_arm_away", { entity_id: alarm!.entity_id, code: "0000" })
    ).rejects.toThrow();

    // A heat/cool thermostat shows its range and accepts a new one (what the − / + buttons send).
    const ranged = ofDomain(second.live.entities, "climate").find((c) => climateTarget(c)?.kind === "range");
    if (ranged) {
      expect(stateText(ranged)).not.toContain("undefined");
      const t = climateTarget(ranged) as { low: number; high: number };
      await second.backend.callService("climate", "set_temperature", { entity_id: ranged.entity_id, target_temp_low: t.low + 1, target_temp_high: t.high + 1 });
      await until(() => second.live.entities[ranged.entity_id].attributes.target_temp_low === t.low + 1);
    }

    // Camera stills load through HA's signed link.
    const camera = ofDomain(second.live.entities, "camera")[0];
    const still = second.backend.snapshotUrl(camera);
    expect(still).toBeTruthy();
    const res = await fetch(still!);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^image\//);

    // No Frigate here: the events feed says so instead of failing.
    expect(await second.backend.events(10)).toBeNull();

    // "Leave home": every light ends up off.
    for (const call of planMode("leave", second.live.entities).calls) {
      await second.backend.callService(call.domain, call.service, call.data).catch(() => undefined);
    }
    await until(() => ofDomain(second.live.entities, "light").every((l) => l.state !== "on"));

    // The summary and warnings work on real data without crashing.
    expect(summarize(second.live.entities).lightsOn).toBe(0);
    expect(Array.isArray(insights(second.live.entities))).toBe(true);

    second.close();
  }, 60000);
});
