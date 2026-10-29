import type { Entity } from "../ha/types";
import { climateTarget, domainOf, iconFor, isActive, needsConfirm, primaryAction, stateText, unavailable } from "../lib/domains";
import { name } from "../lib/home";
import type { HomeCtx } from "../ui";
import { Icon } from "./Icon";

/** One device. Tap = its main action; extra controls appear under it when useful. */
export function EntityTile({ e, ctx }: { e: Entity; ctx: HomeCtx }) {
  const d = domainOf(e.entity_id);
  const action = primaryAction(e);
  const active = isActive(e);
  const offline = unavailable(e);
  const label = name(e);
  const entity_id = e.entity_id;

  const tap = () => {
    if (!action) return;
    if (needsConfirm(action) && !window.confirm(`Unlock ${label}?`)) return;
    ctx.run(action);
  };

  const body = (
    <>
      <span className="tile-icon">
        <Icon name={iconFor(e)} />
      </span>
      <span className="tile-name">{label}</span>
      <span className="tile-state">{stateText(e)}</span>
    </>
  );

  return (
    <div className={`tile d-${d}${active ? " active" : ""}${offline ? " offline" : ""}`}>
      {action ? (
        <button className="tile-main" onClick={tap} aria-pressed={active} title={label}>
          {body}
        </button>
      ) : (
        <div className="tile-main">{body}</div>
      )}
      {!offline && <Extra e={e} ctx={ctx} d={d} entity_id={entity_id} />}
    </div>
  );
}

function Extra({ e, ctx, d, entity_id }: { e: Entity; ctx: HomeCtx; d: string; entity_id: string }) {
  const a = e.attributes;

  if (d === "light" && e.state === "on") {
    const pct = typeof a.brightness === "number" ? Math.round((a.brightness / 255) * 100) : 100;
    const set = (v: number) => ctx.run({ domain: "light", service: "turn_on", data: { entity_id, brightness_pct: v } });
    return (
      <input
        type="range"
        className="slider"
        min={1}
        max={100}
        defaultValue={pct}
        key={pct}
        aria-label="Brightness"
        onPointerUp={(ev) => set(Number(ev.currentTarget.value))}
        onKeyUp={(ev) => set(Number(ev.currentTarget.value))}
      />
    );
  }

  if (d === "cover") {
    const c = (service: string) => ctx.run({ domain: "cover", service, data: { entity_id } });
    return (
      <div className="mini-row">
        <button className="mini" onClick={() => c("open_cover")} aria-label="Open"><Icon name="up" size={16} /></button>
        <button className="mini" onClick={() => c("stop_cover")} aria-label="Stop"><Icon name="stop" size={14} /></button>
        <button className="mini" onClick={() => c("close_cover")} aria-label="Close"><Icon name="down" size={16} /></button>
      </div>
    );
  }

  const target = d === "climate" && e.state !== "off" ? climateTarget(e) : null;
  if (target) {
    const step = Number(a.target_temp_step ?? 0.5);
    const min = Number(a.min_temp ?? 7);
    const max = Number(a.max_temp ?? 30);
    const clamp = (t: number) => Math.min(max, Math.max(min, t));
    // Heat/cool mode has a low–high range: − and + move the whole range.
    const shift = (by: number) =>
      ctx.run({
        domain: "climate",
        service: "set_temperature",
        data:
          target.kind === "single"
            ? { entity_id, temperature: clamp(target.value + by) }
            : { entity_id, target_temp_low: clamp(target.low + by), target_temp_high: clamp(target.high + by) },
      });
    return (
      <div className="mini-row">
        <button className="mini" onClick={() => shift(-step)} aria-label="Cooler"><Icon name="minus" size={16} /></button>
        <span className="target">{target.kind === "single" ? target.value : `${target.low}–${target.high}`}°</span>
        <button className="mini" onClick={() => shift(step)} aria-label="Warmer"><Icon name="plus" size={16} /></button>
      </div>
    );
  }

  if (d === "media_player" && e.state !== "off") {
    const vol = typeof a.volume_level === "number" ? Math.round(a.volume_level * 100) : null;
    return (
      <div className="mini-row">
        {vol !== null && (
          <input
            type="range"
            className="slider"
            min={0}
            max={100}
            defaultValue={vol}
            key={vol}
            aria-label="Volume"
            onPointerUp={(ev) =>
              ctx.run({ domain: "media_player", service: "volume_set", data: { entity_id, volume_level: Number(ev.currentTarget.value) / 100 } })
            }
          />
        )}
        <button className="mini" onClick={() => ctx.run({ domain: "media_player", service: "turn_off", data: { entity_id } })} aria-label="Turn off">
          <Icon name="close" size={14} />
        </button>
      </div>
    );
  }

  return null;
}
