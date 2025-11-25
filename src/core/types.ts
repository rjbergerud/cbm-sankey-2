// Node orientation type
export type Orientation = 0 | 90 | 180 | 270;

// Node interface
export interface Node {
  id: string;
  label?: string;
  x: number;
  y: number;
  orientation: Orientation;
  length?: number;
  categories?: string[];
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
}

// Layout - serializable, reusable across data years
export interface Layout {
  nodes: Record<string, {
    x: number;
    y: number;
    orientation: Orientation;
    length?: number;
  }>;
}

// Graph - runtime state
export interface Graph {
  nodes: Node[];
  links: Link[];
}

// Path style options
export type PathStyle = 'bezier' | 'constantWidth';

// Global settings
export interface SankeyOptions {
  linkThickness: number;
  linkCurvature: number;
  nodeLength: number;
  valueScale: number;
  pathStyle: PathStyle;
}

// Default options
export const DEFAULT_OPTIONS: SankeyOptions = {
  linkThickness: 1,
  linkCurvature: 0.5,
  nodeLength: 20,
  valueScale: 1,
  pathStyle: 'constantWidth',
};

// Event types
export type SankeyEventType = 
  | 'nodeClick'
  | 'nodeHover'
  | 'linkClick'
  | 'linkHover'
  | 'layoutChange';

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
