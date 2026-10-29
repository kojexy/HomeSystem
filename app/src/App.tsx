import { useCallback, useEffect, useState } from "react";
import { Icon, type IconName } from "./components/Icon";
import { SettingsPanel } from "./components/SettingsPanel";
import type { Entity, Settings } from "./ha/types";
import { useHome } from "./ha/useHome";
import { greeting, insights } from "./lib/home";
import { loadSettings, saveSettings } from "./lib/settings";
import type { HomeCtx } from "./ui";
import { AutomationsView } from "./views/AutomationsView";
import { CamerasView } from "./views/CamerasView";
import { DevicesView } from "./views/DevicesView";
import { HomeView } from "./views/HomeView";
import { RoomsView } from "./views/RoomsView";

const TABS = [
  { id: "home", label: "Home", icon: "home", View: HomeView },
  { id: "rooms", label: "Rooms", icon: "rooms", View: RoomsView },
  { id: "cameras", label: "Cameras", icon: "camera", View: CamerasView },
  { id: "devices", label: "Devices", icon: "list", View: DevicesView },
  { id: "automations", label: "Automations", icon: "bolt", View: AutomationsView },
] as const satisfies readonly { id: string; label: string; icon: IconName; View: unknown }[];

type TabId = (typeof TABS)[number]["id"];
const TAB_KEY = "homesystem.tab";

const STATUS_TEXT = {
  connecting: "Connecting…",
  online: "Connected",
  offline: "Offline — retrying",
  "auth-failed": "Token rejected — check settings",
};

function loadTab(): TabId {
  try {
    const t = localStorage.getItem(TAB_KEY);
    return TABS.some((x) => x.id === t) ? (t as TabId) : "home";
  } catch {
    return "home";
  }
}

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<TabId>(loadTab);
  const [notice, setNotice] = useState<string | null>(null);
  const { entities, rooms, status, backend, run, error, setError } = useHome(settings);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      // Not important.
    }
    window.scrollTo(0, 0);
  }, [tab]);

  // Info notes fade by themselves; errors stay until dismissed.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const snapshotUrl = useCallback((c: Entity) => backend.snapshotUrl(c), [backend]);
  const ctx: HomeCtx = { entities, rooms, settings, run, snapshotUrl, notify: setNotice };
  const alerts = insights(entities).filter((i) => i.level !== "info").length;
  const View = TABS.find((t) => t.id === tab)!.View;
  const message = error ?? notice;

  return (
    <div className="app">
      <nav className="tabs" aria-label="Sections">
        <div className="brand" aria-hidden>
          <Icon name="home" size={22} />
        </div>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <span className="tab-icon">
              <Icon name={t.icon} size={22} />
              {t.id === "home" && alerts > 0 && <span className="badge">{alerts}</span>}
            </span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="content">
        <header className="top">
          <div>
            <p className="eyebrow">
              {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1>{tab === "home" ? greeting() : TABS.find((t) => t.id === tab)!.label}</h1>
            <span className={`status ${settings.mode === "demo" ? "demo" : status}`}>
              {settings.mode === "demo" ? "Demo home — open settings to connect yours" : STATUS_TEXT[status]}
            </span>
          </div>
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
            <Icon name="gear" size={22} />
          </button>
        </header>

        {message && (
          <div className={`toast ${error ? "bad" : ""}`} role={error ? "alert" : "status"}>
            <span>{message}</span>
            <button
              aria-label="Dismiss"
              onClick={() => {
                setError(null);
                setNotice(null);
              }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        <main>
          <View ctx={ctx} />
        </main>
      </div>

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
