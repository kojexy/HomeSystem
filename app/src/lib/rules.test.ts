import { describe, expect, it } from "vitest";
import { demoEntities } from "../ha/demo";
import { BELL, fromHa, ruleProblem, ruleSummary, toHa, type Rule } from "./rules";

const all = demoEntities();

const motionLight: Rule = {
  name: "Hallway light on motion",
  triggers: [{ kind: "device", entity: "binary_sensor.hallway_motion", to: "on" }],
  conditions: [{ kind: "between", after: "18:00", before: "07:00" }],
  actions: [
    { kind: "device", entity: "light.kitchen", service: "turn_on" },
    { kind: "wait", minutes: 2 },
    { kind: "device", entity: "light.kitchen", service: "turn_off" },
  ],
};

describe("automations made in the app", () => {
  it("turns a rule into Home Assistant's automation config", () => {
    expect(toHa(motionLight, "123")).toEqual({
      id: "123",
      alias: "Hallway light on motion",
      description: "Made in the HomeSystem app",
      mode: "restart",
      triggers: [{ trigger: "state", entity_id: "binary_sensor.hallway_motion", to: "on" }],
      conditions: [{ condition: "time", after: "18:00:00", before: "07:00:00" }],
      actions: [
        { action: "light.turn_on", target: { entity_id: "light.kitchen" } },
        { delay: { minutes: 2 } },
        { action: "light.turn_off", target: { entity_id: "light.kitchen" } },
      ],
    });
  });

  it("reads back every kind it writes", () => {
    const rule: Rule = {
      id: "9",
      name: "Everything",
      triggers: [
        { kind: "time", at: "07:30" },
        { kind: "sun", event: "sunset", offsetMin: -30 },
        { kind: "sun", event: "sunrise", offsetMin: 0 },
        { kind: "number", entity: "sensor.bedroom_temperature", above: 26, below: null },
        { kind: "presence", who: "everyone_left" },
        { kind: "presence", who: "someone_home" },
      ],
      conditions: [
        { kind: "days", days: ["mon", "tue", "wed", "thu", "fri"] },
        { kind: "device", entity: "alarm_control_panel.alarmo", state: "disarmed" },
      ],
      actions: [
        { kind: "notify", service: "notify.mobile_app_phone", message: "Too hot" },
        { kind: "notify", service: BELL, message: "Noted" },
        { kind: "device", entity: "scene.movie_time", service: "turn_on" },
        { kind: "device", entity: "alarm_control_panel.alarmo", service: "alarm_arm_away" },
      ],
    };
    expect(fromHa(toHa(rule))).toEqual(rule);
  });

  it("reads automations written by hand in the older style", () => {
    const rule = fromHa({
      id: "1",
      alias: "Lamp at sunset",
      trigger: [{ platform: "sun", event: "sunset", offset: "00:15:00" }],
      action: [{ service: "switch.turn_on", data: { entity_id: "switch.kettle" } }],
    });
    expect(rule?.triggers).toEqual([{ kind: "sun", event: "sunset", offsetMin: 15 }]);
    expect(rule?.actions).toEqual([{ kind: "device", entity: "switch.kettle", service: "turn_on" }]);
  });

  it("refuses what the editor can't show, so nothing is lost on save", () => {
    expect(fromHa({ id: "1", alias: "x", triggers: [{ trigger: "mqtt", topic: "a" }], actions: [] })).toBeNull();
    expect(fromHa({ id: "1", alias: "x", triggers: [{ trigger: "state", entity_id: "light.a", to: "on", for: "00:05:00" }], actions: [] })).toBeNull();
    expect(fromHa({ id: "1", alias: "x", triggers: [], actions: [{ action: "light.turn_on", target: { entity_id: "light.a" }, data: { brightness_pct: 30 } }] })).toBeNull();
  });

  it("explains itself in plain words", () => {
    expect(ruleSummary(motionLight, all)).toBe("Hallway motion sees motion → Turn on Kitchen light, Wait 2 min, Turn off Kitchen light");
  });

  it("says what is missing before saving", () => {
    expect(ruleProblem({ ...motionLight, name: " " })).toBe("Give it a name.");
    expect(ruleProblem({ ...motionLight, triggers: [] })).toBe("Add at least one “When”.");
    expect(ruleProblem({ ...motionLight, actions: [] })).toBe("Add at least one “Then”.");
    expect(ruleProblem({ ...motionLight, actions: [{ kind: "notify", service: BELL, message: "" }] })).toBe("Write the alert text.");
    expect(ruleProblem(motionLight)).toBeNull();
  });
});
