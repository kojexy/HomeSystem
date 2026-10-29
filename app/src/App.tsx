import { useCallback, useMemo, useState } from "react";
import { AlarmPanel } from "./components/AlarmPanel";
import { CameraCard } from "./components/CameraCard";
import { LightTile } from "./components/LightTile";
import { SettingsPanel } from "./components/SettingsPanel";
import type { Entity, Settings } from "./ha/types";
import { useHome } from "./ha/useHome";
import { groupHome, name, sensorLabel } from "./lib/home";
import { liveStreamUrl, loadSettings, saveSettings } from "./lib/settings";

const STATUS_TEXT = {
  connecting: "Connecting…",
  online: "Online",
  offline: "Offline — retrying",
  "auth-failed": "Token rejected",
};

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { entities, status, backend } = useHome(settings);
  const home = useMemo(() => groupHome(entities), [entities]);

  const call = useCallback(
    (domain: string, service: string, data: Record<string, unknown>) => {
      setError(null);
      backend.callService(domain, service, data).catch((e: Error) => setError(e.message));
    },
    [backend]
  );
  const snapshotUrl = useCallback((c: Entity) => backend.snapshotUrl(c), [backend]);

  const lightsOn = home.lights.filter((l) => l.state === "on");

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Home</h1>
          <span className={`status ${status}`}>
            {settings.mode === "demo" ? "Demo home" : STATUS_TEXT[status]}
          </span>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
          ⚙
        </button>
      </header>

      {error && (
        <div className="toast" role="alert" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <main className="grid">
        <CameraCard camera={home.cameras[0] ?? null} snapshotUrl={snapshotUrl} liveUrl={liveStreamUrl(settings)} />

        <AlarmPanel alarm={home.alarm} call={call} />

        <section className="card">
          <div className="card-head">
            <h2>Lights</h2>
            {lightsOn.length > 0 && (
              <button
                className="pill small"
                onClick={() => lightsOn.forEach((l) => call(l.entity_id.split(".")[0], "turn_off", { entity_id: l.entity_id }))}
              >
                All off
              </button>
            )}
          </div>
          {home.lights.length ? (
            <div className="tiles">
              {home.lights.map((l) => (
                <LightTile key={l.entity_id} light={l} call={call} />
              ))}
            </div>
          ) : (
            <p className="muted">No lights found.</p>
          )}
        </section>

        {home.sensors.length > 0 && (
          <section className="card">
            <h2>Sensors</h2>
            <ul className="sensors">
              {home.sensors.map((s) => (
                <li key={s.entity_id} className={s.state === "on" ? "active" : ""}>
                  <span>{name(s)}</span>
                  <span>{sensorLabel(s)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(s) => {
            saveSettings(s);
            setSettings(s);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}
