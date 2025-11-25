import { ComputedNode, Orientation, Layout } from '../core/types';
import { extractLayout } from '../core/Layout';

export interface RotateHandlerCallbacks {
  onRotate?: (node: ComputedNode, newOrientation: Orientation, layout: Layout) => void;
}

/**
 * Handles rotation interactions for nodes (double-click to rotate 90°)
 */
export class RotateHandler {
  private svg: SVGSVGElement;
  private nodes: ComputedNode[];
  private callbacks: RotateHandlerCallbacks;
  
  // Store bound handlers for cleanup
  private boundHandlers: Map<string, (e: Event) => void> = new Map();
  
  constructor(
    svg: SVGSVGElement,
    nodes: ComputedNode[],
    callbacks: RotateHandlerCallbacks = {}
  ) {
    this.svg = svg;
    this.nodes = nodes;
    this.callbacks = callbacks;
    
    this.attachListeners();
  }
  
  /**
   * Update nodes reference (after re-render)
   */
  updateNodes(nodes: ComputedNode[]): void {
    this.nodes = nodes;
    this.reattachListeners();
  }
  
  /**
   * Attach event listeners
   */
  private attachListeners(): void {
    this.reattachListeners();
  }
  
  /**
   * Re-attach listeners after DOM update
   */
  private reattachListeners(): void {
    // Clear old handlers map (DOM elements are replaced, so no need to remove)
    this.boundHandlers.clear();
    
    const nodeElements = this.svg.querySelectorAll('.node');
    
    nodeElements.forEach(el => {
      const nodeId = el.getAttribute('data-node-id');
      if (!nodeId) return;
      
      // Create bound handler for this node
      const handler = (e: Event) => {
        e.preventDefault();
        this.rotateNode(nodeId);
      };
      
      this.boundHandlers.set(nodeId, handler);
      el.addEventListener('dblclick', handler);
    });
  }
  
  /**
   * Rotate a node 90° clockwise
   */
  private rotateNode(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Rotate 90° clockwise
    const orientations: Orientation[] = [0, 90, 180, 270];
    const currentIndex = orientations.indexOf(node.orientation);
    const newIndex = (currentIndex + 1) % 4;
    const newOrientation = orientations[newIndex];
    
    node.orientation = newOrientation;
    
    const layout = extractLayout(this.nodes);
    this.callbacks.onRotate?.(node, newOrientation, layout);
  }
  
  /**
   * Clean up event listeners
   */
  destroy(): void {
    // Clear handler references
    this.boundHandlers.clear();
  }
}
