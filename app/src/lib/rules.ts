import type { Entities, Entity } from "../ha/types";
import { domainOf } from "./domains";
import { name, ofDomain } from "./home";

// Automations made in the app, Mi Home style: "When … (only if …) then …".
// A Rule is the app's simple form; toHa/fromHa turn it into Home Assistant's automation config and back.

export type Trigger =
  | { kind: "time"; at: string } // "07:30"
  | { kind: "sun"; event: "sunset" | "sunrise"; offsetMin: number }
  | { kind: "device"; entity: string; to: string }
  | { kind: "number"; entity: string; above: number | null; below: number | null }
  | { kind: "presence"; who: "everyone_left" | "someone_home" };

export type Condition =
  | { kind: "days"; days: Day[] }
  | { kind: "between"; after: string; before: string }
  | { kind: "device"; entity: string; state: string };

export type Action =
  | { kind: "device"; entity: string; service: string }
  | { kind: "notify"; service: string; message: string }
  | { kind: "wait"; minutes: number };

export interface Rule {
  /** HA's automation config id; missing until saved. */
  id?: string;
  name: string;
  triggers: Trigger[];
  conditions: Condition[];
  actions: Action[];
}

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];

/** Home Assistant's automation config, the part this app writes. */
export interface HaAutomation {
  id: string;
  alias: string;
  description?: string;
  mode?: string;
  triggers?: Record<string, unknown>[];
  conditions?: Record<string, unknown>[];
  actions?: Record<string, unknown>[];
  // Older configs use the singular keys.
  trigger?: Record<string, unknown>[];
  condition?: Record<string, unknown>[];
  action?: Record<string, unknown>[];
}

export const MADE_HERE = "Made in the HomeSystem app";
/** Notification to Home Assistant's own bell instead of a phone. */
export const BELL = "persistent_notification.create";

export const emptyRule = (): Rule => ({ name: "", triggers: [], conditions: [], actions: [] });
export const newId = () => String(Date.now());

// ---------- What each kind of device can do ----------

export interface Choice {
  value: string;
  label: string;
}

const ON_OFF: Choice[] = [
  { value: "on", label: "turns on" },
  { value: "off", label: "turns off" },
];

/** States a device can change to, worded for "When <device> …". */
export function triggerStates(e: Entity): Choice[] {
  const dc = e.attributes.device_class;
  switch (domainOf(e.entity_id)) {
    case "binary_sensor":
      if (dc === "motion" || dc === "occupancy" || dc === "presence")
        return [{ value: "on", label: "sees motion" }, { value: "off", label: "sees no motion" }];
      if (dc === "door" || dc === "window" || dc === "opening" || dc === "garage_door")
        return [{ value: "on", label: "opens" }, { value: "off", label: "closes" }];
      if (dc === "moisture") return [{ value: "on", label: "finds water" }, { value: "off", label: "is dry again" }];
      if (dc === "smoke" || dc === "gas") return [{ value: "on", label: "finds smoke or gas" }, { value: "off", label: "is clear" }];
      return [{ value: "on", label: "turns on" }, { value: "off", label: "turns off" }];
    case "lock":
      return [{ value: "unlocked", label: "unlocks" }, { value: "locked", label: "locks" }];
    case "cover":
      return [{ value: "open", label: "opens" }, { value: "closed", label: "closes" }];
    case "alarm_control_panel":
      return [
        { value: "triggered", label: "goes off" },
        { value: "armed_away", label: "is armed (away)" },
        { value: "armed_home", label: "is armed (home)" },
        { value: "armed_night", label: "is armed (night)" },
        { value: "disarmed", label: "is turned off" },
      ];
    case "person":
      return [{ value: "home", label: "comes home" }, { value: "not_home", label: "leaves home" }];
    case "media_player":
      return [{ value: "playing", label: "starts playing" }, { value: "off", label: "turns off" }];
    case "vacuum":
      return [{ value: "cleaning", label: "starts cleaning" }, { value: "docked", label: "is back in its dock" }];
    default:
      return ON_OFF;
  }
}

/** What "Then" can do with a device. */
export function actionServices(e: Entity): Choice[] {
  switch (domainOf(e.entity_id)) {
    case "light":
    case "switch":
    case "fan":
    case "input_boolean":
    case "siren":
    case "climate":
      return [
        { value: "turn_on", label: "Turn on" },
        { value: "turn_off", label: "Turn off" },
        ...(domainOf(e.entity_id) === "climate" ? [] : [{ value: "toggle", label: "Switch over" }]),
      ];
    case "cover":
      return [{ value: "open_cover", label: "Open" }, { value: "close_cover", label: "Close" }];
    case "lock":
      return [{ value: "lock", label: "Lock" }, { value: "unlock", label: "Unlock" }];
    case "media_player":
      return [{ value: "turn_off", label: "Turn off" }, { value: "media_pause", label: "Pause" }, { value: "turn_on", label: "Turn on" }];
    case "vacuum":
      return [{ value: "start", label: "Start cleaning" }, { value: "return_to_base", label: "Send to dock" }];
    case "alarm_control_panel":
      // Turning the alarm off needs the code, so automations only arm it.
      return [
        { value: "alarm_arm_away", label: "Arm (away)" },
        { value: "alarm_arm_home", label: "Arm (home)" },
        { value: "alarm_arm_night", label: "Arm (night)" },
      ];
    case "scene":
    case "script":
      return [{ value: "turn_on", label: "Run" }];
    case "automation":
      return [{ value: "trigger", label: "Run" }, { value: "turn_off", label: "Pause" }, { value: "turn_on", label: "Resume" }];
    default:
      return [];
  }
}

const TRIGGER_DOMAINS = ["binary_sensor", "light", "switch", "fan", "input_boolean", "lock", "cover", "alarm_control_panel", "person", "media_player", "vacuum"];

/** Devices that can start an automation, by on/off-like state. */
export const triggerDevices = (all: Entities) => ofDomain(all, ...TRIGGER_DOMAINS);
/** Sensors with a number (temperature, humidity, power…). */
export const numberSensors = (all: Entities) =>
  ofDomain(all, "sensor").filter((e) => e.attributes.unit_of_measurement !== undefined && Number.isFinite(Number(e.state)));
/** Everything "Then" can control. */
export const actionDevices = (all: Entities) => Object.values(all).filter((e) => actionServices(e).length > 0).sort((a, b) => name(a).localeCompare(name(b)));

// ---------- Words ----------

const DAY_NAMES: Record<Day, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export function daysText(days: Day[]): string {
  const set = DAYS.filter((d) => days.includes(d));
  if (set.length === 7) return "every day";
  if (set.join() === "mon,tue,wed,thu,fri") return "on weekdays";
  if (set.join() === "sat,sun") return "at weekends";
  return "on " + set.map((d) => DAY_NAMES[d]).join(", ");
}

const label = (id: string, all: Entities) => (all[id] ? name(all[id]) : id);
const pick = (choices: Choice[], v: string) => choices.find((c) => c.value === v)?.label ?? v;

export function triggerText(t: Trigger, all: Entities): string {
  switch (t.kind) {
    case "time":
      return `At ${t.at}`;
    case "sun": {
      const when = t.event === "sunset" ? "sunset" : "sunrise";
      if (!t.offsetMin) return `At ${when}`;
      return `${Math.abs(t.offsetMin)} min ${t.offsetMin < 0 ? "before" : "after"} ${when}`;
    }
    case "device":
      return `${label(t.entity, all)} ${all[t.entity] ? pick(triggerStates(all[t.entity]), t.to) : `is ${t.to}`}`;
    case "number": {
      const unit = (all[t.entity]?.attributes.unit_of_measurement as string | undefined) ?? "";
      if (t.above !== null && t.below !== null) return `${label(t.entity, all)} is between ${t.above} and ${t.below}${unit}`;
      return t.above !== null ? `${label(t.entity, all)} goes above ${t.above}${unit}` : `${label(t.entity, all)} goes below ${t.below}${unit}`;
    }
    case "presence":
      return t.who === "everyone_left" ? "Everyone leaves home" : "Someone comes home";
  }
}

export function conditionText(c: Condition, all: Entities): string {
  switch (c.kind) {
    case "days":
      return `Only ${daysText(c.days)}`;
    case "between":
      return `Only between ${c.after} and ${c.before}`;
    case "device":
      return `Only if ${label(c.entity, all)} ${all[c.entity] ? pick(triggerStates(all[c.entity]), c.state).replace(/^turns /, "is ") : `is ${c.state}`}`;
  }
}

export function actionText(a: Action, all: Entities): string {
  switch (a.kind) {
    case "device":
      return `${all[a.entity] ? pick(actionServices(all[a.entity]), a.service) : a.service} ${label(a.entity, all)}`;
    case "notify":
      return a.service === BELL ? `Note in Home Assistant: “${a.message}”` : `Phone alert: “${a.message}”`;
    case "wait":
      return `Wait ${a.minutes} min`;
  }
}

/** "When the door opens → Turn on Hallway light" — a short line for the list. */
export function ruleSummary(r: Rule, all: Entities): string {
  const when = r.triggers.map((t) => triggerText(t, all)).join(" or ");
  const then = r.actions.map((a) => actionText(a, all)).join(", ");
  return `${when} → ${then}`;
}

/** What is still missing before the rule can be saved, or null. */
export function ruleProblem(r: Rule): string | null {
  if (!r.name.trim()) return "Give it a name.";
  if (!r.triggers.length) return "Add at least one “When”.";
  if (!r.actions.length) return "Add at least one “Then”.";
  for (const t of r.triggers) {
    if ((t.kind === "device" || t.kind === "number") && !t.entity) return "Choose a device for every “When”.";
    if (t.kind === "number" && t.above === null && t.below === null) return "Set a number for the sensor.";
  }
  for (const a of r.actions) {
    if (a.kind === "device" && (!a.entity || !a.service)) return "Choose a device for every “Then”.";
    if (a.kind === "notify" && !a.message.trim()) return "Write the alert text.";
  }
  for (const c of r.conditions) {
    if (c.kind === "days" && !c.days.length) return "Choose at least one day.";
    if (c.kind === "device" && !c.entity) return "Choose a device for “Only if”.";
  }
  return null;
}

// ---------- To and from Home Assistant ----------

const sec = (hhmm: string) => (hhmm.length === 5 ? `${hhmm}:00` : hhmm);
const hhmm = (v: unknown) => (typeof v === "string" && /^\d\d:\d\d(:\d\d)?$/.test(v) ? v.slice(0, 5) : null);

function offsetText(min: number): string {
  const sign = min < 0 ? "-" : "";
  const m = Math.abs(min);
  return `${sign}${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
}
function parseOffset(v: unknown): number | null {
  if (v === undefined) return 0;
  const m = typeof v === "string" ? v.match(/^(-?)(\d\d):(\d\d):00$/) : null;
  return m ? (m[1] ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null;
}

function triggerToHa(t: Trigger): Record<string, unknown> {
  switch (t.kind) {
    case "time":
      return { trigger: "time", at: sec(t.at) };
    case "sun":
      return t.offsetMin ? { trigger: "sun", event: t.event, offset: offsetText(t.offsetMin) } : { trigger: "sun", event: t.event };
    case "device":
      return { trigger: "state", entity_id: t.entity, to: t.to };
    case "number":
      return { trigger: "numeric_state", entity_id: t.entity, ...(t.above !== null && { above: t.above }), ...(t.below !== null && { below: t.below }) };
    case "presence":
      // zone.home counts the people at home.
      return t.who === "everyone_left"
        ? { trigger: "numeric_state", entity_id: "zone.home", below: 1 }
        : { trigger: "numeric_state", entity_id: "zone.home", above: 0 };
  }
}

function conditionToHa(c: Condition): Record<string, unknown> {
  switch (c.kind) {
    case "days":
      return { condition: "time", weekday: DAYS.filter((d) => c.days.includes(d)) };
    case "between":
      return { condition: "time", after: sec(c.after), before: sec(c.before) };
    case "device":
      return { condition: "state", entity_id: c.entity, state: c.state };
  }
}

function actionToHa(a: Action): Record<string, unknown> {
  switch (a.kind) {
    case "device":
      return { action: `${domainOf(a.entity)}.${a.service}`, target: { entity_id: a.entity } };
    case "notify":
      return a.service === BELL
        ? { action: BELL, data: { title: "HomeSystem", message: a.message } }
        : { action: a.service, data: { title: "HomeSystem", message: a.message } };
    case "wait":
      return { delay: { minutes: a.minutes } };
  }
}

export function toHa(r: Rule, id = r.id ?? newId()): HaAutomation {
  return {
    id,
    alias: r.name.trim(),
    description: MADE_HERE,
    // A new start restarts the run: "motion → light on, wait 2 min, light off" keeps the light on while people move.
    mode: "restart",
    triggers: r.triggers.map(triggerToHa),
    conditions: r.conditions.map(conditionToHa),
    actions: r.actions.map(actionToHa),
  };
}

const one = (v: unknown) => (Array.isArray(v) && v.length === 1 ? v[0] : v);
const str = (v: unknown) => (typeof one(v) === "string" ? (one(v) as string) : null);
const num = (v: unknown) => (typeof v === "number" ? v : v === undefined ? null : NaN);
const keys = (o: Record<string, unknown>, ...allowed: string[]) => Object.keys(o).every((k) => allowed.includes(k));

function triggerFromHa(t: Record<string, unknown>): Trigger | null {
  const kind = t.trigger ?? t.platform;
  if (kind === "time" && keys(t, "trigger", "platform", "at")) {
    const at = hhmm(t.at);
    return at ? { kind: "time", at } : null;
  }
  if (kind === "sun" && keys(t, "trigger", "platform", "event", "offset") && (t.event === "sunset" || t.event === "sunrise")) {
    const offsetMin = parseOffset(t.offset);
    return offsetMin === null ? null : { kind: "sun", event: t.event, offsetMin };
  }
  if (kind === "state" && keys(t, "trigger", "platform", "entity_id", "to")) {
    const entity = str(t.entity_id);
    const to = str(t.to);
    return entity && to ? { kind: "device", entity, to } : null;
  }
  if (kind === "numeric_state" && keys(t, "trigger", "platform", "entity_id", "above", "below")) {
    const entity = str(t.entity_id);
    const above = num(t.above);
    const below = num(t.below);
    if (!entity || Number.isNaN(above) || Number.isNaN(below)) return null;
    if (entity === "zone.home") {
      if (below === 1 && above === null) return { kind: "presence", who: "everyone_left" };
      if (above === 0 && below === null) return { kind: "presence", who: "someone_home" };
    }
    return { kind: "number", entity, above, below };
  }
  return null;
}

function conditionFromHa(c: Record<string, unknown>): Condition | null {
  if (c.condition === "time" && keys(c, "condition", "weekday") && c.weekday) {
    const days = (Array.isArray(c.weekday) ? c.weekday : [c.weekday]) as string[];
    return days.every((d) => (DAYS as readonly string[]).includes(d)) ? { kind: "days", days: days as Day[] } : null;
  }
  if (c.condition === "time" && keys(c, "condition", "after", "before")) {
    const after = hhmm(c.after);
    const before = hhmm(c.before);
    return after && before ? { kind: "between", after, before } : null;
  }
  if (c.condition === "state" && keys(c, "condition", "entity_id", "state")) {
    const entity = str(c.entity_id);
    const state = str(c.state);
    return entity && state ? { kind: "device", entity, state } : null;
  }
  return null;
}

function actionFromHa(a: Record<string, unknown>): Action | null {
  if ("delay" in a && keys(a, "delay")) {
    const d = a.delay as Record<string, unknown>;
    return d && typeof d === "object" && keys(d, "minutes") && typeof d.minutes === "number" ? { kind: "wait", minutes: d.minutes } : null;
  }
  const service = str(a.action ?? a.service);
  if (!service || !keys(a, "action", "service", "target", "data")) return null;
  const data = (a.data ?? {}) as Record<string, unknown>;
  if (service === BELL || service.startsWith("notify.")) {
    return typeof data.message === "string" && !a.target ? { kind: "notify", service, message: data.message } : null;
  }
  const target = a.target as Record<string, unknown> | undefined;
  const entity = str(target?.entity_id ?? data.entity_id);
  if (!entity || Object.keys(data).some((k) => k !== "entity_id")) return null;
  const [domain, svc] = service.split(".");
  return domain === domainOf(entity) ? { kind: "device", entity, service: svc } : null;
}

/** HA config → the app's form, or null when it uses things the app's editor can't show. */
export function fromHa(c: HaAutomation): Rule | null {
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : v ? [v as Record<string, unknown>] : []);
  const triggers = list(c.triggers ?? c.trigger).map(triggerFromHa);
  const conditions = list(c.conditions ?? c.condition).map(conditionFromHa);
  const actions = list(c.actions ?? c.action).map(actionFromHa);
  if ([...triggers, ...conditions, ...actions].some((x) => x === null)) return null;
  return {
    id: c.id,
    name: c.alias ?? "",
    triggers: triggers as Trigger[],
    conditions: conditions as Condition[],
    actions: actions as Action[],
  };
}
