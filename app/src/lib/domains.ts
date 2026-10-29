import type { IconName } from "../components/Icon";
import type { Entity, ServiceCall } from "../ha/types";

// What each kind of Home Assistant device is, how it looks, and what one tap does.

export const domainOf = (id: string) => id.split(".")[0];
export const objectId = (id: string) => id.split(".")[1] ?? id;

export const DOMAIN_LABELS: Record<string, string> = {
  light: "Lights",
  switch: "Switches",
  input_boolean: "Toggles",
  fan: "Fans",
  cover: "Blinds & covers",
  climate: "Climate",
  lock: "Locks",
  media_player: "Media",
  vacuum: "Vacuums",
  camera: "Cameras",
  alarm_control_panel: "Alarm",
  binary_sensor: "Sensors",
  sensor: "Readings",
  scene: "Scenes",
  script: "Scripts",
  automation: "Automations",
};

/** Domains shown as device tiles (not cameras, alarm or automations — those have their own places). */
export const DEVICE_DOMAINS = [
  "light",
  "switch",
  "input_boolean",
  "fan",
  "cover",
  "climate",
  "lock",
  "media_player",
  "vacuum",
  "binary_sensor",
  "sensor",
];

/** Sensors worth showing; the rest (signal strength, uptime…) is noise on a home screen. */
const USEFUL_SENSORS = ["temperature", "humidity", "power", "energy", "battery", "illuminance", "carbon_dioxide", "pm25"];
const USEFUL_BINARY = ["door", "window", "opening", "garage_door", "motion", "occupancy", "presence", "smoke", "moisture", "gas", "battery"];

export function isDevice(e: Entity): boolean {
  const d = domainOf(e.entity_id);
  if (!DEVICE_DOMAINS.includes(d)) return false;
  if (d === "sensor") return USEFUL_SENSORS.includes(e.attributes.device_class ?? "");
  if (d === "binary_sensor") return USEFUL_BINARY.includes(e.attributes.device_class ?? "");
  return true;
}

export const TOGGLE_DOMAINS = ["light", "switch", "input_boolean", "fan", "automation"];
export const unavailable = (e: Entity) => e.state === "unavailable" || e.state === "unknown";

/** "Active" means: the tile should glow. */
export function isActive(e: Entity): boolean {
  switch (domainOf(e.entity_id)) {
    case "cover":
      return e.state === "open" || e.state === "opening";
    case "lock":
      return e.state === "unlocked";
    case "media_player":
      return e.state === "playing";
    case "vacuum":
      return e.state === "cleaning";
    case "climate":
      return e.state !== "off" && !unavailable(e);
    default:
      return e.state === "on";
  }
}

export function iconFor(e: Entity): IconName {
  const dc = e.attributes.device_class ?? "";
  switch (domainOf(e.entity_id)) {
    case "light":
      return "bulb";
    case "switch":
      return "plug";
    case "input_boolean":
      return "toggle";
    case "fan":
      return "fan";
    case "cover":
      return "blinds";
    case "climate":
      return "thermometer";
    case "lock":
      return e.state === "unlocked" ? "unlock" : "lock";
    case "media_player":
      return "tv";
    case "vacuum":
      return "vacuum";
    case "camera":
      return "camera";
    case "alarm_control_panel":
      return "shield";
    case "scene":
      return "sparkle";
    case "script":
      return "play";
    case "automation":
      return "bolt";
    case "binary_sensor":
      if (dc === "window") return "window";
      if (["door", "opening", "garage_door"].includes(dc)) return "door";
      if (["motion", "occupancy", "presence"].includes(dc)) return "motion";
      if (dc === "battery") return "battery";
      return "sensor";
    case "sensor":
      if (dc === "temperature") return "thermometer";
      if (dc === "humidity") return "drop";
      if (dc === "battery") return "battery";
      if (dc === "power" || dc === "energy") return "bolt";
      if (dc === "illuminance") return "sun";
      return "gauge";
    default:
      return "sensor";
  }
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

/** The short status line under a tile's name, in plain words. */
export function stateText(e: Entity): string {
  if (unavailable(e)) return "Offline";
  const a = e.attributes;
  const dc = a.device_class ?? "";
  switch (domainOf(e.entity_id)) {
    case "light":
      if (e.state !== "on") return "Off";
      return typeof a.brightness === "number" ? `${Math.round((a.brightness / 255) * 100)}%` : "On";
    case "cover":
      return typeof a.current_position === "number" && e.state === "open"
        ? `Open ${a.current_position}%`
        : capital(e.state);
    case "climate": {
      const cur = a.current_temperature;
      const now = cur != null ? ` · now ${cur}°` : "";
      if (e.state === "off") return cur != null ? `Off · ${cur}°` : "Off";
      const target = climateTarget(e);
      const mode = CLIMATE_MODES[e.state] ?? capital(e.state.replace(/_/g, " "));
      if (!target) return `${mode}${now}`;
      return `${mode} → ${target.kind === "single" ? target.value : `${target.low}–${target.high}`}°${now}`;
    }
    case "media_player": {
      const title = a.media_title as string | undefined;
      return e.state === "playing" && title ? title : capital(e.state);
    }
    case "vacuum":
      return e.state === "docked" ? "Docked" : capital(e.state);
    case "binary_sensor": {
      const on = e.state === "on";
      if (["door", "window", "opening", "garage_door"].includes(dc)) return on ? "Open" : "Closed";
      if (["motion", "occupancy", "presence"].includes(dc)) return on ? "Motion" : "Clear";
      if (dc === "battery") return on ? "Low" : "OK";
      return on ? "Detected" : "Clear";
    }
    case "sensor": {
      const unit = (a.unit_of_measurement as string | undefined) ?? "";
      const v = num(e.state);
      if (Number.isNaN(v)) return e.state;
      if (unit === "W" && v >= 1000) return `${(v / 1000).toFixed(1)} kW`;
      return `${Number.isInteger(v) ? v : v.toFixed(1)}${unit === "%" || unit.startsWith("°") ? "" : " "}${unit}`;
    }
    default:
      return capital(e.state.replace(/_/g, " "));
  }
}

const CLIMATE_MODES: Record<string, string> = { heat_cool: "Heat/cool", fan_only: "Fan", dry: "Dry", auto: "Auto", heat: "Heat", cool: "Cool" };

/** A thermostat's target: one temperature, or a low–high range in heat/cool mode. */
export type ClimateTarget = { kind: "single"; value: number } | { kind: "range"; low: number; high: number };

export function climateTarget(e: Entity): ClimateTarget | null {
  const a = e.attributes;
  if (typeof a.temperature === "number") return { kind: "single", value: a.temperature };
  if (typeof a.target_temp_low === "number" && typeof a.target_temp_high === "number")
    return { kind: "range", low: a.target_temp_low, high: a.target_temp_high };
  return null;
}

function capital(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** What a single tap on the tile does. Null = the tile is read-only. */
export function primaryAction(e: Entity): ServiceCall | null {
  if (unavailable(e)) return null;
  const entity_id = e.entity_id;
  const d = domainOf(entity_id);
  const call = (domain: string, service: string): ServiceCall => ({ domain, service, data: { entity_id } });
  if (TOGGLE_DOMAINS.includes(d)) return call(d, "toggle");
  switch (d) {
    case "cover":
      return call("cover", isActive(e) ? "close_cover" : "open_cover");
    case "lock":
      return call("lock", e.state === "locked" ? "unlock" : "lock");
    case "media_player":
      return e.state === "off" ? call("media_player", "turn_on") : call("media_player", "media_play_pause");
    case "vacuum":
      return call("vacuum", e.state === "cleaning" ? "return_to_base" : "start");
    case "climate":
      return {
        domain: "climate",
        service: "set_hvac_mode",
        data: { entity_id, hvac_mode: e.state === "off" ? "heat" : "off" },
      };
    case "scene":
    case "script":
      return call(d, "turn_on");
    default:
      return null;
  }
}

/** Actions that need a "are you sure?" first. Unlocking a door by accident is not funny. */
export function needsConfirm(call: ServiceCall): boolean {
  return call.domain === "lock" && call.service === "unlock";
}
