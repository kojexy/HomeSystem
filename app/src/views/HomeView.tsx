import { AlarmPanel } from "../components/AlarmPanel";
import { CameraCard } from "../components/CameraCard";
import { EntityTile } from "../components/EntityTile";
import { Icon, type IconName } from "../components/Icon";
import { stateText } from "../lib/domains";
import { alarmLabel, alarmOf, devices, insights, isOnNow, name, ofDomain, planMode, summarize, topConsumers, type Mode } from "../lib/home";
import type { HomeCtx } from "../ui";

const MODES: { mode: Mode; label: string; icon: IconName }[] = [
  { mode: "leave", label: "Leave home", icon: "leave" },
  { mode: "night", label: "Good night", icon: "moon" },
  { mode: "home", label: "I'm home", icon: "home" },
];

export function HomeView({ ctx }: { ctx: HomeCtx }) {
  const { entities } = ctx;
  const s = summarize(entities);
  const alarm = alarmOf(entities);
  const tips = insights(entities);
  const onNow = devices(entities).filter(isOnNow);
  const power = topConsumers(entities);
  const scenes = ofDomain(entities, "scene", "script");

  const runMode = async (mode: Mode) => {
    const plan = planMode(mode, entities);
    await ctx.run(...plan.calls);
    if (plan.alarmNeedsCode) ctx.notify("Done. Enter your code on the alarm card to change the alarm.");
  };

  return (
    <>
      <div className="chips" aria-label="At a glance">
        <Chip icon="shield" text={alarm ? alarmLabel(alarm.state) : "No alarm"} tone={alarm?.state === "triggered" ? "bad" : alarm?.state.startsWith("armed") ? "accent" : "ok"} />
        <Chip icon="bulb" text={s.lightsOn ? `${s.lightsOn} on` : "Lights off"} tone={s.lightsOn ? "warm" : undefined} />
        <Chip icon="door" text={s.openings.length ? `${s.openings.length} open` : "All closed"} tone={s.openings.length ? "warm" : "ok"} />
        {s.insideTemp !== null && <Chip icon="thermometer" text={`${s.insideTemp}°`} />}
        {s.powerW > 0 && <Chip icon="bolt" text={s.powerW >= 1000 ? `${(s.powerW / 1000).toFixed(1)} kW` : `${s.powerW} W`} />}
      </div>

      <div className="modes">
        {MODES.map((m) => (
          <button key={m.mode} className="mode" onClick={() => runMode(m.mode)}>
            <Icon name={m.icon} size={22} />
            <span>{m.label}</span>
          </button>
        ))}
        {scenes.map((sc) => (
          <button key={sc.entity_id} className="mode" onClick={() => ctx.run({ domain: sc.entity_id.split(".")[0], service: "turn_on", data: { entity_id: sc.entity_id } })}>
            <Icon name={sc.entity_id.startsWith("scene") ? "sparkle" : "play"} size={22} />
            <span>{name(sc)}</span>
          </button>
        ))}
      </div>

      {tips.length > 0 && (
        <section className="card insights">
          <h2>Needs attention</h2>
          <ul>
            {tips.map((t) => (
              <li key={t.id} className={t.level}>
                <Icon name={t.level === "info" ? "sparkle" : "alert"} size={18} />
                <span>{t.title}</span>
                {t.fix && (
                  <button className="pill small" onClick={() => ctx.run(...t.fix!.calls)}>
                    {t.fix.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="home-grid">
        <CameraCard camera={ofDomain(entities, "camera")[0] ?? null} ctx={ctx} />
        <AlarmPanel alarm={alarm} ctx={ctx} />

        <section className="card">
          <h2>On now</h2>
          {onNow.length ? (
            <div className="tiles">
              {onNow.map((e) => (
                <EntityTile key={e.entity_id} e={e} ctx={ctx} />
              ))}
            </div>
          ) : (
            <p className="muted">Everything is off. Quiet house.</p>
          )}
        </section>

        {power.length > 0 && (
          <section className="card energy">
            <h2>Using power now</h2>
            <ul className="bars">
              {power.map((e) => {
                const w = Number(e.state);
                const max = Number(power[0].state) || 1;
                return (
                  <li key={e.entity_id}>
                    <span className="bar-label">{name(e).replace(/ power$/i, "")}</span>
                    <span className="bar"><span style={{ width: `${Math.max(4, (w / max) * 100)}%` }} /></span>
                    <span className="bar-value">{stateText(e)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function Chip({ icon, text, tone }: { icon: IconName; text: string; tone?: "ok" | "warm" | "accent" | "bad" }) {
  return (
    <span className={`chip ${tone ?? ""}`}>
      <Icon name={icon} size={16} />
      {text}
    </span>
  );
}
