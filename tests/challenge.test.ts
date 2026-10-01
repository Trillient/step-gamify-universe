import { describe, expect, it } from "vitest";
import {
  FINAL_WEEKS_START,
  PERIODS,
  canSubmitWeek,
  currentWeek,
  dateInZone,
  isPublicTotal,
  othersHidden,
  phaseFor,
} from "../shared/challenge";

describe("periods", () => {
  it("has 12 contiguous periods covering 2026-10-01..2026-12-20", () => {
    expect(PERIODS).toHaveLength(12);
    expect(PERIODS[0].start).toBe("2026-10-01");
    expect(PERIODS[0].end).toBe("2026-10-07");
    expect(PERIODS[11].end).toBe("2026-12-20");
    for (let i = 1; i < 12; i++) {
      const prevEnd = new Date(PERIODS[i - 1].end + "T00:00:00Z").getTime();
      const start = new Date(PERIODS[i].start + "T00:00:00Z").getTime();
      expect(start - prevEnd).toBe(86_400_000);
    }
    expect(PERIODS.slice(0, 11).every((p) => p.days === 7)).toBe(true);
  });

  it("makes week 12 the short final period (Dec 17-20)", () => {
    expect(PERIODS[11]).toMatchObject({ week: 12, start: "2026-12-17", end: "2026-12-20", days: 4 });
  });

  it("starts week 9 on Nov 26", () => {
    expect(PERIODS[8].start).toBe("2026-11-26");
    expect(FINAL_WEEKS_START).toBe("2026-11-26");
  });

  it("maps dates to weeks at boundaries", () => {
    expect(currentWeek("2026-09-30")).toBeNull();
    expect(currentWeek("2026-10-01")).toBe(1);
    expect(currentWeek("2026-10-07")).toBe(1);
    expect(currentWeek("2026-10-08")).toBe(2);
    expect(currentWeek("2026-12-20")).toBe(12);
    expect(currentWeek("2026-12-21")).toBeNull();
  });
});

describe("phases and privacy windows", () => {
  it("switches phase on the exact boundary dates", () => {
    expect(phaseFor("2026-09-30")).toBe("upcoming");
    expect(phaseFor("2026-10-01")).toBe("open");
    expect(phaseFor("2026-11-25")).toBe("open");
    expect(phaseFor("2026-11-26")).toBe("final-weeks");
    expect(phaseFor("2026-12-20")).toBe("final-weeks");
    expect(phaseFor("2026-12-21")).toBe("ended");
  });

  it("hides others only before the start and during the final weeks", () => {
    expect(othersHidden("2026-11-25")).toBe(false);
    expect(othersHidden("2026-11-26")).toBe(true);
    expect(othersHidden("2026-12-20")).toBe(true);
    expect(othersHidden("2026-12-21")).toBe(false);
  });

  it("applies the public threshold at exactly 1000", () => {
    expect(isPublicTotal(999)).toBe(false);
    expect(isPublicTotal(1000)).toBe(true);
  });
});

describe("submission window", () => {
  it("refuses weeks that have not started and anything after the end", () => {
    expect(canSubmitWeek(2, "2026-10-07")).toBe(false);
    expect(canSubmitWeek(2, "2026-10-08")).toBe(true);
    expect(canSubmitWeek(1, "2026-12-20")).toBe(true);
    expect(canSubmitWeek(1, "2026-12-21")).toBe(false);
    expect(canSubmitWeek(0, "2026-10-10")).toBe(false);
    expect(canSubmitWeek(13, "2026-12-20")).toBe(false);
  });
});

describe("time zone handling", () => {
  it("uses the challenge zone, not UTC, for the calendar date", () => {
    // Melbourne is UTC+11 in November: midnight Nov 26 local is 13:00Z on Nov 25
    expect(dateInZone(new Date("2026-11-25T13:00:00Z"), "Australia/Melbourne")).toBe("2026-11-26");
    expect(dateInZone(new Date("2026-11-25T12:59:59Z"), "Australia/Melbourne")).toBe("2026-11-25");
    // end of the challenge: Dec 20 23:59 Melbourne is still Dec 20
    expect(dateInZone(new Date("2026-12-20T12:59:59Z"), "Australia/Melbourne")).toBe("2026-12-20");
    expect(dateInZone(new Date("2026-12-20T13:00:00Z"), "Australia/Melbourne")).toBe("2026-12-21");
  });
});
