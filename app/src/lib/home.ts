import type { Entities, Entity } from "../ha/types";

export interface HomeView {
  lights: Entity[];
  alarm: Entity | null;
  sensors: Entity[];
  cameras: Entity[];
}

const byName = (a: Entity, b: Entity) => name(a).localeCompare(name(b));

export function name(e: Entity): string {
  return e.attributes.friendly_name ?? e.entity_id.split(".")[1].replace(/_/g, " ");
}

const domainOf = (id: string) => id.split(".")[0];

/** Sorts raw HA entities into the groups the screen shows. */
export function groupHome(entities: Entities): HomeView {
  const all = Object.values(entities);
  const pick = (domains: string[]) => all.filter((e) => domains.includes(domainOf(e.entity_id))).sort(byName);
  const sensorClasses = ["door", "window", "motion", "occupancy", "opening", "smoke", "moisture"];

  return {
    lights: pick(["light", "switch"]),
    alarm: pick(["alarm_control_panel"])[0] ?? null,
    sensors: pick(["binary_sensor"]).filter((e) => sensorClasses.includes(e.attributes.device_class ?? "")),
    cameras: pick(["camera"]),
  };
}

/** HA brightness is 0–255; people think in percent. */
export function brightnessPct(e: Entity): number {
  if (e.state !== "on") return 0;
  const b = e.attributes.brightness;
  return typeof b === "number" ? Math.round((b / 255) * 100) : 100;
}

const ALARM_LABELS: Record<string, string> = {
  disarmed: "Disarmed",
  armed_home: "Armed — home",
  armed_away: "Armed — away",
  armed_night: "Armed — night",
  arming: "Arming…",
  pending: "Entry delay…",
  triggered: "ALARM",
};

export function alarmLabel(state: string): string {
  return ALARM_LABELS[state] ?? state;
}

export function sensorLabel(e: Entity): string {
  const active = e.state === "on";
  switch (e.attributes.device_class) {
    case "door":
    case "window":
    case "opening":
      return active ? "Open" : "Closed";
    case "motion":
    case "occupancy":
      return active ? "Motion" : "Clear";
    default:
      return active ? "Alert" : "OK";
  }
}
