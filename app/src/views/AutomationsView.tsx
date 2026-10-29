import { Icon } from "../components/Icon";
import type { Entity } from "../ha/types";
import { name, ofDomain } from "../lib/home";
import type { HomeCtx } from "../ui";

function ago(iso: unknown): string {
  if (typeof iso !== "string") return "Never ran";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Ran just now";
  if (min < 60) return `Ran ${min} min ago`;
  if (min < 1440) return `Ran ${Math.round(min / 60)} h ago`;
  return `Ran ${Math.round(min / 1440)} d ago`;
}

export function AutomationsView({ ctx }: { ctx: HomeCtx }) {
  const automations = ofDomain(ctx.entities, "automation");
  const actions = ofDomain(ctx.entities, "scene", "script");
  const run = (e: Entity, service: string) =>
    ctx.run({ domain: e.entity_id.split(".")[0], service, data: { entity_id: e.entity_id } });

  return (
    <>
      <section className="card">
        <h2>Automations</h2>
        {automations.length ? (
          <ul className="auto-list">
            {automations.map((a) => (
              <li key={a.entity_id} className={a.state === "on" ? "" : "paused"}>
                <span className="auto-icon"><Icon name="bolt" size={18} /></span>
                <span className="auto-text">
                  <span className="auto-name">{name(a)}</span>
                  <span className="muted small">{a.state === "on" ? ago(a.attributes.last_triggered) : "Paused"}</span>
                </span>
                <button className="mini" onClick={() => run(a, "trigger")} aria-label={`Run ${name(a)} now`} title="Run now">
                  <Icon name="play" size={14} />
                </button>
                <button
                  className={`switch ${a.state === "on" ? "on" : ""}`}
                  role="switch"
                  aria-checked={a.state === "on"}
                  aria-label={`${name(a)} enabled`}
                  onClick={() => run(a, "toggle")}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No automations yet. Ready-made ones are in server/packages/homesystem.yaml.</p>
        )}
      </section>

      {actions.length > 0 && (
        <section className="card">
          <h2>Scenes & scripts</h2>
          <div className="modes wrap">
            {actions.map((s) => (
              <button key={s.entity_id} className="mode" onClick={() => run(s, "turn_on")}>
                <Icon name={s.entity_id.startsWith("scene") ? "sparkle" : "play"} size={22} />
                <span>{name(s)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="muted small hint">
        Build new automations in Home Assistant (Settings → Automations). They run inside HA, so they work even when this app is closed.
      </p>
    </>
  );
}
