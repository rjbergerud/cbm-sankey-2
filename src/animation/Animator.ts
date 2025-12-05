import { interpolate, interpolateNumber } from 'd3-interpolate';
import { ComputedNode, ComputedLink, SankeyOptions, EasingFunction, NodeShape } from '../core/types';
import { toClassName } from '../core/Graph';
import { getShapeOverlayPath, getShapeInset } from '../render/SVGRenderer';

export interface AnimationState {
  nodes: Map<string, { thickness: number }>;
  links: Map<string, { path: string }>;
}

export interface AnimatorCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Handles animated transitions between diagram states
 */
export class Animator {
  private svg: SVGSVGElement;
  private options: SankeyOptions;
  private animationId: number | null = null;
  private callbacks: AnimatorCallbacks;

  constructor(svg: SVGSVGElement, options: SankeyOptions, callbacks: AnimatorCallbacks = {}) {
    this.svg = svg;
    this.options = options;
    this.callbacks = callbacks;
  }

  /**
   * Update options (e.g., if duration changes)
   */
  updateOptions(options: SankeyOptions): void {
    this.options = options;
  }

  /**
   * Cancel any running animation
   */
  cancel(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Check if animation is currently running
   */
  isAnimating(): boolean {
    return this.animationId !== null;
  }

  /**
   * Capture current state from DOM for animation starting point
   */
  captureState(): AnimationState {
    const nodes = new Map<string, { thickness: number }>();
    const links = new Map<string, { path: string }>();

    // Capture node thicknesses from node-base rect elements
    const nodeElements = this.svg.querySelectorAll('.node');
    nodeElements.forEach(el => {
      const nodeId = el.getAttribute('data-node-id');
      const rect = el.querySelector('.node-base') as SVGRectElement;
      if (nodeId && rect) {
        const orientation = el.getAttribute('data-orientation');
        const isHorizontal = orientation === '0' || orientation === '180';
        const thickness = isHorizontal 
          ? parseFloat(rect.getAttribute('height') || '0')
          : parseFloat(rect.getAttribute('width') || '0');
        nodes.set(nodeId, { thickness });
      }
    });

    // Capture link paths
    const linkElements = this.svg.querySelectorAll('.link');
    linkElements.forEach(el => {
      const linkId = el.getAttribute('data-link-id');
      const path = el.getAttribute('d');
      if (linkId && path) {
        links.set(linkId, { path });
      }
    });

    return { nodes, links };
  }

  /**
   * Animate from current DOM state to new computed state
   */
  animateTo(
    targetNodes: ComputedNode[],
    targetLinks: ComputedLink[],
    fromState?: AnimationState
  ): Promise<void> {
    return new Promise((resolve) => {
      // Cancel any existing animation
      this.cancel();

      const duration = this.options.transitionDuration;
      const easing = this.options.transitionEasing;

      // If no duration, just apply immediately
      if (duration <= 0) {
        this.applyFinalState(targetNodes, targetLinks);
        resolve();
        return;
      }

      // Capture starting state if not provided
      const startState = fromState ?? this.captureState();

      // Build interpolators
      const nodeInterpolators = this.buildNodeInterpolators(startState, targetNodes);
      const linkInterpolators = this.buildLinkInterpolators(startState, targetLinks);

      // Emit start event
      this.callbacks.onStart?.();

      const startTime = performance.now();

      const tick = () => {
        const elapsed = performance.now() - startTime;
        const rawT = Math.min(elapsed / duration, 1);
        const t = easing(rawT);

        // Interpolate nodes
        this.applyNodeFrame(nodeInterpolators, t, targetNodes);

        // Interpolate links
        this.applyLinkFrame(linkInterpolators, t);

        if (rawT < 1) {
          this.animationId = requestAnimationFrame(tick);
        } else {
          this.animationId = null;
          this.callbacks.onEnd?.();
          resolve();
        }
      };

      this.animationId = requestAnimationFrame(tick);
    });
  }

  /**
   * Build interpolators for node thicknesses
   */
  private buildNodeInterpolators(
    startState: AnimationState,
    targetNodes: ComputedNode[]
  ): Map<string, (t: number) => number> {
    const interpolators = new Map<string, (t: number) => number>();

    for (const node of targetNodes) {
      const startThickness = startState.nodes.get(node.id)?.thickness 
        ?? this.options.minNodeThickness;
      const endThickness = Math.max(node.thickness, this.options.minNodeThickness);
      interpolators.set(node.id, interpolateNumber(startThickness, endThickness));
    }

    return interpolators;
  }

  /**
   * Build interpolators for link paths
   */
  private buildLinkInterpolators(
    startState: AnimationState,
    targetLinks: ComputedLink[]
  ): Map<string, (t: number) => string> {
    const interpolators = new Map<string, (t: number) => string>();

    for (const link of targetLinks) {
      const startPath = startState.links.get(link.id)?.path;
      const endPath = link.path;

      if (startPath && this.arePathsCompatible(startPath, endPath)) {
        // Paths have same structure, can interpolate
        interpolators.set(link.id, interpolate(startPath, endPath));
      } else {
        // New link or incompatible paths - just use end state
        // Could fade in, but for now just snap
        interpolators.set(link.id, () => endPath);
      }
    }

    return interpolators;
  }

  /**
   * Check if two paths have compatible structure for interpolation
   * d3-interpolate works best when paths have same number of segments
   */
  private arePathsCompatible(pathA: string, pathB: string): boolean {
    // Simple heuristic: count path commands
    const countCommands = (p: string) => (p.match(/[MLCQAZHVS]/gi) || []).length;
    return countCommands(pathA) === countCommands(pathB);
  }

  /**
   * Apply interpolated node state for current frame
   */
  private applyNodeFrame(
    interpolators: Map<string, (t: number) => number>,
    t: number,
    targetNodes: ComputedNode[]
  ): void {
    const nodesGroup = this.svg.querySelector('.nodes');
    if (!nodesGroup) return;

    for (const node of targetNodes) {
      const interp = interpolators.get(node.id);
      if (!interp) continue;

      const thickness = interp(t);
      const nodeGroup = nodesGroup.querySelector(`[data-node-id="${node.id}"]`) as SVGGElement;
      if (!nodeGroup) continue;
      
      const baseRect = nodeGroup.querySelector('.node-base') as SVGRectElement;
      if (!baseRect) continue;

      const length = node.length ?? this.options.nodeLength;
      const isHorizontal = node.orientation === 0 || node.orientation === 180;
      const width = isHorizontal ? length : thickness;
      const height = isHorizontal ? thickness : length;

      // Update base rectangle
      baseRect.setAttribute('x', String(node.x - width / 2));
      baseRect.setAttribute('y', String(node.y - height / 2));
      baseRect.setAttribute('width', String(width));
      baseRect.setAttribute('height', String(height));
      
      // Update shape overlay if present
      const shapeOverlay = nodeGroup.querySelector('.node-shape-overlay');
      if (shapeOverlay) {
        const shape = (node.shape ?? 'rect') as NodeShape;
        if (shape === 'circle') {
          // Update ellipse attributes
          const inset = getShapeInset(shape, width, height);
          shapeOverlay.setAttribute('cx', String(node.x));
          shapeOverlay.setAttribute('cy', String(node.y));
          shapeOverlay.setAttribute('rx', String((width / 2) - inset));
          shapeOverlay.setAttribute('ry', String((height / 2) - inset));
        } else {
          // Update path 'd' attribute
          const d = getShapeOverlayPath(shape, node.x, node.y, width, height, node.orientation);
          if (d) {
            shapeOverlay.setAttribute('d', d);
          }
        }
      }
    }
  }

  /**
   * Apply interpolated link state for current frame
   */
  private applyLinkFrame(
    interpolators: Map<string, (t: number) => string>,
    t: number
  ): void {
    const linksGroup = this.svg.querySelector('.links');
    if (!linksGroup) return;

    interpolators.forEach((interp, linkId) => {
      const path = linksGroup.querySelector(`[data-link-id="${linkId}"]`);
      if (path) {
        path.setAttribute('d', interp(t));
      }
    });
  }

  /**
   * Apply final state without animation (for duration=0 or end of animation)
   */
  private applyFinalState(nodes: ComputedNode[], links: ComputedLink[]): void {
    const nodesGroup = this.svg.querySelector('.nodes');
    const linksGroup = this.svg.querySelector('.links');

    if (nodesGroup) {
      for (const node of nodes) {
        const nodeGroup = nodesGroup.querySelector(`[data-node-id="${node.id}"]`) as SVGGElement;
        if (!nodeGroup) continue;
        
        const baseRect = nodeGroup.querySelector('.node-base') as SVGRectElement;
        if (!baseRect) continue;

        const thickness = Math.max(node.thickness, this.options.minNodeThickness);
        const length = node.length ?? this.options.nodeLength;
        const isHorizontal = node.orientation === 0 || node.orientation === 180;
        const width = isHorizontal ? length : thickness;
        const height = isHorizontal ? thickness : length;

        // Update base rectangle
        baseRect.setAttribute('x', String(node.x - width / 2));
        baseRect.setAttribute('y', String(node.y - height / 2));
        baseRect.setAttribute('width', String(width));
        baseRect.setAttribute('height', String(height));
        
        // Update shape overlay if present
        const shapeOverlay = nodeGroup.querySelector('.node-shape-overlay');
        if (shapeOverlay) {
          const shape = (node.shape ?? 'rect') as NodeShape;
          if (shape === 'circle') {
            // Update ellipse attributes
            const inset = getShapeInset(shape, width, height);
            shapeOverlay.setAttribute('cx', String(node.x));
            shapeOverlay.setAttribute('cy', String(node.y));
            shapeOverlay.setAttribute('rx', String((width / 2) - inset));
            shapeOverlay.setAttribute('ry', String((height / 2) - inset));
          } else {
            // Update path 'd' attribute
            const d = getShapeOverlayPath(shape, node.x, node.y, width, height, node.orientation);
            if (d) {
              shapeOverlay.setAttribute('d', d);
            }
          }
        }
      }
    }

    if (linksGroup) {
      for (const link of links) {
        const path = linksGroup.querySelector(`[data-link-id="${link.id}"]`);
        if (path) {
          path.setAttribute('d', link.path);
        }
      }
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.cancel();
  }
}
