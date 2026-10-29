import type { HaAutomation, Rule } from "./lib/rules";
import type { CamEvent, Entities, Entity, LiveStream, Rooms, ServiceCall, Settings } from "./ha/types";

/** What every screen gets: the live home and a way to act on it. */
export interface HomeCtx {
  entities: Entities;
  rooms: Rooms;
  settings: Settings;
  run: (...calls: ServiceCall[]) => Promise<void>;
  snapshotUrl: (camera: Entity) => string | null;
  events: (limit: number) => Promise<CamEvent[] | null>;
  liveStream: (camera: Entity) => Promise<LiveStream | null>;
  notify: (message: string) => void;
  automations: AutomationStore;
}

/** Automations made or changed in the app (stored in Home Assistant's automations.yaml). */
export interface AutomationStore {
  /** null: not stored where the app can edit it. rule null: made in HA with things the app's editor can't show. */
  load: (id: string) => Promise<{ config: HaAutomation; rule: Rule | null } | null>;
  save: (rule: Rule) => Promise<void>;
  remove: (id: string) => Promise<void>;
  notifyServices: () => Promise<string[]>;
}
