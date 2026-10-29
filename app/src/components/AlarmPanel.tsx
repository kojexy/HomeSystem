import { useState } from "react";
import type { Entity } from "../ha/types";
import { alarmLabel, name } from "../lib/home";
import type { HomeCtx } from "../ui";
import { Icon, type IconName } from "./Icon";

const ACTIONS: { service: string; label: string; icon: IconName; state: string }[] = [
  { service: "alarm_arm_away", label: "Away", icon: "leave", state: "armed_away" },
  { service: "alarm_arm_home", label: "Home", icon: "home", state: "armed_home" },
  { service: "alarm_disarm", label: "Off", icon: "unlock", state: "disarmed" },
];

export function AlarmPanel({ alarm, ctx }: { alarm: Entity | null; ctx: HomeCtx }) {
  const [code, setCode] = useState("");

  if (!alarm) {
    return (
      <section className="card alarm">
        <div className="alarm-head">
          <span className="shield"><Icon name="shield" size={26} /></span>
          <div>
            <h2>Security</h2>
            <p className="muted">No alarm yet. Install Alarmo in Home Assistant — see docs/SETUP.md.</p>
          </div>
        </div>
      </section>
    );
  }

  const needsCode = Boolean(alarm.attributes.code_format);
  const go = (service: string) => {
    ctx.run({ domain: "alarm_control_panel", service, data: { entity_id: alarm.entity_id, ...(needsCode ? { code } : {}) } });
    setCode("");
  };

  return (
    <section className={`card alarm state-${alarm.state}`}>
      <div className="alarm-head">
        <span className="shield"><Icon name="shield" size={26} /></span>
        <div>
          <h2>{name(alarm)}</h2>
          <div className="alarm-state" role="status">{alarmLabel(alarm.state)}</div>
        </div>
      </div>
      {needsCode && (
        <input
          className="field code"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Alarm code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      )}
      <div className="segmented three">
        {ACTIONS.map((a) => (
          <button
            key={a.service}
            className={alarm.state === a.state ? "active" : ""}
            onClick={() => go(a.service)}
            disabled={needsCode && !code}
          >
            <Icon name={a.icon} size={18} />
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
