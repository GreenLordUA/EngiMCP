import { buildGraph, type GraphEdge } from "./graphBuilder.js";

export interface ImpactAnalyzeInput {
  root: string;
  changed_ids: string[];
  change_description?: string;
  depth?: number;
}

export interface ImpactItem {
  id: string;
  path?: string;
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface ImpactAnalyzeResult {
  impact: ImpactItem[];
  recommended_reads: string[];
  recommended_actions: string[];
}

export async function analyzeImpact(input: ImpactAnalyzeInput): Promise<ImpactAnalyzeResult> {
  const graph = await buildGraph(input.root);
  const maxDepth = input.depth ?? 2;
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const impact = new Map<string, ImpactItem>();
  const frontier = input.changed_ids.map((id) => ({ id, depth: 0, via: "changed input" }));
  const visited = new Set(input.changed_ids);

  while (frontier.length > 0) {
    const current = frontier.shift();
    if (!current || current.depth >= maxDepth) {
      continue;
    }

    for (const edge of impactEdges(graph.edges, current.id)) {
      const nextId = edge.source_id === current.id ? edge.target_id : edge.source_id;
      if (visited.has(nextId)) {
        continue;
      }

      visited.add(nextId);
      frontier.push({ id: nextId, depth: current.depth + 1, via: edge.relation_type });
      impact.set(nextId, {
        id: nextId,
        path: nodeById.get(nextId)?.path,
        reason: `${nextId} is connected to ${current.id} via ${edge.relation_type}`,
        severity: current.depth === 0 ? "medium" : "low"
      });
    }
  }

  return {
    impact: [...impact.values()],
    recommended_reads: [...impact.keys()],
    recommended_actions: [
      "review_impacted_documents",
      "update_related_calculations",
      "run_validation"
    ]
  };
}

function impactEdges(edges: GraphEdge[], id: string): GraphEdge[] {
  return edges.filter((edge) => {
    if (edge.relation_type === "impacts" && edge.source_id === id) {
      return true;
    }
    if (edge.relation_type === "impacts" && edge.target_id === id) {
      return true;
    }
    if (edge.relation_type === "depends_on" && edge.target_id === id) {
      return true;
    }
    return false;
  });
}
