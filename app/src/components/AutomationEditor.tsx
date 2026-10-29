import { useEffect, useState } from "react";
import type { Entities, Entity } from "../ha/types";
import { DOMAIN_LABELS, domainOf } from "../lib/domains";
import { name } from "../lib/home";
import {
  actionDevices,
  actionServices,
  BELL,
  DAYS,
  emptyRule,
  numberSensors,
  ruleProblem,
  triggerDevices,
  triggerStates,
  type Action,
  type Condition,
  type Day,
  type Rule,
  type Trigger,
} from "../lib/rules";
import type { HomeCtx } from "../ui";
import { Icon, type IconName } from "./Icon";

interface Props {
  ctx: HomeCtx;
  /** The rule to edit, or null for a new one. */
  rule: Rule | null;
  onClose: () => void;
}

/** "When … only if … then …" — makes or changes one automation in Home Assistant. */
export function AutomationEditor({ ctx, rule, onClose }: Props) {
  const all = ctx.entities;
  const [draft, setDraft] = useState<Rule>(rule ?? emptyRule());
  const [phones, setPhones] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    ctx.automations.notifyServices().then(setPhones, () => setPhones([]));
  }, [ctx.automations]);

  const problem = ruleProblem(draft);
  const set = <K extends "triggers" | "conditions" | "actions">(key: K, list: Rule[K]) => setDraft({ ...draft, [key]: list });
  const replace = <T,>(list: T[], i: number, v: T) => list.map((x, j) => (j === i ? v : x));
  const remove = <T,>(list: T[], i: number) => list.filter((_, j) => j !== i);

  const save = async () => {
    setBusy(true);
    setFailed(null);
    try {
      await ctx.automations.save(draft);
      ctx.notify(rule ? `Saved “${draft.name.trim()}”.` : `“${draft.name.trim()}” is on. It runs inside Home Assistant, even when the app is closed.`);
      onClose();
    } catch (e) {
      setFailed((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!rule?.id) return;
    setBusy(true);
    try {
      await ctx.automations.remove(rule.id);
      ctx.notify(`Deleted “${rule.name}”.`);
      onClose();
    } catch (e) {
      setFailed((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet editor" role="dialog" aria-label={rule ? "Edit automation" : "New automation"} onClick={(e) => e.stopPropagation()}>
        <header className="editor-head">
          <button className="icon-btn small" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
          <h2>{rule ? "Edit automation" : "New automation"}</h2>
          <button className="pill primary" disabled={!!problem || busy} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </button>
        </header>

        <div className="editor-body">
          <input className="field name-field" placeholder="Name, e.g. Evening lights" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Name" />

          <Block icon="bolt" tone="when" title="When" note={draft.triggers.length > 1 ? "Any of these starts it" : undefined}>
            {draft.triggers.map((t, i) => (
              <Row key={i} onRemove={() => set("triggers", remove(draft.triggers, i))}>
                <TriggerFields t={t} all={all} onChange={(v) => set("triggers", replace(draft.triggers, i, v))} />
              </Row>
            ))}
            <AddMenu<Trigger>
              label="Add a “When”"
              options={[
                { icon: "clock", label: "Time", make: () => ({ kind: "time", at: "07:00" }) },
                { icon: "sun", label: "Sunset / sunrise", make: () => ({ kind: "sun", event: "sunset", offsetMin: 0 }) },
                { icon: "sensor", label: "Device", make: () => firstDevice(triggerDevices(all)) },
                { icon: "thermometer", label: "Sensor value", make: () => ({ kind: "number", entity: numberSensors(all)[0]?.entity_id ?? "", above: null, below: null }) },
                { icon: "leave", label: "Leave / come home", make: () => ({ kind: "presence", who: "everyone_left" }) },
              ]}
              onPick={(t) => set("triggers", [...draft.triggers, t])}
            />
          </Block>

          <Block icon="filter" tone="if" title="Only if" note="Optional">
            {draft.conditions.map((c, i) => (
              <Row key={i} onRemove={() => set("conditions", remove(draft.conditions, i))}>
                <ConditionFields c={c} all={all} onChange={(v) => set("conditions", replace(draft.conditions, i, v))} />
              </Row>
            ))}
            <AddMenu<Condition>
              label="Add a condition"
              options={[
                { icon: "calendar", label: "Days", make: () => ({ kind: "days", days: ["mon", "tue", "wed", "thu", "fri"] }) },
                { icon: "clock", label: "Time window", make: () => ({ kind: "between", after: "18:00", before: "23:00" }) },
                {
                  icon: "sensor",
                  label: "Device state",
                  make: () => {
                    const d = firstDevice(triggerDevices(all));
                    return { kind: "device", entity: d.entity, state: d.to };
                  },
                },
              ]}
              onPick={(c) => set("conditions", [...draft.conditions, c])}
            />
          </Block>

          <Block icon="play" tone="then" title="Then" note={draft.actions.length > 1 ? "In this order" : undefined}>
            {draft.actions.map((a, i) => (
              <Row key={i} onRemove={() => set("actions", remove(draft.actions, i))}>
                <ActionFields a={a} all={all} phones={phones} onChange={(v) => set("actions", replace(draft.actions, i, v))} />
              </Row>
            ))}
            <AddMenu<Action>
              label="Add a “Then”"
              options={[
                { icon: "bulb", label: "Device or scene", make: () => firstAction(all) },
                { icon: "bell", label: "Alert", make: () => ({ kind: "notify", service: phones[0] ?? BELL, message: "" }) },
                { icon: "clock", label: "Wait", make: () => ({ kind: "wait", minutes: 2 }) },
              ]}
              onPick={(a) => set("actions", [...draft.actions, a])}
            />
          </Block>
        </div>

        <footer className="editor-foot">
          {failed ? <p className="bad-text" role="alert">{failed}</p> : <p className="muted small">{problem ?? "Ready to save."}</p>}
          {rule?.id &&
            (confirmDelete ? (
              <span className="row">
                <button className="pill small ghost" onClick={() => setConfirmDelete(false)}>Keep</button>
                <button className="pill small danger" onClick={del} disabled={busy}>Delete for good</button>
              </span>
            ) : (
              <button className="pill small ghost" onClick={() => setConfirmDelete(true)}>Delete</button>
            ))}
        </footer>
      </div>
    </div>
  );
}

// ---------- Building blocks ----------

function Block({ icon, tone, title, note, children }: { icon: IconName; tone: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className={`block ${tone}`}>
      <h3>
        <span className="block-icon"><Icon name={icon} size={16} /></span>
        {title}
        {note && <span className="muted small">{note}</span>}
      </h3>
      <div className="block-rows">{children}</div>
    </section>
  );
}

function Row({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="rule-row">
      <div className="rule-fields">{children}</div>
      <button className="mini" onClick={onRemove} aria-label="Remove">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

function AddMenu<T>({ label, options, onPick }: { label: string; options: { icon: IconName; label: string; make: () => T }[]; onPick: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="add-btn" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> {label}
      </button>
    );
  }
  return (
    <div className="add-menu">
      {options.map((o) => (
        <button
          key={o.label}
          className="chip"
          onClick={() => {
            onPick(o.make());
            setOpen(false);
          }}
        >
          <Icon name={o.icon} size={16} /> {o.label}
        </button>
      ))}
      <button className="chip ghost" onClick={() => setOpen(false)} aria-label="Cancel">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

/** A device picker, grouped by kind like the Devices tab. */
function EntitySelect({ value, list, onChange, label }: { value: string; list: Entity[]; onChange: (id: string) => void; label: string }) {
  const groups = new Map<string, Entity[]>();
  for (const e of list) groups.set(domainOf(e.entity_id), [...(groups.get(domainOf(e.entity_id)) ?? []), e]);
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {!value && <option value="">Choose…</option>}
      {value && !list.some((e) => e.entity_id === value) && <option value={value}>{value}</option>}
      {[...groups].map(([d, items]) => (
        <optgroup key={d} label={DOMAIN_LABELS[d] ?? (d === "person" ? "People" : d)}>
          {items.map((e) => (
            <option key={e.entity_id} value={e.entity_id}>{name(e)}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function Select({ value, choices, onChange, label }: { value: string; choices: { value: string; label: string }[]; onChange: (v: string) => void; label: string }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {!choices.some((c) => c.value === value) && <option value={value}>{value}</option>}
      {choices.map((c) => (
        <option key={c.value} value={c.value}>{c.label}</option>
      ))}
    </select>
  );
}

const firstDevice = (list: Entity[]): Extract<Trigger, { kind: "device" }> => {
  const e = list.find((x) => domainOf(x.entity_id) === "binary_sensor") ?? list[0];
  return { kind: "device", entity: e?.entity_id ?? "", to: e ? triggerStates(e)[0].value : "on" };
};

const firstAction = (all: Entities): Action => {
  const e = actionDevices(all).find((x) => domainOf(x.entity_id) === "light") ?? actionDevices(all)[0];
  return { kind: "device", entity: e?.entity_id ?? "", service: e ? actionServices(e)[0].value : "" };
};

const OFFSETS = [-60, -30, -15, 0, 15, 30, 60].map((m) => ({
  value: String(m),
  label: m === 0 ? "exactly at" : `${Math.abs(m)} min ${m < 0 ? "before" : "after"}`,
}));

function TriggerFields({ t, all, onChange }: { t: Trigger; all: Entities; onChange: (t: Trigger) => void }) {
  switch (t.kind) {
    case "time":
      return (
        <>
          <span className="lead">At</span>
          <input className="field" type="time" value={t.at} onChange={(e) => e.target.value && onChange({ ...t, at: e.target.value })} aria-label="Time" />
        </>
      );
    case "sun":
      return (
        <>
          <Select label="Offset" value={String(t.offsetMin)} choices={OFFSETS} onChange={(v) => onChange({ ...t, offsetMin: Number(v) })} />
          <Select label="Sun" value={t.event} choices={[{ value: "sunset", label: "sunset" }, { value: "sunrise", label: "sunrise" }]} onChange={(v) => onChange({ ...t, event: v as "sunset" | "sunrise" })} />
        </>
      );
    case "device": {
      const e = all[t.entity];
      return (
        <>
          <EntitySelect label="Device" value={t.entity} list={triggerDevices(all)} onChange={(id) => onChange({ ...t, entity: id, to: all[id] ? triggerStates(all[id])[0].value : t.to })} />
          {e && <Select label="Change" value={t.to} choices={triggerStates(e)} onChange={(v) => onChange({ ...t, to: v })} />}
        </>
      );
    }
    case "number": {
      const unit = (all[t.entity]?.attributes.unit_of_measurement as string | undefined) ?? "";
      const dir = t.below !== null && t.above === null ? "below" : "above";
      const value = (dir === "above" ? t.above : t.below) ?? "";
      const setValue = (d: string, v: number | null) => onChange({ ...t, above: d === "above" ? v : null, below: d === "below" ? v : null });
      return (
        <>
          <EntitySelect label="Sensor" value={t.entity} list={numberSensors(all)} onChange={(id) => onChange({ ...t, entity: id })} />
          <Select label="Direction" value={dir} choices={[{ value: "above", label: "goes above" }, { value: "below", label: "goes below" }]} onChange={(d) => setValue(d, dir === "above" ? t.above : t.below)} />
          <span className="with-unit">
            <input className="field num" type="number" inputMode="decimal" value={value} placeholder="0" onChange={(e) => setValue(dir, e.target.value === "" ? null : Number(e.target.value))} aria-label="Value" />
            {unit && <span className="muted">{unit}</span>}
          </span>
        </>
      );
    }
    case "presence":
      return (
        <Select
          label="Who"
          value={t.who}
          choices={[{ value: "everyone_left", label: "Everyone leaves home" }, { value: "someone_home", label: "Someone comes home" }]}
          onChange={(v) => onChange({ ...t, who: v as "everyone_left" | "someone_home" })}
        />
      );
  }
}

const DAY_LETTERS: Record<Day, string> = { mon: "Mo", tue: "Tu", wed: "We", thu: "Th", fri: "Fr", sat: "Sa", sun: "Su" };

function ConditionFields({ c, all, onChange }: { c: Condition; all: Entities; onChange: (c: Condition) => void }) {
  switch (c.kind) {
    case "days":
      return (
        <div className="days" role="group" aria-label="Days">
          {DAYS.map((d) => {
            const on = c.days.includes(d);
            return (
              <button key={d} className={`day ${on ? "on" : ""}`} aria-pressed={on} onClick={() => onChange({ ...c, days: on ? c.days.filter((x) => x !== d) : [...c.days, d] })}>
                {DAY_LETTERS[d]}
              </button>
            );
          })}
        </div>
      );
    case "between":
      return (
        <>
          <span className="lead">From</span>
          <input className="field" type="time" value={c.after} onChange={(e) => e.target.value && onChange({ ...c, after: e.target.value })} aria-label="From" />
          <span className="lead">to</span>
          <input className="field" type="time" value={c.before} onChange={(e) => e.target.value && onChange({ ...c, before: e.target.value })} aria-label="To" />
        </>
      );
    case "device": {
      const e = all[c.entity];
      const states = e ? triggerStates(e).map((s) => ({ ...s, label: s.label.replace(/^turns /, "is ") })) : [];
      return (
        <>
          <EntitySelect label="Device" value={c.entity} list={triggerDevices(all)} onChange={(id) => onChange({ ...c, entity: id, state: all[id] ? triggerStates(all[id])[0].value : c.state })} />
          {e && <Select label="State" value={c.state} choices={states} onChange={(v) => onChange({ ...c, state: v })} />}
        </>
      );
    }
  }
}

function ActionFields({ a, all, phones, onChange }: { a: Action; all: Entities; phones: string[]; onChange: (a: Action) => void }) {
  switch (a.kind) {
    case "device": {
      const e = all[a.entity];
      return (
        <>
          {e && <Select label="Do" value={a.service} choices={actionServices(e)} onChange={(v) => onChange({ ...a, service: v })} />}
          <EntitySelect label="Device" value={a.entity} list={actionDevices(all)} onChange={(id) => onChange({ ...a, entity: id, service: all[id] ? actionServices(all[id])[0].value : "" })} />
        </>
      );
    }
    case "notify": {
      const targets = [
        ...phones.map((p) => ({ value: p, label: "Phone: " + p.replace("notify.mobile_app_", "").replace(/_/g, " ") })),
        { value: BELL, label: "Home Assistant bell" },
      ];
      return (
        <>
          <Select label="Send to" value={a.service} choices={targets} onChange={(v) => onChange({ ...a, service: v })} />
          <input className="field grow" placeholder="Alert text" value={a.message} onChange={(e) => onChange({ ...a, message: e.target.value })} aria-label="Alert text" />
        </>
      );
    }
    case "wait":
      return (
        <>
          <span className="lead">Wait</span>
          <span className="with-unit">
            <input className="field num" type="number" min={1} max={720} value={a.minutes} onChange={(e) => onChange({ ...a, minutes: Math.max(1, Math.round(Number(e.target.value) || 1)) })} aria-label="Minutes" />
            <span className="muted">min</span>
          </span>
        </>
      );
  }
}
