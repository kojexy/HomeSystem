import {
  callService,
  createConnection,
  createLongLivedTokenAuth,
  ERR_INVALID_AUTH,
  subscribeEntities,
  type Connection,
} from "home-assistant-js-websocket";
import type { ConnectionStatus, Entities, Entity, HomeBackend, Rooms, Settings } from "./types";

interface AreaEntry {
  area_id: string;
  name: string;
}
interface DeviceEntry {
  id: string;
  area_id: string | null;
}
/** list_for_display uses short keys: ei = entity id, ai = area id, di = device id. */
interface DisplayEntity {
  ei: string;
  ai?: string;
  di?: string;
}

/** Reads areas from HA's registries. Rooms are a nice-to-have, so failures return no rooms. */
export async function fetchRooms(conn: Connection): Promise<Rooms> {
  try {
    const [areas, devices, display] = await Promise.all([
      conn.sendMessagePromise<AreaEntry[]>({ type: "config/area_registry/list" }),
      conn.sendMessagePromise<DeviceEntry[]>({ type: "config/device_registry/list" }).catch(() => []),
      conn.sendMessagePromise<{ entities: DisplayEntity[] }>({ type: "config/entity_registry/list_for_display" }),
    ]);
    const deviceArea = new Map(devices.map((d) => [d.id, d.area_id]));
    const entityArea: Record<string, string> = {};
    for (const e of display.entities) {
      const area = e.ai ?? (e.di ? deviceArea.get(e.di) : null);
      if (area) entityArea[e.ei] = area;
    }
    return { areas: areas.map((a) => ({ id: a.area_id, name: a.name })), entityArea };
  } catch {
    return { areas: [], entityArea: {} };
  }
}

/** Talks to a real Home Assistant over its WebSocket API. */
export function createHassBackend(settings: Settings): HomeBackend {
  const base = settings.hassUrl.replace(/\/+$/, "");
  let conn: Connection | null = null;
  let closed = false;

  return {
    subscribe(onEntities, onStatus, onRooms) {
      let unsub: (() => void) | null = null;
      const setStatus = (s: ConnectionStatus) => !closed && onStatus(s);
      const loadRooms = (c: Connection) => fetchRooms(c).then((r) => !closed && onRooms(r));

      setStatus("connecting");
      createConnection({ auth: createLongLivedTokenAuth(base, settings.token) })
        .then((c) => {
          if (closed) return c.close();
          conn = c;
          setStatus("online");
          // The library reconnects by itself; these events keep the badge honest.
          c.addEventListener("disconnected", () => setStatus("offline"));
          c.addEventListener("ready", () => {
            setStatus("online");
            loadRooms(c);
          });
          c.addEventListener("reconnect-error", () => setStatus("auth-failed"));
          unsub = subscribeEntities(c, (e) => onEntities(e as unknown as Entities));
          loadRooms(c);
        })
        .catch((err) => setStatus(err === ERR_INVALID_AUTH ? "auth-failed" : "offline"));

      return () => unsub?.();
    },

    async callService(domain, service, data) {
      if (!conn) throw new Error("Not connected to Home Assistant");
      await callService(conn, domain, service, data);
    },

    snapshotUrl(camera: Entity) {
      // entity_picture already carries a short-lived access token from HA.
      const pic = camera.attributes.entity_picture;
      return pic ? `${base}${pic}&t=${Date.now()}` : null;
    },

    close() {
      closed = true;
      conn?.close();
    },
  };
}
