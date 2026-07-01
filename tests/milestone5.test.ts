import { describe, expect, it } from "vitest";
import { buildContextPack } from "../src/context/contextPack.js";

const rcCarRoot = `${process.cwd()}/examples/rc_car_project_stub`;
const fixturesRoot = `${process.cwd()}/tests/fixtures`;

describe("milestone 5 context pack", () => {
  it("includes seed documents and graph neighbors with reasons", async () => {
    const pack = await buildContextPack({
      root: rcCarRoot,
      task: "battery drive runtime",
      seed_ids: ["DOC-RC-CAR-BATTERY"],
      max_tokens: 12000,
      include_validation: true
    });

    expect(pack.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["DOC-RC-CAR-BATTERY", "DOC-RC-CAR-DRIVE", "DOC-RC-CAR-BOM"])
    );
    expect(pack.items.find((item) => item.id === "DOC-RC-CAR-BATTERY")?.reason).toBe(
      "seed document"
    );
    expect(pack.warnings).toEqual(
      expect.arrayContaining(["REQUIREMENT_WITHOUT_TESTS: Requirement REQ-RC-CAR-V0 has no tests"])
    );
  });

  it("respects token budget and reports excluded documents", async () => {
    const pack = await buildContextPack({
      root: rcCarRoot,
      task: "battery drive runtime",
      seed_ids: ["REQ-RC-CAR-V0"],
      max_tokens: 20,
      include_validation: false
    });

    expect(pack.items.length).toBeLessThan(4);
    expect(pack.excluded.some((item) => item.reason === "token budget exceeded")).toBe(true);
  });

  it("includes validation warnings when requested", async () => {
    const pack = await buildContextPack({
      root: `${fixturesRoot}/duplicate-id-project`,
      task: "duplicate",
      seed_ids: ["DOC-DUPLICATE"],
      include_validation: true
    });

    expect(pack.warnings.some((warning) => warning.includes("DUPLICATE_ID"))).toBe(true);
  });
});
