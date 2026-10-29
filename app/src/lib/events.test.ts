import { describe, expect, it } from "vitest";
import { demoEvents } from "../ha/demo";
import { agoText, eventTitle, filterEvents, todaySummary, toCamEvents, type FrigateEvent } from "./events";

const frigate: FrigateEvent[] = [
  {
    id: "1700000000.1-abc",
    camera: "yard",
    label: "person",
    sub_label: ["Anna", 0.93],
    start_time: 1700000000,
    end_time: 1700000030,
    has_clip: true,
    has_snapshot: true,
    data: { top_score: 0.88, description: "  Anna walks to the door.  " },
  },
  { id: "2", camera: "yard", label: "car", start_time: 1700000100, top_score: 0.7, has_snapshot: false },
];

describe("camera AI events", () => {
  it("maps Frigate events to app events with Home Assistant links", () => {
    const [a, b] = toCamEvents(frigate, (p) => `https://ha${p}?authSig=x`);
    expect(a).toMatchObject({ subLabel: "Anna", score: 0.88, description: "Anna walks to the door." });
    expect(a.thumbUrl).toBe("https://ha/api/frigate/notifications/1700000000.1-abc/thumbnail.jpg?authSig=x");
    expect(a.clipUrl).toContain("/notifications/1700000000.1-abc/yard/clip.mp4");
    expect(b).toMatchObject({ subLabel: null, score: 0.7, description: null, snapshotUrl: null, clipUrl: null, end: null });
  });

  it("filters by group and titles faces", () => {
    const list = toCamEvents(frigate, (p) => p);
    expect(filterEvents(list, "vehicles").map((e) => e.id)).toEqual(["2"]);
    expect(filterEvents(list, "all")).toHaveLength(2);
    expect(eventTitle(list[0])).toBe("Person · Anna");
    expect(eventTitle(list[1])).toBe("Car");
  });

  it("says how long ago and sums up today", () => {
    const now = new Date(2026, 9, 29, 18, 0).getTime();
    expect(agoText(now / 1000 - 20, now)).toBe("just now");
    expect(agoText(now / 1000 - 600, now)).toBe("10 min ago");
    expect(agoText(now / 1000 - 3 * 3600, now)).toBe("3 h ago");
    const today = demoEvents(now);
    expect(todaySummary(today, now)).toBe("3 people, 1 cat, 1 car");
  });

  it("demo backend serves events newest first", () => {
    const list = demoEvents();
    expect(list[0].start).toBeGreaterThan(list[1].start);
    expect(list.every((e) => e.thumbUrl.startsWith("data:image/svg+xml"))).toBe(true);
  });
});
