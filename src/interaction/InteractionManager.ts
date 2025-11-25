import { ComputedNode, Layout, Link, Orientation, SankeyOptions } from '../core/types';
import { DragHandler, DragHandlerCallbacks } from './DragHandler';
import { RotateHandler, RotateHandlerCallbacks } from './RotateHandler';
import { ResizeHandler, ResizeHandlerOptions } from './ResizeHandler';
import { LinkOrderHandler, LinkOrderCallbacks } from './LinkOrderHandler';

export interface InteractionCallbacks {
  onDrag?: (node: ComputedNode, x: number, y: number) => void;
  onDragEnd?: (node: ComputedNode, layout: Layout) => void;
  onRotate?: (node: ComputedNode, newOrientation: Orientation, layout: Layout) => void;
  onResize?: (node: ComputedNode, newLength: number) => void;
  onResizeEnd?: (node: ComputedNode, layout: Layout) => void;
  onLinkOrderChange?: (links: Link[]) => void;
}

/**
 * Coordinates all interaction handlers (drag, rotate, resize, link ordering)
 * Provides a single interface for managing node interactions
 */
export class InteractionManager {
  private svg: SVGSVGElement;
  private dragHandler: DragHandler;
  private rotateHandler: RotateHandler;
  private resizeHandler: ResizeHandler;
  private linkOrderHandler: LinkOrderHandler | null = null;

  constructor(
    svg: SVGSVGElement,
    nodes: ComputedNode[],
    links: Link[],
    callbacks: InteractionCallbacks,
    options: SankeyOptions
  ) {
    this.svg = svg;

    // Initialize drag handler
    this.dragHandler = new DragHandler(svg, nodes, {
      onDrag: callbacks.onDrag,
      onDragEnd: callbacks.onDragEnd,
    });

    // Initialize rotate handler
    this.rotateHandler = new RotateHandler(svg, nodes, {
      onRotate: callbacks.onRotate,
    });

    // Initialize resize handler
    this.resizeHandler = new ResizeHandler(svg, nodes, {
      onResize: callbacks.onResize!,
      onResizeEnd: callbacks.onResizeEnd!,
    }, options);

    // Initialize link order handler if callback provided
    if (callbacks.onLinkOrderChange) {
      this.linkOrderHandler = new LinkOrderHandler(svg, nodes, links, {
        onOrderChange: callbacks.onLinkOrderChange,
      }, options);
    }
  }

  /**
   * Update all handlers with new node references after re-render
   */
  updateNodes(nodes: ComputedNode[], links?: Link[]): void {
    this.dragHandler.updateNodes(nodes);
    this.rotateHandler.updateNodes(nodes);
    this.resizeHandler.updateNodes(nodes);
    if (this.linkOrderHandler && links) {
      this.linkOrderHandler.updateNodes(nodes, links);
    }
  }

  /**
   * Clean up all handlers
   */
  destroy(): void {
    this.dragHandler.destroy();
    this.rotateHandler.destroy();
    this.resizeHandler.destroy();
    this.linkOrderHandler?.destroy();
  }
}
