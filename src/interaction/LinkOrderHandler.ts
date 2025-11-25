import { ComputedNode, Link, SankeyOptions, Orientation } from '../core/types';

export interface LinkOrderCallbacks {
  /** Called when link order changes (for re-rendering) */
  onOrderChange: (links: Link[]) => void;
}

interface HandleData {
  linkId: string;
  nodeId: string;
  side: 'source' | 'target';
  element: SVGCircleElement;
}

/**
 * Handles drag interactions for reordering links at node edges
 * Shows small drag handles on node edges that can be dragged to reorder
 */
export class LinkOrderHandler {
  private svg: SVGSVGElement;
  private nodes: ComputedNode[];
  private links: Link[];
  private callbacks: LinkOrderCallbacks;
  private options: SankeyOptions;
  
  private handles: HandleData[] = [];
  private handlesGroup: SVGGElement | null = null;
  
  // Drag state
  private dragging: HandleData | null = null;
  private dragStartY = 0;
  private siblingHandles: HandleData[] = [];
  
  // Bound event handlers
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  
  constructor(
    svg: SVGSVGElement,
    nodes: ComputedNode[],
    links: Link[],
    callbacks: LinkOrderCallbacks,
    options: SankeyOptions
  ) {
    this.svg = svg;
    this.nodes = nodes;
    this.links = links;
    this.callbacks = callbacks;
    this.options = options;
    
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    
    this.createHandles();
    this.attachGlobalListeners();
  }
  
  /**
   * Update references after re-render
   */
  updateNodes(nodes: ComputedNode[], links: Link[]): void {
    this.nodes = nodes;
    this.links = links;
    this.destroyHandles();
    this.createHandles();
  }
  
  /**
   * Create drag handles for all link attachment points
   */
  private createHandles(): void {
    // Create group for handles
    this.handlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.handlesGroup.classList.add('link-order-handles');
    this.svg.appendChild(this.handlesGroup);
    
    // For each node, create handles for its links
    for (const node of this.nodes) {
      // Outgoing links (source side)
      const outgoing = this.links.filter(l => l.source === node.id);
      this.createNodeHandles(node, outgoing, 'source');
      
      // Incoming links (target side)
      const incoming = this.links.filter(l => l.target === node.id);
      this.createNodeHandles(node, incoming, 'target');
    }
  }
  
  /**
   * Create handles for links at one side of a node
   */
  private createNodeHandles(
    node: ComputedNode,
    nodeLinks: Link[],
    side: 'source' | 'target'
  ): void {
    if (nodeLinks.length < 2) return; // No reordering needed for 0 or 1 link
    
    const totalValue = side === 'source' ? node.outgoingValue : node.incomingValue;
    if (totalValue === 0) return;
    
    // Sort links by their current order
    const sortedLinks = [...nodeLinks].sort((a, b) => {
      const orderProp = side === 'source' ? 'sourceOrder' : 'targetOrder';
      const orderA = a[orderProp] ?? Infinity;
      const orderB = b[orderProp] ?? Infinity;
      if (orderA === Infinity && orderB === Infinity) return 0;
      return orderA - orderB;
    });
    
    // Calculate positions and create handles
    let cumulative = 0;
    for (const link of sortedLinks) {
      const proportion = link.value / totalValue;
      const offset = cumulative + proportion / 2;
      cumulative += proportion;
      
      const pos = this.getHandlePosition(node, side, offset);
      const handle = this.createHandle(pos.x, pos.y, link.id, node.id, side);
      this.handles.push(handle);
    }
  }
  
  /**
   * Get position for a handle based on node orientation and offset
   * This mirrors the logic in PathGenerator.getAttachmentPoint
   */
  private getHandlePosition(
    node: ComputedNode,
    side: 'source' | 'target',
    offset: number
  ): { x: number; y: number } {
    const length = node.length ?? this.options.nodeLength;
    const nodeThickness = Math.max(node.thickness, this.options.minNodeThickness);
    
    const isHorizontal = node.orientation === 0 || node.orientation === 180;
    const width = isHorizontal ? length : nodeThickness;
    const height = isHorizontal ? nodeThickness : length;
    
    // Determine which physical side based on orientation and source/target
    let edgeSide: 'left' | 'right' | 'top' | 'bottom';
    
    if (node.orientation === 0) {
      edgeSide = side === 'target' ? 'left' : 'right';
    } else if (node.orientation === 90) {
      edgeSide = side === 'target' ? 'top' : 'bottom';
    } else if (node.orientation === 180) {
      edgeSide = side === 'target' ? 'right' : 'left';
    } else { // 270
      edgeSide = side === 'target' ? 'bottom' : 'top';
    }
    
    // Node bounding box
    const left = node.x - width / 2;
    const right = node.x + width / 2;
    const top = node.y - height / 2;
    const bottom = node.y + height / 2;
    
    // Handle offset away from node edge
    const handleOffset = 8;
    
    let x: number, y: number;
    
    switch (edgeSide) {
      case 'left':
        x = left - handleOffset;
        y = top + height * offset;
        break;
      case 'right':
        x = right + handleOffset;
        y = top + height * offset;
        break;
      case 'top':
        x = left + width * offset;
        y = top - handleOffset;
        break;
      case 'bottom':
        x = left + width * offset;
        y = bottom + handleOffset;
        break;
    }
    
    return { x, y };
  }
  
  /**
   * Create a single handle element
   */
  private createHandle(
    x: number,
    y: number,
    linkId: string,
    nodeId: string,
    side: 'source' | 'target'
  ): HandleData {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', String(x));
    handle.setAttribute('cy', String(y));
    handle.setAttribute('r', '5');
    handle.classList.add('link-order-handle');
    handle.style.fill = '#666';
    handle.style.stroke = '#333';
    handle.style.strokeWidth = '1';
    handle.style.cursor = 'grab';
    handle.style.opacity = '0';
    handle.style.transition = 'opacity 0.15s';
    
    const data: HandleData = { linkId, nodeId, side, element: handle };
    
    // Show on hover
    handle.addEventListener('mouseenter', () => {
      // Show all sibling handles (same node, same side)
      this.showSiblingHandles(nodeId, side);
    });
    
    handle.addEventListener('mouseleave', () => {
      if (!this.dragging) {
        this.hideSiblingHandles(nodeId, side);
      }
    });
    
    // Start drag
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.startDrag(data, e);
    });
    
    this.handlesGroup!.appendChild(handle);
    return data;
  }
  
  /**
   * Show handles for all links at the same node side
   */
  private showSiblingHandles(nodeId: string, side: 'source' | 'target'): void {
    for (const h of this.handles) {
      if (h.nodeId === nodeId && h.side === side) {
        h.element.style.opacity = '1';
      }
    }
  }
  
  /**
   * Hide handles for all links at the same node side
   */
  private hideSiblingHandles(nodeId: string, side: 'source' | 'target'): void {
    for (const h of this.handles) {
      if (h.nodeId === nodeId && h.side === side) {
        h.element.style.opacity = '0';
      }
    }
  }
  
  /**
   * Start dragging a handle
   */
  private startDrag(data: HandleData, e: MouseEvent): void {
    this.dragging = data;
    this.dragStartY = e.clientY;
    data.element.style.cursor = 'grabbing';
    data.element.style.fill = '#2196F3';
    
    // Collect sibling handles for swap detection
    this.siblingHandles = this.handles.filter(
      h => h.nodeId === data.nodeId && h.side === data.side && h.linkId !== data.linkId
    );
  }
  
  /**
   * Handle mouse move during drag
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;
    
    const node = this.nodes.find(n => n.id === this.dragging!.nodeId);
    if (!node) return;
    
    // Get direction based on node orientation
    const { inSide, outSide } = getAttachmentSides(node.orientation);
    const actualSide = this.dragging.side === 'source' ? outSide : inSide;
    const isVertical = actualSide === 'left' || actualSide === 'right';
    
    // Update handle position
    const rect = this.svg.getBoundingClientRect();
    if (isVertical) {
      const y = e.clientY - rect.top;
      this.dragging.element.setAttribute('cy', String(y));
    } else {
      const x = e.clientX - rect.left;
      this.dragging.element.setAttribute('cx', String(x));
    }
    
    // Check for swap with sibling
    this.checkForSwap(e, isVertical);
  }
  
  /**
   * Check if dragged handle should swap with a sibling
   */
  private checkForSwap(e: MouseEvent, isVertical: boolean): void {
    if (!this.dragging) return;
    
    const rect = this.svg.getBoundingClientRect();
    const dragPos = isVertical 
      ? e.clientY - rect.top 
      : e.clientX - rect.left;
    
    for (const sibling of this.siblingHandles) {
      const siblingPos = isVertical
        ? parseFloat(sibling.element.getAttribute('cy') || '0')
        : parseFloat(sibling.element.getAttribute('cx') || '0');
      
      const distance = Math.abs(dragPos - siblingPos);
      
      if (distance < 15) {
        // Swap orders
        this.swapLinkOrders(this.dragging.linkId, sibling.linkId);
        return;
      }
    }
  }
  
  /**
   * Swap the order of two links
   */
  private swapLinkOrders(linkIdA: string, linkIdB: string): void {
    const linkA = this.links.find(l => l.id === linkIdA);
    const linkB = this.links.find(l => l.id === linkIdB);
    if (!linkA || !linkB) return;
    
    const side = this.dragging!.side;
    const orderProp = side === 'source' ? 'sourceOrder' : 'targetOrder';
    
    // Initialize orders if not set
    this.ensureOrdersInitialized(this.dragging!.nodeId, side);
    
    // Swap
    const tempOrder = linkA[orderProp]!;
    linkA[orderProp] = linkB[orderProp];
    linkB[orderProp] = tempOrder;
    
    // Notify for re-render
    this.callbacks.onOrderChange(this.links);
  }
  
  /**
   * Ensure all links at a node side have order values
   */
  private ensureOrdersInitialized(nodeId: string, side: 'source' | 'target'): void {
    const orderProp = side === 'source' ? 'sourceOrder' : 'targetOrder';
    const nodeLinks = side === 'source'
      ? this.links.filter(l => l.source === nodeId)
      : this.links.filter(l => l.target === nodeId);
    
    // Check if any need initialization
    const needsInit = nodeLinks.some(l => l[orderProp] === undefined);
    if (!needsInit) return;
    
    // Initialize based on current array order
    nodeLinks.forEach((link, i) => {
      if (link[orderProp] === undefined) {
        link[orderProp] = i;
      }
    });
  }
  
  /**
   * Handle mouse up - end drag
   */
  private onMouseUp(_e: MouseEvent): void {
    if (!this.dragging) return;
    
    const nodeId = this.dragging.nodeId;
    const side = this.dragging.side;
    
    this.dragging.element.style.cursor = 'grab';
    this.dragging.element.style.fill = '#666';
    this.dragging = null;
    this.siblingHandles = [];
    
    // Hide handles
    setTimeout(() => {
      this.hideSiblingHandles(nodeId, side);
    }, 200);
  }
  
  private attachGlobalListeners(): void {
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }
  
  private destroyHandles(): void {
    if (this.handlesGroup) {
      this.handlesGroup.remove();
      this.handlesGroup = null;
    }
    this.handles = [];
  }
  
  destroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    this.destroyHandles();
  }
}

/**
 * Get which sides of the node are input and output based on orientation
 */
function getAttachmentSides(orientation: Orientation): { inSide: 'left' | 'right' | 'top' | 'bottom'; outSide: 'left' | 'right' | 'top' | 'bottom' } {
  switch (orientation) {
    case 0:   return { inSide: 'left', outSide: 'right' };
    case 90:  return { inSide: 'top', outSide: 'bottom' };
    case 180: return { inSide: 'right', outSide: 'left' };
    case 270: return { inSide: 'bottom', outSide: 'top' };
  }
}
