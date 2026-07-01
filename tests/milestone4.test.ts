import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDecision } from "../src/decisions/decisionService.js";
import { readDocument } from "../src/documents/documentService.js";
import { getProjectStatus } from "../src/project/projectService.js";
import { createRequirement } from "../src/requirements/requirementService.js";
import { createTask } from "../src/tasks/taskService.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-m4-"));
  await writeFile(
    path.join(tempRoot, "project.yaml"),
    "project:\n  id: milestone4\n  name: Milestone 4\n  source_of_truth: markdown\n",
    "utf8"
  );
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("milestone 4 requirements decisions tasks", () => {
  it("creates sequential requirement, decision, and task documents", async () => {
    const requirement = await createRequirement({
      root: tempRoot,
      requirement_type: "functional",
      title: "30 minute runtime",
      statement: "The car must run for at least 30 minutes.",
      priority: "must",
      rationale: "Baseline operating target."
    });
    const decision = await createDecision({
      root: tempRoot,
      title: "Use four geared motors",
      status: "accepted",
      context: "The chassis needs predictable low-speed torque.",
      options: ["two motors", "four geared motors"],
      decision: "Use four geared motors.",
      consequences: "Higher wiring complexity.",
      related_requirements: [requirement.id]
    });
    const task = await createTask({
      root: tempRoot,
      title: "Select motor drivers",
      priority: "high",
      related: [requirement.id, decision.id]
    });

    expect(requirement.id).toBe("FR-001");
    expect(decision.id).toBe("EDR-0001");
    expect(task.id).toBe("TASK-0001");

    await expect(readDocument(tempRoot, { id: requirement.id })).resolves.toMatchObject({
      path: requirement.path
    });
  });

  it("updates project status counters for created entities", async () => {
    const requirement = await createRequirement({
      root: tempRoot,
      requirement_type: "security",
      title: "Radio failsafe",
      statement: "The car must stop when radio control is lost.",
      priority: "must"
    });
    await createDecision({
      root: tempRoot,
      title: "Radio failsafe behavior",
      context: "The car needs a predictable safe state.",
      options: ["coast", "brake"],
      decision: "Brake on lost signal.",
      consequences: "Requires controller support.",
      related_requirements: [requirement.id]
    });
    await createTask({
      root: tempRoot,
      title: "Verify failsafe",
      related: [requirement.id]
    });

    const status = await getProjectStatus({
      root: tempRoot,
      include_git_status: false,
      include_validation_summary: true
    });
    const auditLog = await readFile(path.join(tempRoot, ".engimcp/audit.log"), "utf8");

    expect(status.requirements).toBe(1);
    expect(status.decisions).toBe(1);
    expect(status.tasks_open).toBe(1);
    expect(auditLog).toContain("engi_requirement_create");
    expect(auditLog).toContain("engi_decision_create");
    expect(auditLog).toContain("engi_task_create");
  });
});
