import { useState } from "react";
import { AutomationEditor } from "../components/AutomationEditor";
import { Icon, type IconName } from "../components/Icon";
import type { Entities, Entity } from "../ha/types";
import { domainOf } from "../lib/domains";
import { name, ofDomain } from "../lib/home";
import { BELL, type Rule } from "../lib/rules";
import type { HomeCtx } from "../ui";

function ago(iso: unknown): string {
  if (typeof iso !== "string") return "Never ran";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Ran just now";
  if (min < 60) return `Ran ${min} min ago`;
  if (min < 1440) return `Ran ${Math.round(min / 60)} h ago`;
  return `Ran ${Math.round(min / 1440)} d ago`;
}

/** Ready-made starting points, filled in with this home's own devices. */
function ideas(all: Entities): { icon: IconName; rule: Rule }[] {
  const list = Object.values(all);
  const motion = list.find((e) => domainOf(e.entity_id) === "binary_sensor" && e.attributes.device_class === "motion");
  const door = list.find((e) => domainOf(e.entity_id) === "binary_sensor" && ["door", "window", "opening"].includes(e.attributes.device_class ?? ""));
  const light = ofDomain(all, "light")[0];
  const plug = ofDomain(all, "switch").find((e) => e.state !== "unavailable") ?? light;
  const alarm = ofDomain(all, "alarm_control_panel")[0];
  const out: { icon: IconName; rule: Rule }[] = [];
  if (motion && light)
    out.push({
      icon: "motion",
      rule: {
        name: `${name(light)} on motion`,
        triggers: [{ kind: "device", entity: motion.entity_id, to: "on" }],
        conditions: [{ kind: "between", after: "18:00", before: "07:00" }],
        actions: [
          { kind: "device", entity: light.entity_id, service: "turn_on" },
          { kind: "wait", minutes: 2 },
          { kind: "device", entity: light.entity_id, service: "turn_off" },
        ],
      },
    });
  if (plug)
    out.push({
      icon: "sun",
      rule: {
        name: `${name(plug)} at sunset`,
        triggers: [{ kind: "sun", event: "sunset", offsetMin: 0 }],
        conditions: [],
        actions: [{ kind: "device", entity: plug.entity_id, service: "turn_on" }],
      },
    });
  if (door)
    out.push({
      icon: "door",
      rule: {
        name: `${name(door)} opened while away`,
        triggers: [{ kind: "device", entity: door.entity_id, to: "on" }],
        conditions: alarm ? [{ kind: "device", entity: alarm.entity_id, state: "armed_away" }] : [],
        actions: [{ kind: "notify", service: BELL, message: `${name(door)} opened` }],
      },
    });
  if (light)
    out.push({
      icon: "moon",
      rule: {
        name: "Lights off at night",
        triggers: [{ kind: "time", at: "23:30" }],
        conditions: [],
        actions: ofDomain(all, "light").slice(0, 3).map((l) => ({ kind: "device" as const, entity: l.entity_id, service: "turn_off" })),
      },
    });
  return out;
}

export function AutomationsView({ ctx }: { ctx: HomeCtx }) {
  const automations = ofDomain(ctx.entities, "automation");
  const actions = ofDomain(ctx.entities, "scene", "script");
  const [editing, setEditing] = useState<{ rule: Rule | null } | null>(null);
  const run = (e: Entity, service: string) =>
    ctx.run({ domain: e.entity_id.split(".")[0], service, data: { entity_id: e.entity_id } });

  const edit = async (a: Entity) => {
    const id = a.attributes.id as string | undefined;
    try {
      const found = id ? await ctx.automations.load(id) : null;
      if (!found) ctx.notify("This one is written in a file on the server (server/packages). Change it there.");
      else if (!found.rule) ctx.notify("This one uses Home Assistant options the app can't show. Change it in HA → Settings → Automations.");
      else setEditing({ rule: found.rule });
    } catch (e) {
      ctx.notify((e as Error).message);
    }
  };

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>Automations</h2>
          <button className="pill primary small" onClick={() => setEditing({ rule: null })}>
            <Icon name="plus" size={16} /> New
          </button>
        </div>
        {automations.length ? (
          <ul className="auto-list">
            {automations.map((a) => (
              <li key={a.entity_id} className={a.state === "on" ? "" : "paused"}>
                <span className="auto-icon"><Icon name="bolt" size={18} /></span>
                <span className="auto-text">
                  <span className="auto-name">{name(a)}</span>
                  <span className="muted small">{a.state === "on" ? ago(a.attributes.last_triggered) : "Paused"}</span>
                </span>
                {typeof a.attributes.id === "string" && (
                  <button className="mini" onClick={() => edit(a)} aria-label={`Edit ${name(a)}`} title="Edit">
                    <Icon name="pencil" size={14} />
                  </button>
                )}
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
          <p className="muted">No automations yet. Press New, or start from an idea below.</p>
        )}
      </section>

      {ideas(ctx.entities).length > 0 && (
        <section className="card">
          <h2>Ideas</h2>
          <div className="modes wrap">
            {ideas(ctx.entities).map((i) => (
              <button key={i.rule.name} className="mode idea" onClick={() => setEditing({ rule: { ...i.rule } })}>
                <Icon name={i.icon} size={22} />
                <span>{i.rule.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

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
        Automations run inside Home Assistant, so they work even when this app is closed. Saving needs an admin account.
      </p>

      {editing && <AutomationEditor ctx={ctx} rule={editing.rule} onClose={() => setEditing(null)} />}
    </>
  );
}
