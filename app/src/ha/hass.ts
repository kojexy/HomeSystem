import {
  callService,
  createConnection,
  createLongLivedTokenAuth,
  ERR_INVALID_AUTH,
  subscribeEntities,
  type Connection,
} from "home-assistant-js-websocket";
import type { ConnectionStatus, Entities, Entity, HomeBackend, Settings } from "./types";

/** Talks to a real Home Assistant over its WebSocket API. */
export function createHassBackend(settings: Settings): HomeBackend {
  const base = settings.hassUrl.replace(/\/+$/, "");
  let conn: Connection | null = null;
  let closed = false;

  return {
    subscribe(onEntities, onStatus) {
      let unsub: (() => void) | null = null;
      const setStatus = (s: ConnectionStatus) => !closed && onStatus(s);

      setStatus("connecting");
      createConnection({ auth: createLongLivedTokenAuth(base, settings.token) })
        .then((c) => {
          if (closed) return c.close();
          conn = c;
          setStatus("online");
          // The library reconnects by itself; these events keep the badge honest.
          c.addEventListener("disconnected", () => setStatus("offline"));
          c.addEventListener("ready", () => setStatus("online"));
          c.addEventListener("reconnect-error", () => setStatus("auth-failed"));
          unsub = subscribeEntities(c, (e) => onEntities(e as unknown as Entities));
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
