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
import { extractLayout, applyLayout, applyLinkOrders } from './core/Layout';
import { createSVGContainer, renderNodes, renderLinks, clearSVG } from './render/SVGRenderer';
import { computeLinkPaths } from './render/PathGenerator';
import { EventEmitter } from './interaction/EventEmitter';
import { InteractionManager } from './interaction/InteractionManager';

// Re-export types for library consumers
export * from './core/types';
export { extractLayout, applyLayout, applyLinkOrders, serializeLayout, parseLayout } from './core/Layout';

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
    links = applyLinkOrders(links, config.layout);
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
  
  // Interaction manager (initialized after first render)
  let interactionManager: InteractionManager | null = null;

  /**
   * Compute and render the diagram
   */
  function computeAndRender() {
    computedNodes = computeNodes(graph, options);
    computedLinks = computeLinkPaths(computedNodes, graph.links, options);
    renderNodes(svg, computedNodes, options);
    renderLinks(svg, computedLinks, options);
    attachEventListeners();
  }

  /**
   * Initialize or update interaction handlers
   */
  function updateInteractions() {
    if (interactionManager) {
      interactionManager.updateNodes(computedNodes, graph.links);
    } else {
      interactionManager = new InteractionManager(svg, computedNodes, graph.links, {
        onDrag: (node, x, y) => {
          const graphNode = graph.nodes.find(n => n.id === node.id);
          if (graphNode) {
            graphNode.x = x;
            graphNode.y = y;
          }
          computeAndRender();
          interactionManager?.updateNodes(computedNodes, graph.links);
        },
        onDragEnd: (_node, layout) => {
          events.emit('layoutChange', layout);
        },
        onRotate: (node, newOrientation, layout) => {
          const graphNode = graph.nodes.find(n => n.id === node.id);
          if (graphNode) {
            graphNode.orientation = newOrientation;
          }
          render();
          events.emit('layoutChange', layout);
        },
        onResize: (node, newLength) => {
          const graphNode = graph.nodes.find(n => n.id === node.id);
          if (graphNode) {
            graphNode.length = newLength;
          }
          computeAndRender();
          interactionManager?.updateNodes(computedNodes, graph.links);
        },
        onResizeEnd: (_node, layout) => {
          events.emit('layoutChange', layout);
        },
        onLinkOrderChange: (updatedLinks) => {
          // Re-render with updated link orders
          computeAndRender();
          interactionManager?.updateNodes(computedNodes, graph.links);
          events.emit('layoutChange', extractLayout(graph.nodes, graph.links));
        },
      }, options);
    }
  }

  /**
   * Full render (compute, render, update interactions)
   */
  function render() {
    computeAndRender();
    updateInteractions();
  }
  
  /**
   * Attach DOM event listeners for hover/click events
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
      return extractLayout(graph.nodes, graph.links);
    },
    
    setLayout(layout: Layout) {
      graph = createGraph(
        applyLayout(graph.nodes, layout),
        applyLinkOrders(graph.links, layout)
      );
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
      // Preserve layout from current nodes and links
      const currentLayout = extractLayout(graph.nodes, graph.links);
      
      // Apply current layout to new nodes and links
      const layoutedNodes = applyLayout(newNodes, currentLayout);
      const orderedLinks = applyLinkOrders(newLinks, currentLayout);
      
      // Update graph
      graph = createGraph(layoutedNodes, orderedLinks);
      render();
    },
    
    destroy() {
      interactionManager?.destroy();
      events.clear();
      clearSVG(svg);
      svg.remove();
    },
  };
}
