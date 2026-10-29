import type { CamEvent, Entities, Entity, Rooms, ServiceCall, Settings } from "./ha/types";

/** What every screen gets: the live home and a way to act on it. */
export interface HomeCtx {
  entities: Entities;
  rooms: Rooms;
  settings: Settings;
  run: (...calls: ServiceCall[]) => Promise<void>;
  snapshotUrl: (camera: Entity) => string | null;
  events: (limit: number) => Promise<CamEvent[] | null>;
  notify: (message: string) => void;
}
