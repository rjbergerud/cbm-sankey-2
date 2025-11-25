import { ComputedNode, SankeyOptions, Layout } from '../core/types';
import { extractLayout } from '../core/Layout';

export interface DragHandlerCallbacks {
  onDragStart?: (node: ComputedNode) => void;
  onDrag?: (node: ComputedNode, x: number, y: number) => void;
  onDragEnd?: (node: ComputedNode, layout: Layout) => void;
}

/**
 * Handles drag interactions for nodes
 */
export class DragHandler {
  private svg: SVGSVGElement;
  private nodes: ComputedNode[];
  private callbacks: DragHandlerCallbacks;
  
  private dragging: ComputedNode | null = null;
  private dragOffset = { x: 0, y: 0 };
  private hasMoved = false;  // Track if mouse actually moved (to distinguish from click)
  
  // Store handlers by nodeId for proper cleanup
  private nodeHandlers: Map<string, (e: MouseEvent) => void> = new Map();
  
  // Bound event handlers (for removal)
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  
  constructor(
    svg: SVGSVGElement,
    nodes: ComputedNode[],
    callbacks: DragHandlerCallbacks = {}
  ) {
    this.svg = svg;
    this.nodes = nodes;
    this.callbacks = callbacks;
    
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    
    this.attachListeners();
  }
  
  /**
   * Update nodes reference (after re-render)
   */
  updateNodes(nodes: ComputedNode[]): void {
    this.nodes = nodes;
    this.reattachNodeListeners();
  }
  
  /**
   * Attach event listeners to node elements
   */
  private attachListeners(): void {
    this.reattachNodeListeners();
  }
  
  /**
   * Re-attach listeners after DOM update
   */
  private reattachNodeListeners(): void {
    // DOM elements are replaced on re-render, so clear old handler refs
    this.nodeHandlers.clear();
    
    const nodeElements = this.svg.querySelectorAll('.node');
    console.log('[DragHandler] reattachNodeListeners called, found', nodeElements.length, 'nodes');
    
    nodeElements.forEach(el => {
      const nodeId = el.getAttribute('data-node-id');
      if (!nodeId) return;
      
      const handler = (e: MouseEvent) => {
        console.log('[DragHandler] mousedown on node:', nodeId);
        this.onNodeMouseDown(e, nodeId);
      };
      this.nodeHandlers.set(nodeId, handler);
      (el as SVGGElement).addEventListener('mousedown', handler);
    });
  }
  
  /**
   * Handle mouse down on a node
   */
  private onNodeMouseDown(e: MouseEvent, nodeId: string): void {
    // Don't call preventDefault() here - it blocks dblclick detection
    // Don't call stopPropagation() - let other handlers see the event
    
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    this.dragging = node;
    this.hasMoved = false;
    
    // Calculate offset from mouse to node center
    const svgPoint = this.getSVGPoint(e);
    this.dragOffset = {
      x: svgPoint.x - node.x,
      y: svgPoint.y - node.y,
    };
    
    // Add document-level listeners for drag
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }
  
  /**
   * Handle mouse move during drag
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;
    
    // Only start visual drag after actual movement
    if (!this.hasMoved) {
      this.hasMoved = true;
      // Now we can prevent default (text selection, etc.)
      e.preventDefault();
      
      // Add dragging class
      const nodeEl = this.svg.querySelector(`[data-node-id="${this.dragging.id}"]`);
      nodeEl?.classList.add('dragging');
      
      this.callbacks.onDragStart?.(this.dragging);
    }
    
    e.preventDefault();  // Prevent text selection during drag
    
    const svgPoint = this.getSVGPoint(e);
    const newX = svgPoint.x - this.dragOffset.x;
    const newY = svgPoint.y - this.dragOffset.y;
    
    // Update node position
    this.dragging.x = newX;
    this.dragging.y = newY;
    
    this.callbacks.onDrag?.(this.dragging, newX, newY);
  }
  
  /**
   * Handle mouse up (end drag)
   */
  private onMouseUp(e: MouseEvent): void {
    if (!this.dragging) return;
    
    // Remove dragging class (only if we actually dragged)
    if (this.hasMoved) {
      const nodeEl = this.svg.querySelector(`[data-node-id="${this.dragging.id}"]`);
      nodeEl?.classList.remove('dragging');
      
      // Extract layout and fire callback
      const layout = extractLayout(this.nodes);
      this.callbacks.onDragEnd?.(this.dragging, layout);
    }
    
    // Remove document listeners
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    
    this.dragging = null;
    this.hasMoved = false;
  }
  
  /**
   * Convert screen coordinates to SVG coordinates
   */
  private getSVGPoint(e: MouseEvent): { x: number; y: number } {
    const rect = this.svg.getBoundingClientRect();
    const viewBox = this.svg.viewBox.baseVal;
    
    // If no viewBox, use simple offset
    if (!viewBox || viewBox.width === 0) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    
    // Transform through viewBox
    return {
      x: ((e.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x,
      y: ((e.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y,
    };
  }
  
  /**
   * Clean up event listeners
   */
  destroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    this.nodeHandlers.clear();
  }
}
