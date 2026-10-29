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
}
