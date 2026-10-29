import { useEffect, useMemo, useState } from "react";
import { createDemoBackend } from "./demo";
import { createHassBackend } from "./hass";
import type { ConnectionStatus, Entities, HomeBackend, Settings } from "./types";

/** Connects to the home described by settings and keeps entities live. */
export function useHome(settings: Settings) {
  const [entities, setEntities] = useState<Entities>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const backend: HomeBackend = useMemo(
    () => (settings.mode === "live" ? createHassBackend(settings) : createDemoBackend()),
    [settings]
  );

  useEffect(() => {
    setEntities({});
    const unsub = backend.subscribe(setEntities, setStatus);
    return () => {
      unsub();
      backend.close();
    };
  }, [backend]);

  return { entities, status, backend };
}
