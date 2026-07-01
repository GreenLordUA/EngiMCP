import { describe, expect, it } from "vitest";
import { analyzeImpact } from "../src/graph/impact.js";
import { queryGraph } from "../src/graph/graphBuilder.js";
import { validateProject } from "../src/validation/validator.js";

const rcCarRoot = `${process.cwd()}/examples/rc_car_project_stub`;
const fixturesRoot = `${process.cwd()}/tests/fixtures`;

describe("milestone 3 graph and impact", () => {
  it("returns graph neighbors from frontmatter relationships", async () => {
    const graph = await queryGraph({
      root: rcCarRoot,
      id: "DOC-RC-CAR-DRIVE",
      direction: "outgoing",
      depth: 1
    });

    expect(graph.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(["DOC-RC-CAR-DRIVE", "REQ-RC-CAR-V0", "DOC-RC-CAR-BATTERY"])
    );
    expect(
      graph.edges.map((edge) => `${edge.source_id}:${edge.relation_type}:${edge.target_id}`)
    ).toEqual(
      expect.arrayContaining([
        "DOC-RC-CAR-DRIVE:depends_on:REQ-RC-CAR-V0",
        "DOC-RC-CAR-DRIVE:impacts:DOC-RC-CAR-BATTERY"
      ])
    );
  });

  it("analyzes transitive impact through impacts and reverse depends_on edges", async () => {
    const result = await analyzeImpact({
      root: rcCarRoot,
      changed_ids: ["DOC-RC-CAR-BATTERY"],
      depth: 2
    });

    expect(result.impact.map((item) => item.id)).toEqual(
      expect.arrayContaining(["DOC-RC-CAR-BOM"])
    );
    expect(result.recommended_actions).toContain("run_validation");
  });

  it("covers the battery-change impact acceptance scenario", async () => {
    const result = await analyzeImpact({
      root: rcCarRoot,
      changed_ids: ["DOC-RC-CAR-BATTERY"],
      depth: 2
    });

    expect(result.impact.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "DOC-RC-CAR-POWER",
        "DOC-RC-CAR-BOM",
        "REQ-RC-CAR-V0",
        "TEST-RC-CAR-RUNTIME",
        "EDR-RC-CAR-0001"
      ])
    );
  });

  it("reports dependency cycles during validation", async () => {
    const result = await validateProject({ root: `${fixturesRoot}/dependency-cycle-project` });

    expect(result.warnings.map((warning) => warning.code)).toContain("DEPENDENCY_CYCLE");
  });
});
