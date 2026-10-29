import type { Entities, Entity, HomeBackend, Rooms } from "./types";

// A pretend home so the app can be designed and tested before any hardware arrives.

const now = () => new Date().toISOString();

function entity(entity_id: string, state: string, attributes: Entity["attributes"]): Entity {
  return { entity_id, state, attributes, last_changed: now() };
}

const W = { unit_of_measurement: "W", device_class: "power" };

export function demoEntities(): Entities {
  const list = [
    // Living room
    entity("light.living_room", "on", { friendly_name: "Ceiling", brightness: 180 }),
    entity("light.floor_lamp", "off", { friendly_name: "Floor lamp" }),
    entity("media_player.living_room_tv", "playing", { friendly_name: "TV", media_title: "Evening news", volume_level: 0.3 }),
    entity("climate.living_room", "heat", { friendly_name: "Heating", temperature: 21.5, current_temperature: 20.8, min_temp: 7, max_temp: 30, target_temp_step: 0.5 }),
    entity("sensor.living_room_temperature", "20.8", { friendly_name: "Temperature", device_class: "temperature", unit_of_measurement: "°C" }),
    entity("sensor.living_room_humidity", "46", { friendly_name: "Humidity", device_class: "humidity", unit_of_measurement: "%" }),
    entity("sensor.tv_power", "92", { friendly_name: "TV power", ...W }),
    // Kitchen
    entity("light.kitchen", "off", { friendly_name: "Kitchen light" }),
    entity("switch.kettle", "off", { friendly_name: "Kettle" }),
    entity("binary_sensor.kitchen_window", "on", { friendly_name: "Kitchen window", device_class: "window" }),
    entity("sensor.washing_machine_power", "2140", { friendly_name: "Washing machine power", ...W }),
    entity("sensor.fridge_power", "64", { friendly_name: "Fridge power", ...W }),
    // Bedroom
    entity("light.bedroom", "off", { friendly_name: "Bedroom light" }),
    entity("cover.bedroom_blinds", "open", { friendly_name: "Blinds", current_position: 100 }),
    entity("fan.bedroom", "off", { friendly_name: "Fan" }),
    entity("sensor.bedroom_temperature", "19.6", { friendly_name: "Temperature", device_class: "temperature", unit_of_measurement: "°C" }),
    // Hallway
    entity("lock.front_door", "locked", { friendly_name: "Front door lock" }),
    entity("binary_sensor.front_door", "off", { friendly_name: "Front door", device_class: "door" }),
    entity("binary_sensor.hallway_motion", "off", { friendly_name: "Hallway motion", device_class: "motion" }),
    entity("sensor.front_door_battery", "12", { friendly_name: "Front door sensor battery", device_class: "battery", unit_of_measurement: "%" }),
    entity("vacuum.robot", "docked", { friendly_name: "Robot vacuum" }),
    entity("switch.garage_plug", "unavailable", { friendly_name: "Garage plug" }),
    // Security
    entity("alarm_control_panel.alarmo", "disarmed", { friendly_name: "Home alarm", code_format: null }),
    entity("camera.front_door", "idle", { friendly_name: "Front door" }),
    entity("camera.garden", "idle", { friendly_name: "Garden" }),
    // Automations, scripts, scenes
    entity("automation.hallway_motion_light", "on", { friendly_name: "Hallway light on motion", last_triggered: now() }),
    entity("automation.alarm_notify", "on", { friendly_name: "Alarm → phone alert", last_triggered: null }),
    entity("automation.window_open_heating_off", "on", { friendly_name: "Window open → heating off", last_triggered: null }),
    entity("automation.low_battery_report", "off", { friendly_name: "Weekly low-battery report", last_triggered: null }),
    entity("scene.movie_time", "unknown", { friendly_name: "Movie time" }),
    entity("script.good_morning", "off", { friendly_name: "Good morning" }),
  ];
  return Object.fromEntries(list.map((e) => [e.entity_id, e]));
}

export function demoRooms(): Rooms {
  const rooms: Record<string, string[]> = {
    living_room: ["light.living_room", "light.floor_lamp", "media_player.living_room_tv", "climate.living_room", "sensor.living_room_temperature", "sensor.living_room_humidity", "sensor.tv_power"],
    kitchen: ["light.kitchen", "switch.kettle", "binary_sensor.kitchen_window", "sensor.washing_machine_power", "sensor.fridge_power"],
    bedroom: ["light.bedroom", "cover.bedroom_blinds", "fan.bedroom", "sensor.bedroom_temperature"],
    hallway: ["lock.front_door", "binary_sensor.front_door", "binary_sensor.hallway_motion", "sensor.front_door_battery", "vacuum.robot"],
  };
  const names: Record<string, string> = { living_room: "Living room", kitchen: "Kitchen", bedroom: "Bedroom", hallway: "Hallway" };
  const entityArea: Record<string, string> = {};
  for (const [area, ids] of Object.entries(rooms)) for (const id of ids) entityArea[id] = area;
  return { areas: Object.entries(names).map(([id, name]) => ({ id, name })), entityArea };
}

const ALARM_STATES: Record<string, string> = {
  alarm_arm_away: "armed_away",
  alarm_arm_home: "armed_home",
  alarm_arm_night: "armed_night",
  alarm_disarm: "disarmed",
};

const ON_OFF: Record<string, (current: string) => string> = {
  turn_on: () => "on",
  turn_off: () => "off",
  toggle: (s) => (s === "on" ? "off" : "on"),
};

/** Applies a service call to the fake state the way HA would. Exported for tests. */
export function applyService(state: Entities, domain: string, service: string, data: Record<string, unknown>): Entities {
  const id = data.entity_id as string;
  const e = state[id];
  if (!e || e.state === "unavailable") return state;
  const a = { ...e.attributes };
  let s = e.state;

  switch (domain) {
    case "light":
    case "switch":
    case "fan":
    case "input_boolean":
    case "automation":
      if (service === "trigger") {
        a.last_triggered = now();
        break;
      }
      if (!ON_OFF[service]) return state;
      s = ON_OFF[service](s);
      if (domain === "light") {
        if (typeof data.brightness_pct === "number") a.brightness = Math.round((data.brightness_pct / 100) * 255);
        else if (s === "on" && !a.brightness) a.brightness = 255;
      }
      break;
    case "cover":
      if (service === "open_cover") [s, a.current_position] = ["open", 100];
      else if (service === "close_cover") [s, a.current_position] = ["closed", 0];
      else if (service === "set_cover_position") {
        a.current_position = data.position as number;
        s = (data.position as number) > 0 ? "open" : "closed";
      }
      break;
    case "lock":
      s = service === "unlock" ? "unlocked" : "locked";
      break;
    case "media_player":
      if (service === "turn_off") s = "off";
      else if (service === "turn_on") s = "idle";
      else if (service === "media_play_pause") s = s === "playing" ? "paused" : "playing";
      else if (service === "volume_set") a.volume_level = data.volume_level as number;
      break;
    case "vacuum":
      s = service === "start" ? "cleaning" : "returning";
      break;
    case "climate":
      if (service === "set_temperature") a.temperature = data.temperature as number;
      if (service === "set_hvac_mode") s = data.hvac_mode as string;
      break;
    case "alarm_control_panel":
      if (!ALARM_STATES[service]) return state;
      s = ALARM_STATES[service];
      break;
    case "scene":
    case "script":
      a.last_triggered = now();
      break;
    default:
      return state;
  }
  return { ...state, [id]: { ...e, state: s, attributes: a, last_changed: now() } };
}

/** A drawn camera frame with a live clock, so the camera card looks real in demo mode. */
export function demoCameraFrame(camera: Entity): string {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const garden = camera.entity_id.includes("garden");
  const scene = garden
    ? `<rect y="250" width="640" height="110" fill="#1d3324"/><circle cx="520" cy="80" r="26" fill="#3a4a5c"/>
       <path d="M60 250l40-120 40 120zM180 250l55-160 55 160z" fill="#173022"/><rect x="380" y="200" width="160" height="50" fill="#2a2f36"/>`
    : `<rect y="270" width="640" height="90" fill="#2a2d33"/><rect x="250" y="70" width="140" height="200" fill="#3a3027" stroke="#5a4a3a" stroke-width="6"/>
       <circle cx="365" cy="175" r="6" fill="#c9a86a"/><rect x="430" y="110" width="120" height="90" fill="#26323f"/><rect x="100" y="110" width="110" height="90" fill="#26323f"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
    <defs><radialGradient id="v" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".6"/></radialGradient></defs>
    <rect width="640" height="360" fill="${garden ? "#16202a" : "#1b1f26"}"/>${scene}
    <rect width="640" height="360" fill="url(#v)"/>
    <text x="620" y="340" text-anchor="end" font-family="monospace" font-size="16" fill="#e8eef4" opacity=".8">${time}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createDemoBackend(): HomeBackend {
  let state = demoEntities();
  let listener: ((e: Entities) => void) | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    subscribe(onEntities, onStatus, onRooms) {
      listener = onEntities;
      onStatus("online");
      onRooms(demoRooms());
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
      if (domain === "scene" && data.entity_id === "scene.movie_time") {
        state = applyService(state, "light", "turn_on", { entity_id: "light.living_room", brightness_pct: 15 });
        state = applyService(state, "light", "turn_off", { entity_id: "light.floor_lamp" });
        state = applyService(state, "cover", "close_cover", { entity_id: "cover.bedroom_blinds" });
      }
      state = applyService(state, domain, service, data);
      listener?.(state);
    },

    snapshotUrl(camera) {
      return demoCameraFrame(camera);
    },

    close() {
      clearInterval(timer);
    },
  };
}
