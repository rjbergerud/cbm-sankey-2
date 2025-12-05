// Node orientation type
export type Orientation = 0 | 90 | 180 | 270;

// Node shape type
export type NodeShape = 'rect' | 'arrow' | 'chevron' | 'diamond' | 'circle';

// Node interface
export interface Node {
  id: string;
  label?: string;
  x: number;
  y: number;
  orientation: Orientation;
  length?: number;
  categories?: string[];
  /** Shape of the node (default: 'rect') */
  shape?: NodeShape;
}

// Subflow for future stacked segments
export interface Subflow {
  value: number;
  className?: string;
}

// Link interface
export interface Link {
  id: string;
  source: string;
  target: string;
  value: number;
  layer?: string;
  subflows?: Subflow[];
  /** Order of this link at source node (lower = earlier in stack). Auto-assigned if not set. */
  sourceOrder?: number;
  /** Order of this link at target node (lower = earlier in stack). Auto-assigned if not set. */
  targetOrder?: number;
}

// Layout - serializable, reusable across data years
export interface Layout {
  nodes: Record<string, {
    x: number;
    y: number;
    orientation: Orientation;
    length?: number;
    shape?: NodeShape;
  }>;
  /** Link ordering at each node (optional, for user-defined link order) */
  linkOrders?: Record<string, {
    sourceOrder?: number;
    targetOrder?: number;
  }>;
}

// Graph - runtime state
export interface Graph {
  nodes: Node[];
  links: Link[];
}

// Path style options
export type PathStyle = 'bezier' | 'constantWidth';

// Easing function type
export type EasingFunction = (t: number) => number;

// Global settings
export interface SankeyOptions {
  linkThickness: number;
  linkCurvature: number;
  nodeLength: number;
  valueScale: number;
  pathStyle: PathStyle;
  /** Minimum node thickness in pixels for visibility (nodes with 0 flow still render) */
  minNodeThickness: number;
  /** Minimum node length in pixels when resizing */
  minNodeLength: number;
  /** Minimum bezier control point distance to prevent path artifacts at short distances */
  minControlPointDistance: number;
  /** Animation duration in milliseconds (0 = instant, no animation) */
  transitionDuration: number;
  /** Easing function for animations */
  transitionEasing: EasingFunction;
}

/** Built-in easing functions */
export const easings = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

// Default options
export const DEFAULT_OPTIONS: SankeyOptions = {
  linkThickness: 1,
  linkCurvature: 0.5,
  nodeLength: 20,
  valueScale: 1,
  pathStyle: 'constantWidth',
  minNodeThickness: 4,
  minNodeLength: 10,
  minControlPointDistance: 20,
  transitionDuration: 300,
  transitionEasing: easings.easeOut,
};

// Event types
export type SankeyEventType = 
  | 'nodeClick'
  | 'nodeHover'
  | 'linkClick'
  | 'linkHover'
  | 'layoutChange'
  | 'transitionStart'
  | 'transitionEnd';

export type SankeyEventCallback<T> = (data: T) => void;

// Computed node with calculated thickness
export interface ComputedNode extends Node {
  thickness: number;
  incomingValue: number;
  outgoingValue: number;
}

// Computed link with path data
export interface ComputedLink extends Link {
  sourceName: string;
  targetName: string;
  path: string;
}
