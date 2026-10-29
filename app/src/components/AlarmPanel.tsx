import { useState } from "react";
import type { Entity } from "../ha/types";
import { alarmLabel, name } from "../lib/home";

interface Props {
  alarm: Entity | null;
  call: (domain: string, service: string, data: Record<string, unknown>) => void;
}

const ACTIONS = [
  { service: "alarm_arm_away", label: "Away" },
  { service: "alarm_arm_home", label: "Home" },
  { service: "alarm_disarm", label: "Disarm" },
];

export function AlarmPanel({ alarm, call }: Props) {
  const [code, setCode] = useState("");

  if (!alarm) {
    return (
      <section className="card alarm">
        <h2>Security</h2>
        <p className="muted">No alarm panel yet. Install the Alarmo add-on in Home Assistant — see docs/SETUP.md.</p>
      </section>
    );
  }

  const needsCode = Boolean(alarm.attributes.code_format);
  const run = (service: string) => {
    call("alarm_control_panel", service, { entity_id: alarm.entity_id, ...(needsCode ? { code } : {}) });
    setCode("");
  };

  return (
    <section className={`card alarm state-${alarm.state}`}>
      <h2>{name(alarm)}</h2>
      <div className="alarm-state" role="status">
        {alarmLabel(alarm.state)}
      </div>
      {needsCode && (
        <input
          className="code"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      )}
      <div className="row">
        {ACTIONS.map((a) => (
          <button key={a.service} className="pill" onClick={() => run(a.service)} disabled={needsCode && !code}>
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
