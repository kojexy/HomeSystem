import { useState } from "react";
import type { Settings } from "../ha/types";

interface Props {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings);
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [k]: e.target.value.trim() });

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
      >
        <h2>Connection</h2>

        <div className="segmented" role="radiogroup" aria-label="Mode">
          {(["demo", "live"] as const).map((m) => (
            <button
              type="button"
              key={m}
              role="radio"
              aria-checked={draft.mode === m}
              className={draft.mode === m ? "active" : ""}
              onClick={() => setDraft({ ...draft, mode: m })}
            >
              {m === "demo" ? "Demo home" : "My Home Assistant"}
            </button>
          ))}
        </div>

        {draft.mode === "live" && (
          <>
            <label>
              Home Assistant address
              <input className="field" placeholder="http://192.168.1.20:8123" value={draft.hassUrl} onChange={set("hassUrl")} />
            </label>
            <label>
              Long-lived access token
              <input className="field" type="password" autoComplete="off" value={draft.token} onChange={set("token")} />
              <small>HA → your profile → Security → Long-lived access tokens.</small>
            </label>
            <label>
              go2rtc / Frigate address (optional, faster live video)
              <input className="field" placeholder="http://192.168.1.20:1984" value={draft.go2rtcUrl} onChange={set("go2rtcUrl")} />
              <small>Leave empty to get live video from Home Assistant (a few seconds behind). With Frigate: its address, port 1984.</small>
            </label>
          </>
        )}

        <div className="row end">
          <button type="button" className="pill ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="pill primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
