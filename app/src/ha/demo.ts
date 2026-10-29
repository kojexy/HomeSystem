import type { Entities, Entity, HomeBackend } from "./types";

// A pretend home so the app can be designed and tested before any hardware arrives.

const now = () => new Date().toISOString();

function entity(entity_id: string, state: string, attributes: Entity["attributes"]): Entity {
  return { entity_id, state, attributes, last_changed: now() };
}

export function demoEntities(): Entities {
  const list = [
    entity("light.living_room", "on", { friendly_name: "Living room", brightness: 180 }),
    entity("light.kitchen", "off", { friendly_name: "Kitchen" }),
    entity("light.bedroom", "off", { friendly_name: "Bedroom" }),
    entity("switch.desk_lamp", "on", { friendly_name: "Desk lamp" }),
    entity("alarm_control_panel.home_alarm", "disarmed", { friendly_name: "Home alarm", code_format: null }),
    entity("binary_sensor.front_door", "off", { friendly_name: "Front door", device_class: "door" }),
    entity("binary_sensor.hallway_motion", "off", { friendly_name: "Hallway motion", device_class: "motion" }),
    entity("camera.front_door", "idle", { friendly_name: "Front door camera" }),
  ];
  return Object.fromEntries(list.map((e) => [e.entity_id, e]));
}

const ALARM_STATES: Record<string, string> = {
  alarm_arm_away: "armed_away",
  alarm_arm_home: "armed_home",
  alarm_arm_night: "armed_night",
  alarm_disarm: "disarmed",
};

/** Applies a service call to the fake state the same way HA would. Exported for tests. */
export function applyService(state: Entities, domain: string, service: string, data: Record<string, unknown>): Entities {
  const id = data.entity_id as string;
  const e = state[id];
  if (!e) return state;
  let next: Entity = e;

  if (domain === "light" || domain === "switch" || domain === "homeassistant") {
    const on = service === "turn_on" || (service === "toggle" && e.state !== "on");
    const attributes = { ...e.attributes };
    if (domain === "light") {
      if (typeof data.brightness_pct === "number") attributes.brightness = Math.round((data.brightness_pct / 100) * 255);
      else if (on && !attributes.brightness) attributes.brightness = 255;
    }
    next = { ...e, state: on ? "on" : "off", attributes, last_changed: now() };
  } else if (domain === "alarm_control_panel" && ALARM_STATES[service]) {
    next = { ...e, state: ALARM_STATES[service], last_changed: now() };
  }
  return { ...state, [id]: next };
}

export function createDemoBackend(): HomeBackend {
  let state = demoEntities();
  let listener: ((e: Entities) => void) | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    subscribe(onEntities, onStatus) {
      listener = onEntities;
      onStatus("online");
      onEntities(state);
      // Someone walks down the hallway now and then.
      timer = setInterval(() => {
        const m = state["binary_sensor.hallway_motion"];
        state = { ...state, [m.entity_id]: { ...m, state: m.state === "on" ? "off" : "on", last_changed: now() } };
        listener?.(state);
      }, 12000);
      return () => {
        clearInterval(timer);
        listener = null;
      };
    },

    async callService(domain, service, data) {
      state = applyService(state, domain, service, data);
      listener?.(state);
    },

    snapshotUrl() {
      return null; // The UI draws a placeholder.
    },

    close() {
      clearInterval(timer);
    },
  };
}
