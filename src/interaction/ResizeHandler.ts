import { ComputedNode, Layout, Orientation, SankeyOptions } from '../core/types';
import { extractLayout } from '../core/Layout';

/** UI constants for resize handle appearance */
const HANDLE_CONSTANTS = {
  /** 
   * Width of the handle in pixels along the edge it sits on.
   * 8px provides a reasonable click target without obscuring the node.
   */
  HANDLE_DEPTH: 8,
  /**
   * Maximum height/width of the handle perpendicular to the edge.
   * Clamped to node thickness so handle doesn't exceed node bounds.
   */
  MAX_HANDLE_SPAN: 20,
};

/** Which side of the node the handle is on */
type HandleSide = 'start' | 'end';

export interface ResizeHandlerOptions {
  onResize: (node: ComputedNode, newLength: number) => void;
  onResizeEnd: (node: ComputedNode, layout: Layout) => void;
}

/**
 * Handles node length resizing via drag on edge handles
 */
export class ResizeHandler {
  private svg: SVGSVGElement;
  private nodes: ComputedNode[];
  private options: ResizeHandlerOptions;
  private sankeyOptions: SankeyOptions;
  private activeNode: ComputedNode | null = null;
  private activeHandleSide: HandleSide | null = null;
  private startLength: number = 0;
  private startPos: { x: number; y: number } = { x: 0, y: 0 };
  private handleElements: Map<string, { start: SVGRectElement; end: SVGRectElement }> = new Map();

  constructor(
    svg: SVGSVGElement,
    nodes: ComputedNode[],
    options: ResizeHandlerOptions,
    sankeyOptions: SankeyOptions
  ) {
    this.svg = svg;
    this.nodes = nodes;
    this.options = options;
    this.sankeyOptions = sankeyOptions;

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.createHandles();
  }

  /**
   * Create resize handles for all nodes
   */
  private createHandles(): void {
    // Remove existing handles
    this.handleElements.forEach(({ start, end }) => {
      start.remove();
      end.remove();
    });
    this.handleElements.clear();

    const nodesGroup = this.svg.querySelector('.nodes');
    if (!nodesGroup) return;

    for (const node of this.nodes) {
      const nodeGroup = nodesGroup.querySelector(`[data-node-id="${node.id}"]`);
      if (!nodeGroup) continue;

      const startHandle = this.createHandle(node, 'start');
      const endHandle = this.createHandle(node, 'end');
      nodeGroup.appendChild(startHandle);
      nodeGroup.appendChild(endHandle);
      this.handleElements.set(node.id, { start: startHandle, end: endHandle });
    }
  }

  /**
   * Create a single resize handle for a node
   */
  private createHandle(node: ComputedNode, side: HandleSide): SVGRectElement {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    handle.setAttribute('class', `resize-handle resize-handle--${side}`);
    
    this.positionHandle(handle, node, side);
    
    handle.addEventListener('mousedown', (e) => this.onMouseDown(e, node, side));
    
    return handle;
  }

  /**
   * Position the handle at the specified edge of the node
   */
  private positionHandle(handle: SVGRectElement, node: ComputedNode, side: HandleSide): void {
    const length = node.length ?? this.sankeyOptions.nodeLength;
    const thickness = Math.max(node.thickness, this.sankeyOptions.minNodeThickness);
    const handleDepth = HANDLE_CONSTANTS.HANDLE_DEPTH;
    const handleSpan = Math.min(thickness, HANDLE_CONSTANTS.MAX_HANDLE_SPAN);

    const isHorizontal = node.orientation === 0 || node.orientation === 180;
    
    let x: number, y: number, width: number, height: number;
    
    if (isHorizontal) {
      // Handles on left and right edges
      // 'start' = left edge (negative x direction from center)
      // 'end' = right edge (positive x direction from center)
      const edgeX = side === 'end'
        ? node.x + length / 2 - handleDepth / 2
        : node.x - length / 2 - handleDepth / 2;
      
      x = edgeX;
      y = node.y - handleSpan / 2;
      width = handleDepth;
      height = handleSpan;
    } else {
      // Handles on top and bottom edges
      // 'start' = top edge (negative y direction from center)
      // 'end' = bottom edge (positive y direction from center)
      const edgeY = side === 'end'
        ? node.y + length / 2 - handleDepth / 2
        : node.y - length / 2 - handleDepth / 2;
      
      x = node.x - handleSpan / 2;
      y = edgeY;
      width = handleSpan;
      height = handleDepth;
    }

    handle.setAttribute('x', String(x));
    handle.setAttribute('y', String(y));
    handle.setAttribute('width', String(width));
    handle.setAttribute('height', String(height));
  }

  private onMouseDown(e: MouseEvent, node: ComputedNode, side: HandleSide): void {
    e.preventDefault();
    e.stopPropagation();

    this.activeNode = node;
    this.activeHandleSide = side;
    this.startLength = node.length ?? this.sankeyOptions.nodeLength;
    this.startPos = this.getSVGPoint(e);

    // Add dragging class
    const nodeGroup = this.svg.querySelector(`[data-node-id="${node.id}"]`);
    nodeGroup?.classList.add('resizing');

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.activeNode || !this.activeHandleSide) return;

    const currentPos = this.getSVGPoint(e);
    const isHorizontal = this.activeNode.orientation === 0 || this.activeNode.orientation === 180;
    
    // Calculate delta in the direction of the node's length axis
    // Direction depends on which handle is being dragged
    let delta: number;
    if (isHorizontal) {
      // For horizontal nodes, dragging 'end' handle right = increase, left = decrease
      // Dragging 'start' handle left = increase, right = decrease
      const rawDelta = currentPos.x - this.startPos.x;
      delta = this.activeHandleSide === 'end' ? rawDelta : -rawDelta;
    } else {
      // For vertical nodes, dragging 'end' handle down = increase, up = decrease
      // Dragging 'start' handle up = increase, down = decrease
      const rawDelta = currentPos.y - this.startPos.y;
      delta = this.activeHandleSide === 'end' ? rawDelta : -rawDelta;
    }

    // Calculate new length, respecting minimum from options
    // Multiply delta by 2 because we're dragging one edge but the node is centered
    const newLength = Math.max(this.sankeyOptions.minNodeLength, this.startLength + delta * 2);
    
    this.options.onResize(this.activeNode, newLength);
  }

  private onMouseUp(): void {
    if (!this.activeNode) return;

    // Remove dragging class
    const nodeGroup = this.svg.querySelector(`[data-node-id="${this.activeNode.id}"]`);
    nodeGroup?.classList.remove('resizing');

    // Get updated layout
    const layout = extractLayout(this.nodes.map(n => 
      n.id === this.activeNode!.id 
        ? { ...n, length: n.length }
        : n
    ));

    this.options.onResizeEnd(this.activeNode, layout);

    this.activeNode = null;
    this.activeHandleSide = null;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  /**
   * Convert screen coordinates to SVG coordinates
   */
  private getSVGPoint(e: MouseEvent): { x: number; y: number } {
    const point = this.svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    
    const ctm = this.svg.getScreenCTM();
    if (ctm) {
      const transformed = point.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    
    return { x: e.clientX, y: e.clientY };
  }

  /**
   * Update nodes reference and recreate handles
   */
  updateNodes(nodes: ComputedNode[]): void {
    this.nodes = nodes;
    this.createHandles();
  }

  /**
   * Clean up event listeners and handles
   */
  destroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.handleElements.forEach(({ start, end }) => {
      start.remove();
      end.remove();
    });
    this.handleElements.clear();
  }
}
