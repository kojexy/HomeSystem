import { toHa, type HaAutomation } from "../lib/rules";
import type { CamEvent, Entities, Entity, HomeBackend, Rooms } from "./types";

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
    entity("automation.hallway_motion_light", "on", { friendly_name: "Hallway light on motion", id: "demo1", last_triggered: now() }),
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
  return svgUrl(svg);
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** A small drawn picture of what the camera saw, with Frigate's box around it. */
function eventPicture(label: string, garden: boolean): string {
  const figure =
    label === "person"
      ? `<circle cx="320" cy="120" r="26" fill="#9aa7b4"/><rect x="290" y="150" width="60" height="120" rx="22" fill="#4a6a8a"/><rect x="345" y="210" width="40" height="34" rx="4" fill="#b08a5a"/>`
      : label === "cat"
        ? `<ellipse cx="320" cy="250" rx="46" ry="22" fill="#d08a3c"/><circle cx="366" cy="226" r="17" fill="#d08a3c"/><path d="M356 212l4-14 8 12M372 212l6-12 4 14" fill="#d08a3c"/>`
        : `<rect x="210" y="190" width="220" height="60" rx="18" fill="#6c7f94"/><rect x="250" y="160" width="130" height="44" rx="14" fill="#56687c"/><circle cx="260" cy="252" r="18" fill="#1b1f26"/><circle cx="380" cy="252" r="18" fill="#1b1f26"/>`;
  const box = label === "person" ? [272, 84, 128, 196] : label === "cat" ? [262, 196, 140, 84] : [196, 146, 248, 130];
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="${garden ? "#16202a" : "#1b1f26"}"/>
    <rect y="${garden ? 250 : 270}" width="640" height="${garden ? 110 : 90}" fill="${garden ? "#1d3324" : "#2a2d33"}"/>
    ${garden ? "" : `<rect x="430" y="70" width="140" height="200" fill="#3a3027"/>`}${figure}
    <rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="none" stroke="#5ce1e6" stroke-width="4" rx="6"/>
  </svg>`);
}

/** What a day of Frigate + AI looks like, relative to now. */
export function demoEvents(nowMs = Date.now()): CamEvent[] {
  const t = nowMs / 1000;
  const list: [string, string, string, string | null, number, number, string | null][] = [
    ["d1", "front_door", "person", null, 4, 0.91, "A courier in a blue jacket leaves a parcel by the door and walks away."],
    ["d2", "garden", "cat", null, 38, 0.82, "An orange cat crosses the lawn and sits under the bench."],
    ["d3", "front_door", "person", "Anna", 95, 0.88, "Anna comes home with shopping bags and unlocks the door."],
    ["d4", "garden", "car", null, 190, 0.86, "A grey car parks in the driveway; nobody gets out yet."],
    ["d5", "front_door", "person", null, 600, 0.77, null],
  ];
  return list.map(([id, camera, label, subLabel, minAgo, score, description]) => {
    const pic = eventPicture(label, camera === "garden");
    return {
      id,
      camera,
      label,
      subLabel,
      start: t - minAgo * 60,
      end: t - minAgo * 60 + 25,
      score,
      description,
      thumbUrl: pic,
      snapshotUrl: pic,
      clipUrl: null,
    };
  });
}

/** The one demo automation that was "made in the app", so its editor opens. */
function demoAutomations(): Map<string, HaAutomation> {
  const motionLight = toHa(
    {
      name: "Hallway light on motion",
      triggers: [{ kind: "device", entity: "binary_sensor.hallway_motion", to: "on" }],
      conditions: [{ kind: "between", after: "18:00", before: "07:00" }],
      actions: [
        { kind: "device", entity: "light.kitchen", service: "turn_on" },
        { kind: "wait", minutes: 2 },
        { kind: "device", entity: "light.kitchen", service: "turn_off" },
      ],
    },
    "demo1"
  );
  return new Map([[motionLight.id, motionLight]]);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "automation";

export function createDemoBackend(): HomeBackend {
  const events = demoEvents();
  const automations = demoAutomations();
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

    async liveStream() {
      return null;
    },

    async events(limit) {
      return events.slice(0, limit);
    },

    async automation(id) {
      return automations.get(id) ?? null;
    },

    async saveAutomation(config) {
      automations.set(config.id, config);
      const old = Object.values(state).find((e) => e.entity_id.startsWith("automation.") && e.attributes.id === config.id);
      const id = old?.entity_id ?? `automation.${slug(config.alias)}`;
      state = { ...state, [id]: entity(id, old?.state ?? "on", { friendly_name: config.alias, id: config.id, last_triggered: old?.attributes.last_triggered ?? null }) };
      listener?.(state);
    },

    async deleteAutomation(id) {
      automations.delete(id);
      state = Object.fromEntries(Object.entries(state).filter(([, e]) => !(e.entity_id.startsWith("automation.") && e.attributes.id === id)));
      listener?.(state);
    },

    async notifyServices() {
      return ["notify.mobile_app_my_phone"];
    },

    close() {
      clearInterval(timer);
    },
  };
}
