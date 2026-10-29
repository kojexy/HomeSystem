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

  /** Runs service calls one after another; the first failure is shown to the user. */
  const run = useCallback(
    async (...calls: ServiceCall[]) => {
      setError(null);
      try {
        for (const c of calls) await backend.callService(c.domain, c.service, c.data);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [backend]
  );

  return { entities, rooms, status, backend, run, error, setError };
}
