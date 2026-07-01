import { buildDocumentRegistry } from "../documents/documentService.js";
import { assertAbsoluteRoot } from "../project/pathSafety.js";
import { extractRelations, type RelationType } from "./relations.js";

export interface GraphNode {
  id: string;
  path: string;
  kind?: string;
  status?: string;
}

export interface GraphEdge {
  source_id: string;
  relation_type: RelationType;
  target_id: string;
  source_path: string;
}

export interface ProjectGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphQueryInput {
  root: string;
  id: string;
  direction?: "outgoing" | "incoming" | "both";
  depth?: number;
  relation_types?: RelationType[];
}

export async function buildGraph(rootInput: string): Promise<ProjectGraph> {
  const root = assertAbsoluteRoot(rootInput);
  const registry = await buildDocumentRegistry(root);
  const nodes = registry.documents
    .filter((document) => document.id)
    .map((document) => ({
      id: document.id as string,
      path: document.path,
      kind: document.kind,
      status: document.status
    }));
  const edges = registry.documents.flatMap((document) => {
    if (!document.id) {
      return [];
    }

    return extractRelations(document.frontmatter).map((relation) => ({
      source_id: document.id as string,
      relation_type: relation.relation_type,
      target_id: relation.target_id,
      source_path: document.path
    }));
  });

  return { nodes, edges };
}

export async function queryGraph(input: GraphQueryInput): Promise<ProjectGraph> {
  const graph = await buildGraph(input.root);
  const direction = input.direction ?? "both";
  const maxDepth = input.depth ?? 1;
  const relationTypes = input.relation_types ? new Set(input.relation_types) : undefined;
  const visited = new Set<string>([input.id]);
  const frontier = [{ id: input.id, depth: 0 }];
  const selectedEdges: GraphEdge[] = [];

  while (frontier.length > 0) {
    const current = frontier.shift();
    if (!current || current.depth >= maxDepth) {
      continue;
    }

    const edges = graph.edges.filter((edge) => {
      if (relationTypes && !relationTypes.has(edge.relation_type)) {
        return false;
      }
      if (direction === "outgoing") {
        return edge.source_id === current.id;
      }
      if (direction === "incoming") {
        return edge.target_id === current.id;
      }
      return edge.source_id === current.id || edge.target_id === current.id;
    });

    for (const edge of edges) {
      selectedEdges.push(edge);
      const nextId = edge.source_id === current.id ? edge.target_id : edge.source_id;
      if (!visited.has(nextId)) {
        visited.add(nextId);
        frontier.push({ id: nextId, depth: current.depth + 1 });
      }
    }
  }

  return {
    nodes: graph.nodes.filter((node) => visited.has(node.id)),
    edges: dedupeEdges(selectedEdges)
  };
}

export function findDependencyCycles(graph: ProjectGraph): string[][] {
  const dependencyEdges = graph.edges.filter((edge) => edge.relation_type === "depends_on");
  const adjacency = new Map<string, string[]>();
  const cycles: string[][] = [];

  for (const edge of dependencyEdges) {
    adjacency.set(edge.source_id, [...(adjacency.get(edge.source_id) ?? []), edge.target_id]);
  }

  function visit(node: string, stack: string[]): void {
    if (stack.includes(node)) {
      cycles.push([...stack.slice(stack.indexOf(node)), node]);
      return;
    }

    for (const next of adjacency.get(node) ?? []) {
      visit(next, [...stack, node]);
    }
  }

  for (const node of adjacency.keys()) {
    visit(node, []);
  }

  return cycles;
}

function dedupeEdges(edges: GraphEdge[]): GraphEdge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.source_id}:${edge.relation_type}:${edge.target_id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
