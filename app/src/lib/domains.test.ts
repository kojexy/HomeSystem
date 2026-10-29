import { describe, expect, it } from "vitest";
import type { Entity } from "../ha/types";
import { climateTarget, stateText } from "./domains";

const climate = (state: string, attributes: Entity["attributes"]): Entity => ({
  entity_id: "climate.ecobee",
  state,
  attributes,
  last_changed: "",
});

describe("thermostats", () => {
  it("shows one target or a heat/cool range, never 'undefined'", () => {
    expect(stateText(climate("heat", { temperature: 21, current_temperature: 20 }))).toBe("Heat → 21° · now 20°");
    const range = climate("heat_cool", { target_temp_low: 21, target_temp_high: 24, current_temperature: 23 });
    expect(stateText(range)).toBe("Heat/cool → 21–24° · now 23°");
    expect(climateTarget(range)).toEqual({ kind: "range", low: 21, high: 24 });
    expect(stateText(climate("fan_only", { current_temperature: 22 }))).toBe("Fan · now 22°");
    expect(climateTarget(climate("fan_only", {}))).toBeNull();
  });
});
