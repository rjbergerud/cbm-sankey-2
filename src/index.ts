import {
  Node,
  Link,
  Layout,
  SankeyOptions,
  DEFAULT_OPTIONS,
  SankeyEventType,
  SankeyEventCallback,
  ComputedNode,
  ComputedLink,
} from './core/types';
import { createGraph, computeNodes, getNode, getLink } from './core/Graph';
import { extractLayout, applyLayout } from './core/Layout';
import { createSVGContainer, renderNodes, renderLinks, clearSVG } from './render/SVGRenderer';
import { computeLinkPaths } from './render/PathGenerator';
import { EventEmitter } from './interaction/EventEmitter';
import { DragHandler } from './interaction/DragHandler';
import { RotateHandler } from './interaction/RotateHandler';

// Re-export types for library consumers
export * from './core/types';
export { extractLayout, applyLayout, serializeLayout, parseLayout } from './core/Layout';

export interface CreateSankeyOptions {
  nodes: Node[];
  links: Link[];
  layout?: Layout;
  options?: Partial<SankeyOptions>;
}

export interface SankeyInstance {
  // Events
  on<T>(event: SankeyEventType, callback: SankeyEventCallback<T>): () => void;
  
  // Layout management
  getLayout(): Layout;
  setLayout(layout: Layout): void;
  
  // Global options
  setOption<K extends keyof SankeyOptions>(key: K, value: SankeyOptions[K]): void;
  getOptions(): SankeyOptions;
  
  // Data updates
  setData(nodes: Node[], links: Link[]): void;
  
  // Cleanup
  destroy(): void;
}

/**
 * Create a new Sankey diagram
 */
export function createSankey(
  container: HTMLElement,
  config: CreateSankeyOptions
): SankeyInstance {
  // Initialize state
  let nodes = [...config.nodes];
  let links = [...config.links];
  let options: SankeyOptions = { ...DEFAULT_OPTIONS, ...config.options };
  
  // Apply layout if provided
  if (config.layout) {
    nodes = applyLayout(nodes, config.layout);
  }
  
  // Create graph and validate
  let graph = createGraph(nodes, links);
  
  // Create SVG
  const svg = createSVGContainer(container);
  
  // Event emitter
  const events = new EventEmitter();
  
  // Computed data (recalculated on render)
  let computedNodes: ComputedNode[] = [];
  let computedLinks: ComputedLink[] = [];
  
  // Interaction handlers (initialized after first render)
  let dragHandler: DragHandler | null = null;
  let rotateHandler: RotateHandler | null = null;

  /**
   * Re-render the diagram
   */
  function render() {
    // Compute node dimensions
    computedNodes = computeNodes(graph, options);
    
    // Compute link paths
    computedLinks = computeLinkPaths(computedNodes, graph.links, options);
    
    // Render
    renderNodes(svg, computedNodes, options);
    renderLinks(svg, computedLinks, options);
    
    // Attach event listeners
    attachEventListeners();
    
    // Update or initialize interaction handlers
    if (dragHandler) {
      dragHandler.updateNodes(computedNodes);
    } else {
      dragHandler = new DragHandler(svg, computedNodes, {
        onDrag: (node, x, y) => {
          // Update the graph node position
          const graphNode = graph.nodes.find(n => n.id === node.id);
          if (graphNode) {
            graphNode.x = x;
            graphNode.y = y;
          }
          // Re-render to update links
          renderAfterDrag();
        },
        onDragEnd: (node, layout) => {
          events.emit('layoutChange', layout);
        },
      });
    }
    
    if (rotateHandler) {
      rotateHandler.updateNodes(computedNodes);
    } else {
      rotateHandler = new RotateHandler(svg, computedNodes, {
        onRotate: (node, newOrientation, layout) => {
          // Update the graph node orientation
          const graphNode = graph.nodes.find(n => n.id === node.id);
          if (graphNode) {
            graphNode.orientation = newOrientation;
          }
          // Re-render to update node and links
          render();
          events.emit('layoutChange', layout);
        },
      });
    }
  }
  
  /**
   * Lightweight re-render during drag (only update links)
   */
  function renderAfterDrag() {
    // Recompute with updated positions
    computedNodes = computeNodes(graph, options);
    computedLinks = computeLinkPaths(computedNodes, graph.links, options);
    
    // Re-render nodes and links
    renderNodes(svg, computedNodes, options);
    renderLinks(svg, computedLinks, options);
    
    // Re-attach basic event listeners (hover/click)
    attachEventListeners();
    
    // Update drag handler's node references
    if (dragHandler) {
      dragHandler.updateNodes(computedNodes);
    }
  }
  
  /**
   * Attach DOM event listeners
   */
  function attachEventListeners() {
    // Node events
    const nodeElements = svg.querySelectorAll('.node');
    nodeElements.forEach(el => {
      const nodeId = el.getAttribute('data-node-id');
      if (!nodeId) return;
      
      el.addEventListener('click', () => {
        const node = getNode(graph, nodeId);
        if (node) events.emit('nodeClick', node);
      });
      
      el.addEventListener('mouseenter', () => {
        const node = getNode(graph, nodeId);
        if (node) events.emit('nodeHover', node);
      });
      
      el.addEventListener('mouseleave', () => {
        events.emit('nodeHover', null);
      });
    });
    
    // Link events
    const linkElements = svg.querySelectorAll('.link');
    linkElements.forEach(el => {
      const linkId = el.getAttribute('data-link-id');
      if (!linkId) return;
      
      el.addEventListener('click', () => {
        const link = getLink(graph, linkId);
        if (link) events.emit('linkClick', link);
      });
      
      el.addEventListener('mouseenter', () => {
        const link = getLink(graph, linkId);
        if (link) events.emit('linkHover', link);
      });
      
      el.addEventListener('mouseleave', () => {
        events.emit('linkHover', null);
      });
    });
  }
  
  // Initial render
  render();
  
  // Return public API
  return {
    on<T>(event: SankeyEventType, callback: SankeyEventCallback<T>) {
      return events.on(event, callback);
    },
    
    getLayout() {
      return extractLayout(graph.nodes);
    },
    
    setLayout(layout: Layout) {
      graph = createGraph(applyLayout(graph.nodes, layout), graph.links);
      render();
      events.emit('layoutChange', layout);
    },
    
    setOption<K extends keyof SankeyOptions>(key: K, value: SankeyOptions[K]) {
      options[key] = value;
      render();
    },
    
    getOptions() {
      return { ...options };
    },
    
    setData(newNodes: Node[], newLinks: Link[]) {
      // Preserve layout from current nodes
      const currentLayout = extractLayout(graph.nodes);
      
      // Apply current layout to new nodes
      const layoutedNodes = applyLayout(newNodes, currentLayout);
      
      // Update graph
      graph = createGraph(layoutedNodes, newLinks);
      render();
    },
    
    destroy() {
      if (dragHandler) dragHandler.destroy();
      if (rotateHandler) rotateHandler.destroy();
      events.clear();
      clearSVG(svg);
      svg.remove();
    },
  };
}
