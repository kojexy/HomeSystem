import { useEffect, useState } from "react";
import type { CamEvent } from "../ha/types";
import { objectId } from "../lib/domains";
import { agoText, EVENT_GROUPS, eventTitle, filterEvents, todaySummary, type EventGroup } from "../lib/events";
import { name } from "../lib/home";
import type { HomeCtx } from "../ui";
import { Icon, type IconName } from "./Icon";

/** undefined while loading, null when there is no Frigate. Refreshes by itself. */
function useCamEvents(ctx: HomeCtx, limit: number): CamEvent[] | null | undefined {
  const [events, setEvents] = useState<CamEvent[] | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      const list = await ctx.events(limit).catch(() => null);
      if (!alive) return;
      setEvents(list);
      // Retry sooner while HA is still connecting or Frigate is missing.
      timer = setTimeout(load, list ? 30_000 : 10_000);
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ctx.events, limit]);
  return events;
}

function labelIcon(label: string): IconName {
  if (EVENT_GROUPS.people.labels.includes(label as never)) return "person";
  if (EVENT_GROUPS.vehicles.labels.includes(label as never)) return "car";
  if (EVENT_GROUPS.animals.labels.includes(label as never)) return "paw";
  return "sparkle";
}

/** What the cameras' AI noticed: people, cars, animals, with an AI description when available. */
export function EventsFeed({ ctx, limit = 40, compact = false }: { ctx: HomeCtx; limit?: number; compact?: boolean }) {
  const events = useCamEvents(ctx, limit);
  const [group, setGroup] = useState<EventGroup>("all");
  const [open, setOpen] = useState<string | null>(null);

  if (events === undefined || (compact && !events?.length)) return null;

  const cameraName = (cam: string) => {
    const e = ctx.entities[`camera.${cam}`];
    return e ? name(e) : objectId(`camera.${cam}`).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  };
  const summary = events ? todaySummary(events) : null;
  const shown = events ? filterEvents(events, group) : [];

  return (
    <section className="card events">
      <div className="events-head">
        <h2>
          <Icon name="sparkle" size={18} /> {compact ? "Cameras noticed" : "AI events"}
        </h2>
        {summary && <span className="muted small">{summary} today</span>}
      </div>

      {events === null ? (
        <p className="muted">
          Connect Frigate to see what the cameras notice — people, cars and animals, with a short AI description of each.
          Setup guide, step 4.
        </p>
      ) : (
        <>
          {!compact && (
            <div className="chips scroll" role="tablist" aria-label="Filter events">
              {(Object.keys(EVENT_GROUPS) as EventGroup[]).map((g) => (
                <button key={g} role="tab" aria-selected={g === group} className={`chip ${g === group ? "selected" : ""}`} onClick={() => setGroup(g)}>
                  {EVENT_GROUPS[g].label}
                </button>
              ))}
            </div>
          )}
          {shown.length === 0 && <p className="muted empty">Nothing seen yet.</p>}
          <ul className="event-list">
            {shown.slice(0, compact ? 3 : undefined).map((e) => {
              const isOpen = open === e.id;
              return (
                <li key={e.id} className={isOpen ? "open" : ""}>
                  <button className="event-row" onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen}>
                    <img className="event-thumb" src={e.thumbUrl} alt="" loading="lazy" />
                    <span className="event-text">
                      <span className="event-title">
                        <Icon name={labelIcon(e.label)} size={16} />
                        {eventTitle(e)}
                        <span className="muted"> · {cameraName(e.camera)}</span>
                      </span>
                      {e.description ? (
                        <span className={`event-desc ${isOpen ? "" : "clamp"}`}>{e.description}</span>
                      ) : (
                        <span className="muted small">{e.score !== null ? `${Math.round(e.score * 100)}% sure` : "Detected"}</span>
                      )}
                      <span className="muted small">{agoText(e.start)}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="event-media">
                      {e.clipUrl ? (
                        <video src={e.clipUrl} poster={e.snapshotUrl ?? undefined} controls playsInline preload="none" />
                      ) : (
                        e.snapshotUrl && <img src={e.snapshotUrl} alt={`${eventTitle(e)} at ${cameraName(e.camera)}`} />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
