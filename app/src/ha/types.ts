// The small slice of Home Assistant's data model this app uses.

export interface Entity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    brightness?: number;
    entity_picture?: string;
    device_class?: string;
    code_format?: string | null;
  };
  last_changed: string;
}

export type Entities = Record<string, Entity>;

export type ConnectionStatus = "connecting" | "online" | "offline" | "auth-failed";

export interface Settings {
  mode: "demo" | "live";
  /** e.g. http://192.168.1.20:8123 */
  hassUrl: string;
  /** Long-lived access token from the HA profile page. */
  token: string;
  /**
   * Optional go2rtc address for low-latency live video, e.g. http://192.168.1.20:1984
   * Name each go2rtc stream like the camera: camera.front_door → stream "front_door".
   */
  go2rtcUrl: string;
}

export interface Area {
  id: string;
  name: string;
}

/** Rooms come from HA "areas". An entity sits in its own area, or in its device's area. */
export interface Rooms {
  areas: Area[];
  entityArea: Record<string, string>;
}

/** A single service call, e.g. light.turn_off for one entity. */
export interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

/** Something a camera's AI (Frigate) noticed: a person, a car, an animal. */
export interface CamEvent {
  id: string;
  /** Frigate camera name, the same as the HA camera's object id (camera.yard → yard). */
  camera: string;
  /** person, car, dog, cat… */
  label: string;
  /** A recognised face or plate, if any. */
  subLabel: string | null;
  /** Unix seconds. */
  start: number;
  end: number | null;
  /** Detection confidence 0–1. */
  score: number | null;
  /** Generative-AI summary of what happened, if AI is set up. */
  description: string | null;
  thumbUrl: string;
  snapshotUrl: string | null;
  clipUrl: string | null;
}

/** Everything the UI needs from a home. The real HA backend and the demo both implement it. */
export interface HomeBackend {
  subscribe(
    onEntities: (e: Entities) => void,
    onStatus: (s: ConnectionStatus) => void,
    onRooms: (r: Rooms) => void
  ): () => void;
  callService(domain: string, service: string, data: Record<string, unknown>): Promise<void>;
  /** A URL for the current still frame of a camera, or null. */
  snapshotUrl(camera: Entity): string | null;
  /** Latest camera AI events, newest first, or null when there is no Frigate. */
  events(limit: number): Promise<CamEvent[] | null>;
  close(): void;
}
