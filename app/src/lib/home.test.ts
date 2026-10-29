import { describe, expect, it } from "vitest";
import { applyService, demoEntities } from "../ha/demo";
import { brightnessPct, groupHome, sensorLabel } from "./home";

describe("groupHome", () => {
  it("sorts entities into lights, alarm, sensors and cameras", () => {
    const home = groupHome(demoEntities());
    expect(home.lights.map((l) => l.entity_id)).toEqual([
      "light.bedroom",
      "switch.desk_lamp",
      "light.kitchen",
      "light.living_room",
    ]);
    expect(home.alarm?.entity_id).toBe("alarm_control_panel.home_alarm");
    expect(home.sensors).toHaveLength(2);
    expect(home.cameras[0].entity_id).toBe("camera.front_door");
  });

  it("handles an empty home", () => {
    expect(groupHome({})).toEqual({ lights: [], alarm: null, sensors: [], cameras: [] });
  });
});

describe("applyService (demo home)", () => {
  it("toggles a light on and off", () => {
    let s = demoEntities();
    s = applyService(s, "light", "toggle", { entity_id: "light.kitchen" });
    expect(s["light.kitchen"].state).toBe("on");
    s = applyService(s, "light", "toggle", { entity_id: "light.kitchen" });
    expect(s["light.kitchen"].state).toBe("off");
  });

  it("sets brightness in percent", () => {
    const s = applyService(demoEntities(), "light", "turn_on", { entity_id: "light.bedroom", brightness_pct: 50 });
    expect(brightnessPct(s["light.bedroom"])).toBe(50);
  });

  it("arms and disarms the alarm", () => {
    let s = applyService(demoEntities(), "alarm_control_panel", "alarm_arm_away", {
      entity_id: "alarm_control_panel.home_alarm",
    });
    expect(s["alarm_control_panel.home_alarm"].state).toBe("armed_away");
    s = applyService(s, "alarm_control_panel", "alarm_disarm", { entity_id: "alarm_control_panel.home_alarm" });
    expect(s["alarm_control_panel.home_alarm"].state).toBe("disarmed");
  });

  it("ignores unknown entities", () => {
    const s = demoEntities();
    expect(applyService(s, "light", "toggle", { entity_id: "light.nope" })).toBe(s);
  });
});

describe("labels", () => {
  it("names door and motion states in plain words", () => {
    const s = demoEntities();
    expect(sensorLabel(s["binary_sensor.front_door"])).toBe("Closed");
    expect(sensorLabel({ ...s["binary_sensor.hallway_motion"], state: "on" })).toBe("Motion");
  });

  it("reports 0% for a light that is off", () => {
    expect(brightnessPct(demoEntities()["light.kitchen"])).toBe(0);
  });
});
