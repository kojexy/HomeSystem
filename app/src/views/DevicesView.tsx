import { useState } from "react";
import { EntityTile } from "../components/EntityTile";
import { Icon } from "../components/Icon";
import { DEVICE_DOMAINS, DOMAIN_LABELS, domainOf } from "../lib/domains";
import { devices, name } from "../lib/home";
import type { HomeCtx } from "../ui";

export function DevicesView({ ctx }: { ctx: HomeCtx }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const all = devices(ctx.entities);
  const present = DEVICE_DOMAINS.filter((d) => all.some((e) => domainOf(e.entity_id) === d));
  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (e) => (!filter || domainOf(e.entity_id) === filter) && (!q || name(e).toLowerCase().includes(q) || e.entity_id.includes(q))
  );

  return (
    <>
      <div className="search">
        <Icon name="search" size={18} />
        <input placeholder="Find a device" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a device" />
      </div>
      <div className="chips scroll">
        <button className={`chip ${filter === null ? "selected" : ""}`} onClick={() => setFilter(null)}>
          All · {all.length}
        </button>
        {present.map((d) => (
          <button key={d} className={`chip ${filter === d ? "selected" : ""}`} onClick={() => setFilter(filter === d ? null : d)}>
            {DOMAIN_LABELS[d]}
          </button>
        ))}
      </div>
      {present
        .filter((d) => shown.some((e) => domainOf(e.entity_id) === d))
        .map((d) => (
          <section key={d} className="card">
            <h2>{DOMAIN_LABELS[d]}</h2>
            <div className="tiles">
              {shown
                .filter((e) => domainOf(e.entity_id) === d)
                .map((e) => (
                  <EntityTile key={e.entity_id} e={e} ctx={ctx} />
                ))}
            </div>
          </section>
        ))}
      {!shown.length && <p className="muted empty">Nothing found.</p>}
    </>
  );
}
