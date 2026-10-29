import type { Entity } from "../ha/types";
import { brightnessPct, name } from "../lib/home";

interface Props {
  light: Entity;
  call: (domain: string, service: string, data: Record<string, unknown>) => void;
}

export function LightTile({ light, call }: Props) {
  const domain = light.entity_id.split(".")[0];
  const on = light.state === "on";
  const dimmable = domain === "light";
  const pct = brightnessPct(light);
  const unavailable = light.state === "unavailable";

  return (
    <div className={`tile light ${on ? "on" : ""}`} aria-disabled={unavailable}>
      <button
        className="tile-main"
        disabled={unavailable}
        onClick={() => call(domain, "toggle", { entity_id: light.entity_id })}
        aria-pressed={on}
      >
        <span className="bulb" aria-hidden />
        <span className="tile-name">{name(light)}</span>
        <span className="tile-state">{unavailable ? "Unavailable" : on ? (dimmable ? `${pct}%` : "On") : "Off"}</span>
      </button>
      {dimmable && on && (
        <input
          type="range"
          min={1}
          max={100}
          defaultValue={pct}
          key={pct}
          aria-label={`${name(light)} brightness`}
          onPointerUp={(e) =>
            call("light", "turn_on", { entity_id: light.entity_id, brightness_pct: Number(e.currentTarget.value) })
          }
          onKeyUp={(e) =>
            call("light", "turn_on", { entity_id: light.entity_id, brightness_pct: Number(e.currentTarget.value) })
          }
        />
      )}
    </div>
  );
}
