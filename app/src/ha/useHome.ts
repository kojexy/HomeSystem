import { useCallback, useEffect, useMemo, useState } from "react";
import { createDemoBackend } from "./demo";
import { createHassBackend } from "./hass";
import type { ConnectionStatus, Entities, HomeBackend, Rooms, ServiceCall, Settings } from "./types";

const NO_ROOMS: Rooms = { areas: [], entityArea: {} };

/** Connects to the home described by settings and keeps entities and rooms live. */
export function useHome(settings: Settings) {
  const [entities, setEntities] = useState<Entities>({});
  const [rooms, setRooms] = useState<Rooms>(NO_ROOMS);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  const backend: HomeBackend = useMemo(
    () => (settings.mode === "live" ? createHassBackend(settings) : createDemoBackend()),
    [settings]
  );

  useEffect(() => {
    setEntities({});
    setRooms(NO_ROOMS);
    const unsub = backend.subscribe(setEntities, setStatus, setRooms);
    return () => {
      unsub();
      backend.close();
    };
  }, [backend]);

  /**
   * Runs service calls one after another. One failure (a jammed lock, say) does not stop
   * the rest, so "Leave home" still turns off the lights; the first error is shown.
   */
  const run = useCallback(
    async (...calls: ServiceCall[]) => {
      setError(null);
      let first: string | null = null;
      for (const c of calls) {
        try {
          await backend.callService(c.domain, c.service, c.data);
        } catch (e) {
          first ??= (e as Error).message;
        }
      }
      if (first) setError(first);
    },
    [backend]
  );

  return { entities, rooms, status, backend, run, error, setError };
}
