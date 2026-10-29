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
  /** Optional go2rtc address for low-latency live video, e.g. http://192.168.1.20:1984 */
  go2rtcUrl: string;
  /** Stream name in go2rtc.yaml, e.g. front_door */
  go2rtcStream: string;
}

/** Everything the UI needs from a home. The real HA backend and the demo both implement it. */
export interface HomeBackend {
  subscribe(onEntities: (e: Entities) => void, onStatus: (s: ConnectionStatus) => void): () => void;
  callService(domain: string, service: string, data: Record<string, unknown>): Promise<void>;
  /** A URL for the current still frame of a camera, or null. */
  snapshotUrl(camera: Entity): string | null;
  close(): void;
}
