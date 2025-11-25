import { Node, Link, Layout, Orientation } from './types';

/**
 * Extract layout from nodes and links (for saving)
 */
export function extractLayout(nodes: Node[], links?: Link[]): Layout {
  const layout: Layout = { nodes: {} };
  
  for (const node of nodes) {
    layout.nodes[node.id] = {
      x: node.x,
      y: node.y,
      orientation: node.orientation,
      length: node.length,
    };
  }
  
  // Extract link orders if any links have custom ordering
  if (links) {
    const linkOrders: Layout['linkOrders'] = {};
    let hasOrders = false;
    
    for (const link of links) {
      if (link.sourceOrder !== undefined || link.targetOrder !== undefined) {
        linkOrders[link.id] = {
          sourceOrder: link.sourceOrder,
          targetOrder: link.targetOrder,
        };
        hasOrders = true;
      }
    }
    
    if (hasOrders) {
      layout.linkOrders = linkOrders;
    }
  }
  
  return layout;
}

/**
 * Apply a saved layout to nodes
 * Returns new node array with layout applied
 */
export function applyLayout(nodes: Node[], layout: Layout): Node[] {
  return nodes.map(node => {
    const savedLayout = layout.nodes[node.id];
    
    if (savedLayout) {
      return {
        ...node,
        x: savedLayout.x,
        y: savedLayout.y,
        orientation: savedLayout.orientation,
        length: savedLayout.length ?? node.length,
      };
    }
    
    // Node not in layout - keep original position
    return node;
  });
}

/**
 * Apply saved link orders from a layout to links
 * Returns new link array with orders applied
 */
export function applyLinkOrders(links: Link[], layout: Layout): Link[] {
  if (!layout.linkOrders) return links;
  
  return links.map(link => {
    const savedOrder = layout.linkOrders![link.id];
    
    if (savedOrder) {
      return {
        ...link,
        sourceOrder: savedOrder.sourceOrder ?? link.sourceOrder,
        targetOrder: savedOrder.targetOrder ?? link.targetOrder,
      };
    }
    
    return link;
  });
}

/**
 * Update a single node's position in the layout
 */
export function updateNodePosition(layout: Layout, nodeId: string, x: number, y: number): Layout {
  const existing = layout.nodes[nodeId];
  if (!existing) {
    throw new Error(`Node "${nodeId}" not found in layout`);
  }
  
  return {
    ...layout,
    nodes: {
      ...layout.nodes,
      [nodeId]: { ...existing, x, y },
    },
  };
}

/**
 * Update a single node's orientation in the layout
 */
export function updateNodeOrientation(layout: Layout, nodeId: string, orientation: Orientation): Layout {
  const existing = layout.nodes[nodeId];
  if (!existing) {
    throw new Error(`Node "${nodeId}" not found in layout`);
  }
  
  return {
    ...layout,
    nodes: {
      ...layout.nodes,
      [nodeId]: { ...existing, orientation },
    },
  };
}

/**
 * Update a single node's length in the layout
 */
export function updateNodeLength(layout: Layout, nodeId: string, length: number): Layout {
  const existing = layout.nodes[nodeId];
  if (!existing) {
    throw new Error(`Node "${nodeId}" not found in layout`);
  }
  
  return {
    ...layout,
    nodes: {
      ...layout.nodes,
      [nodeId]: { ...existing, length },
    },
  };
}

/**
 * Serialize layout to JSON string
 */
export function serializeLayout(layout: Layout): string {
  return JSON.stringify(layout, null, 2);
}

/**
 * Parse layout from JSON string
 */
export function parseLayout(json: string): Layout {
  const parsed = JSON.parse(json);
  
  // Basic validation
  if (!parsed.nodes || typeof parsed.nodes !== 'object') {
    throw new Error('Invalid layout: missing nodes object');
  }
  
  return parsed as Layout;
}
