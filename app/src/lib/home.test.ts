import { describe, expect, it } from "vitest";
import { applyService, demoEntities, demoRooms } from "../ha/demo";
import type { Entities, Entity } from "../ha/types";
import { isDevice, primaryAction, stateText } from "./domains";
import { groupByRoom, insights, planMode, summarize, topConsumers } from "./home";
import { canGoLive, liveStreamUrl } from "./settings";

const set = (s: Entities, id: string, state: string, attrs = {}): Entities => ({
  ...s,
  [id]: { ...s[id], state, attributes: { ...s[id].attributes, ...attrs } },
});

describe("rooms", () => {
  it("groups devices by area, alphabetically", () => {
    const rooms = groupByRoom(demoEntities(), demoRooms());
    // The garage plug has no area, so "Other" closes the list.
    expect(rooms.map((r) => r.name)).toEqual(["Bedroom", "Hallway", "Kitchen", "Living room", "Other"]);
    expect(rooms.find((r) => r.name === "Bedroom")!.entities.map((e) => e.entity_id)).toContain("cover.bedroom_blinds");
  });

  it("puts devices without an area in Other, last", () => {
    const rooms = groupByRoom(demoEntities(), { areas: [], entityArea: {} });
    expect(rooms).toHaveLength(1);
    expect(rooms[0].name).toBe("Other");
  });

  it("does not show cameras, the alarm or automations as devices", () => {
    const e = demoEntities();
    expect(isDevice(e["camera.front_door"])).toBe(false);
    expect(isDevice(e["alarm_control_panel.alarmo"])).toBe(false);
    expect(isDevice(e["automation.alarm_notify"])).toBe(false);
  });
});

describe("tiles", () => {
  it("speaks plain words", () => {
    const e = demoEntities();
    expect(stateText(e["light.living_room"])).toBe("71%");
    expect(stateText(e["binary_sensor.kitchen_window"])).toBe("Open");
    expect(stateText(e["sensor.washing_machine_power"])).toBe("2.1 kW");
    expect(stateText(e["sensor.living_room_temperature"])).toBe("20.8°C");
    expect(stateText(e["switch.garage_plug"])).toBe("Offline");
  });

  it("picks the right tap action", () => {
    const e = demoEntities();
    expect(primaryAction(e["light.kitchen"])).toMatchObject({ domain: "light", service: "toggle" });
    expect(primaryAction(e["lock.front_door"])).toMatchObject({ domain: "lock", service: "unlock" });
    expect(primaryAction(e["cover.bedroom_blinds"])).toMatchObject({ service: "close_cover" });
    expect(primaryAction(e["sensor.fridge_power"])).toBeNull();
    expect(primaryAction(e["switch.garage_plug"])).toBeNull();
  });
});

describe("demo home applies services like HA", () => {
  it("toggles lights and sets brightness", () => {
    let s = applyService(demoEntities(), "light", "toggle", { entity_id: "light.kitchen" });
    expect(s["light.kitchen"].state).toBe("on");
    s = applyService(s, "light", "turn_on", { entity_id: "light.kitchen", brightness_pct: 50 });
    expect(s["light.kitchen"].attributes.brightness).toBe(128);
  });

  it("arms the alarm, locks doors, moves covers, sets climate", () => {
    let s = demoEntities();
    s = applyService(s, "alarm_control_panel", "alarm_arm_away", { entity_id: "alarm_control_panel.alarmo" });
    s = applyService(s, "lock", "unlock", { entity_id: "lock.front_door" });
    s = applyService(s, "cover", "close_cover", { entity_id: "cover.bedroom_blinds" });
    s = applyService(s, "climate", "set_temperature", { entity_id: "climate.living_room", temperature: 22 });
    expect(s["alarm_control_panel.alarmo"].state).toBe("armed_away");
    expect(s["lock.front_door"].state).toBe("unlocked");
    expect(s["cover.bedroom_blinds"].state).toBe("closed");
    expect(s["climate.living_room"].attributes.temperature).toBe(22);
  });

  it("ignores offline and unknown devices", () => {
    const s = demoEntities();
    expect(applyService(s, "switch", "toggle", { entity_id: "switch.garage_plug" })).toBe(s);
    expect(applyService(s, "light", "toggle", { entity_id: "light.nope" })).toBe(s);
  });
});

describe("at a glance", () => {
  it("counts lights, open windows, power and temperature", () => {
    const s = summarize(demoEntities());
    expect(s.lightsOn).toBe(1);
    expect(s.openings.map((e) => e.entity_id)).toEqual(["binary_sensor.kitchen_window"]);
    expect(s.powerW).toBe(92 + 2140 + 64);
    expect(s.insideTemp).toBe(20.2);
  });

  it("lists the biggest power users first", () => {
    expect(topConsumers(demoEntities())[0].entity_id).toBe("sensor.washing_machine_power");
  });
});

describe("insights", () => {
  it("finds the demo home's problems, most urgent first", () => {
    const ids = insights(demoEntities()).map((i) => i.id);
    expect(ids).toContain("window-climate");
    expect(ids).toContain("battery-sensor.front_door_battery");
    expect(ids).toContain("power-sensor.washing_machine_power");
    expect(ids).toContain("offline");
    expect(ids.indexOf("window-climate")).toBeLessThan(ids.indexOf("offline"));
  });

  it("offers to pause heating when a window is open", () => {
    const tip = insights(demoEntities()).find((i) => i.id === "window-climate")!;
    expect(tip.fix!.calls).toEqual([{ domain: "climate", service: "set_hvac_mode", data: { entity_id: "climate.living_room", hvac_mode: "off" } }]);
  });

  it("warns about lights on and doors unlocked while away", () => {
    let s = set(demoEntities(), "alarm_control_panel.alarmo", "armed_away");
    s = set(s, "lock.front_door", "unlocked");
    const tips = insights(s);
    expect(tips[0].id).toBe("unlocked");
    expect(tips.find((t) => t.id === "away-lights")!.fix!.calls).toHaveLength(1);
  });

  it("is quiet when all is well", () => {
    let s = demoEntities();
    s = set(s, "binary_sensor.kitchen_window", "off");
    s = set(s, "sensor.front_door_battery", "80");
    s = set(s, "sensor.washing_machine_power", "0");
    s = set(s, "switch.garage_plug", "off");
    expect(insights(s)).toEqual([]);
  });
});

describe("one-tap modes", () => {
  it("leave: lights and TV off, doors locked, alarm away — plugs untouched", () => {
    let s = set(demoEntities(), "lock.front_door", "unlocked");
    s = set(s, "switch.kettle", "on");
    const { calls, alarmNeedsCode } = planMode("leave", s);
    const ids = calls.map((c) => `${c.domain}.${c.service}:${c.data.entity_id}`);
    expect(ids).toContain("light.turn_off:light.living_room");
    expect(ids).toContain("media_player.turn_off:media_player.living_room_tv");
    expect(ids).toContain("lock.lock:lock.front_door");
    expect(ids).toContain("alarm_control_panel.alarm_arm_away:alarm_control_panel.alarmo");
    expect(ids.some((i) => i.includes("switch.kettle"))).toBe(false);
    expect(alarmNeedsCode).toBe(false);
  });

  it("skips the alarm when it needs a code", () => {
    const s = set(demoEntities(), "alarm_control_panel.alarmo", "disarmed", { code_format: "number" });
    const plan = planMode("night", s);
    expect(plan.alarmNeedsCode).toBe(true);
    expect(plan.calls.some((c) => c.domain === "alarm_control_panel")).toBe(false);
  });

  it("home: only disarms", () => {
    expect(planMode("home", demoEntities()).calls).toEqual([
      { domain: "alarm_control_panel", service: "alarm_disarm", data: { entity_id: "alarm_control_panel.alarmo" } },
    ]);
  });
});

describe("live video", () => {
  it("names the go2rtc stream after the camera", () => {
    const s = { mode: "live" as const, hassUrl: "", token: "", go2rtcUrl: "http://10.0.0.2:1984/" };
    expect(liveStreamUrl(s, "camera.front_door")).toBe("http://10.0.0.2:1984/stream.html?src=front_door&mode=webrtc,mse");
    expect(liveStreamUrl({ ...s, mode: "demo" }, "camera.front_door")).toBeNull();
  });
});

describe("live video", () => {
  const cam = (features: number): Entity => ({ entity_id: "camera.yard", state: "idle", attributes: { supported_features: features }, last_changed: "" });
  const live = { mode: "live" as const, hassUrl: "http://ha:8123", token: "t", go2rtcUrl: "" };

  it("uses Home Assistant's own stream when there is no go2rtc", () => {
    expect(canGoLive(live, cam(2))).toBe(true);
    expect(canGoLive(live, cam(0))).toBe(false); // stills-only camera
    expect(canGoLive({ ...live, go2rtcUrl: "http://ha:1984" }, cam(0))).toBe(true);
    expect(canGoLive({ ...live, mode: "demo" }, cam(2))).toBe(false);
  });
});
