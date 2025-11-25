import { Node, Link, Graph, ComputedNode, SankeyOptions } from './types';

/**
 * Create a graph from nodes and links with validation
 */
export function createGraph(nodes: Node[], links: Link[]): Graph {
  // Validate nodes have unique IDs
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // Validate links reference existing nodes
  for (const link of links) {
    if (!nodeIds.has(link.source)) {
      throw new Error(`Link "${link.id}" references unknown source node: ${link.source}`);
    }
    if (!nodeIds.has(link.target)) {
      throw new Error(`Link "${link.id}" references unknown target node: ${link.target}`);
    }
  }

  return { nodes: [...nodes], links: [...links] };
}

/**
 * Get a node by ID
 */
export function getNode(graph: Graph, id: string): Node | undefined {
  return graph.nodes.find(n => n.id === id);
}

/**
 * Get a link by ID
 */
export function getLink(graph: Graph, id: string): Link | undefined {
  return graph.links.find(l => l.id === id);
}

/**
 * Get all links connected to a node (incoming and outgoing)
 */
export function getNodeLinks(graph: Graph, nodeId: string): { incoming: Link[]; outgoing: Link[] } {
  const incoming = graph.links.filter(l => l.target === nodeId);
  const outgoing = graph.links.filter(l => l.source === nodeId);
  return { incoming, outgoing };
}

/**
 * Compute node dimensions based on connected link values
 */
export function computeNodes(graph: Graph, options: SankeyOptions): ComputedNode[] {
  return graph.nodes.map(node => {
    const { incoming, outgoing } = getNodeLinks(graph, node.id);
    
    const incomingValue = incoming.reduce((sum, link) => sum + link.value, 0);
    const outgoingValue = outgoing.reduce((sum, link) => sum + link.value, 0);
    
    // Thickness is the max of incoming/outgoing values
    const maxValue = Math.max(incomingValue, outgoingValue);
    const thickness = maxValue * options.valueScale;

    return {
      ...node,
      thickness,
      incomingValue,
      outgoingValue,
    };
  });
}

/**
 * Convert an ID to a CSS-safe class name
 */
export function toClassName(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
