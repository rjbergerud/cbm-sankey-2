import { ComputedNode, Link, ComputedLink, SankeyOptions, PathStyle } from '../core/types';

// ============================================================================
// Path Style Types
// ============================================================================

interface AttachmentPoint {
  x: number;
  y: number;
  dx: number;  // outward direction from node
  dy: number;
  thickness: number;
}

// ============================================================================
// Shared Utilities
// ============================================================================

/**
 * Get the exit/entry point for a node based on its orientation
 */
function getAttachmentPoint(
  node: ComputedNode,
  side: 'in' | 'out',
  offset: number,
  linkThickness: number,
  options: SankeyOptions
): AttachmentPoint {
  const length = node.length ?? options.nodeLength;
  const nodeThickness = Math.max(node.thickness, options.minNodeThickness);
  
  const isHorizontal = node.orientation === 0 || node.orientation === 180;
  const width = isHorizontal ? length : nodeThickness;
  const height = isHorizontal ? nodeThickness : length;
  
  // Determine which physical side based on orientation and in/out
  let edgeSide: 'left' | 'right' | 'top' | 'bottom';
  
  if (node.orientation === 0) {
    edgeSide = side === 'in' ? 'left' : 'right';
  } else if (node.orientation === 90) {
    edgeSide = side === 'in' ? 'top' : 'bottom';
  } else if (node.orientation === 180) {
    edgeSide = side === 'in' ? 'right' : 'left';
  } else { // 270
    edgeSide = side === 'in' ? 'bottom' : 'top';
  }
  
  // Node bounding box
  const left = node.x - width / 2;
  const right = node.x + width / 2;
  const top = node.y - height / 2;
  const bottom = node.y + height / 2;
  
  let x: number, y: number, dx: number, dy: number;
  
  switch (edgeSide) {
    case 'left':
      x = left;
      y = top + height * offset;
      dx = -1;
      dy = 0;
      break;
    case 'right':
      x = right;
      y = top + height * offset;
      dx = 1;
      dy = 0;
      break;
    case 'top':
      x = left + width * offset;
      y = top;
      dx = 0;
      dy = -1;
      break;
    case 'bottom':
      x = left + width * offset;
      y = bottom;
      dx = 0;
      dy = 1;
      break;
  }
  
  return { x, y, dx, dy, thickness: linkThickness };
}

// ============================================================================
// STYLE 1: Bezier Ribbon (original)
// Simple 4-corner bezier - fast but width varies along curve
// ============================================================================

/**
 * Generate a filled ribbon path using simple bezier curves
 * Width may vary along the path (pinches at curves)
 */
function generateBezierPath(
  source: AttachmentPoint,
  target: AttachmentPoint,
  curvature: number,
  minCtrlDist: number
): string {
  const srcHalf = source.thickness / 2;
  const tgtHalf = target.thickness / 2;
  
  // Perpendicular vectors (rotate direction 90 degrees)
  const srcPerpX = source.dy;
  const srcPerpY = -source.dx;
  const tgtPerpX = target.dy;
  const tgtPerpY = -target.dx;
  
  // Four corners of the ribbon
  const s0x = source.x + srcPerpX * srcHalf;
  const s0y = source.y + srcPerpY * srcHalf;
  const s1x = source.x - srcPerpX * srcHalf;
  const s1y = source.y - srcPerpY * srcHalf;
  
  const t0x = target.x + tgtPerpX * tgtHalf;
  const t0y = target.y + tgtPerpY * tgtHalf;
  const t1x = target.x - tgtPerpX * tgtHalf;
  const t1y = target.y - tgtPerpY * tgtHalf;
  
  // Control point distance - use minimum to prevent path artifacts when nodes are close
  const dist = Math.sqrt((target.x - source.x) ** 2 + (target.y - source.y) ** 2);
  const ctrlDist = Math.max(dist * curvature, minCtrlDist);
  
  // Control points
  const sc0x = s0x + source.dx * ctrlDist;
  const sc0y = s0y + source.dy * ctrlDist;
  const sc1x = s1x + source.dx * ctrlDist;
  const sc1y = s1y + source.dy * ctrlDist;
  const tc0x = t0x + target.dx * ctrlDist;
  const tc0y = t0y + target.dy * ctrlDist;
  const tc1x = t1x + target.dx * ctrlDist;
  const tc1y = t1y + target.dy * ctrlDist;
  
  return [
    `M ${s0x} ${s0y}`,
    `C ${sc0x} ${sc0y}, ${tc0x} ${tc0y}, ${t0x} ${t0y}`,
    `L ${t1x} ${t1y}`,
    `C ${tc1x} ${tc1y}, ${sc1x} ${sc1y}, ${s1x} ${s1y}`,
    `Z`
  ].join(' ');
}

// ============================================================================
// STYLE 2: Constant Width Path
// Samples centerline bezier and offsets perpendicular at each point
// ============================================================================

interface Point {
  x: number;
  y: number;
}

/**
 * Evaluate a cubic bezier at parameter t (0-1)
 */
function bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/**
 * Get the derivative (tangent) of a cubic bezier at parameter t
 */
function bezierTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  
  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

/**
 * Normalize a vector
 */
function normalize(v: Point): Point {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Get perpendicular vector (rotated 90 degrees counterclockwise)
 */
function perpendicular(v: Point): Point {
  return { x: -v.y, y: v.x };
}

/**
 * Generate a constant-width path by sampling a centerline bezier
 * and offsetting perpendicular at each sample point.
 * Uses smooth quadratic curves for better visual quality.
 * 
 * @param samples Number of points to sample along the centerline. Higher = smoother but more path data.
 *                64 is a good balance for most cases.
 */
function generateConstantWidthPath(
  source: AttachmentPoint,
  target: AttachmentPoint,
  curvature: number,
  minCtrlDist: number,
  samples: number = 64
): string {
  const thickness = (source.thickness + target.thickness) / 2;
  const halfWidth = thickness / 2;
  
  // Define centerline bezier control points
  // Use minimum control distance to prevent artifacts when nodes are close together
  const dist = Math.sqrt((target.x - source.x) ** 2 + (target.y - source.y) ** 2);
  const ctrlDist = Math.max(dist * curvature, minCtrlDist);
  
  const p0: Point = { x: source.x, y: source.y };
  const p1: Point = { x: source.x + source.dx * ctrlDist, y: source.y + source.dy * ctrlDist };
  const p2: Point = { x: target.x + target.dx * ctrlDist, y: target.y + target.dy * ctrlDist };
  const p3: Point = { x: target.x, y: target.y };
  
  // Sample points along the centerline
  const leftEdge: Point[] = [];
  const rightEdge: Point[] = [];
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = bezierPoint(p0, p1, p2, p3, t);
    const tangent = normalize(bezierTangent(p0, p1, p2, p3, t));
    const perp = perpendicular(tangent);
    
    leftEdge.push({
      x: pt.x + perp.x * halfWidth,
      y: pt.y + perp.y * halfWidth,
    });
    rightEdge.push({
      x: pt.x - perp.x * halfWidth,
      y: pt.y - perp.y * halfWidth,
    });
  }
  
  // Build smooth path using quadratic bezier curves through the sampled points
  const pathParts: string[] = [];
  
  // Start at first left point
  pathParts.push(`M ${leftEdge[0].x.toFixed(2)} ${leftEdge[0].y.toFixed(2)}`);
  
  // Smooth curve along left edge using Catmull-Rom style quadratics
  for (let i = 1; i < leftEdge.length; i++) {
    const prev = leftEdge[i - 1];
    const curr = leftEdge[i];
    
    if (i === 1) {
      // First segment: simple line or quadratic
      pathParts.push(`L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`);
    } else {
      // Use quadratic curve with control point at previous point
      // This creates smooth transitions
      const cpx = prev.x;
      const cpy = prev.y;
      pathParts.push(`Q ${cpx.toFixed(2)} ${cpy.toFixed(2)} ${((prev.x + curr.x) / 2).toFixed(2)} ${((prev.y + curr.y) / 2).toFixed(2)}`);
    }
  }
  // Final segment to exact end point
  const lastLeft = leftEdge[leftEdge.length - 1];
  pathParts.push(`L ${lastLeft.x.toFixed(2)} ${lastLeft.y.toFixed(2)}`);
  
  // Line across the end to right edge
  const lastRight = rightEdge[rightEdge.length - 1];
  pathParts.push(`L ${lastRight.x.toFixed(2)} ${lastRight.y.toFixed(2)}`);
  
  // Smooth curve back along right edge
  for (let i = rightEdge.length - 2; i >= 0; i--) {
    const prev = rightEdge[i + 1];
    const curr = rightEdge[i];
    
    if (i === rightEdge.length - 2) {
      pathParts.push(`L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`);
    } else {
      const cpx = prev.x;
      const cpy = prev.y;
      pathParts.push(`Q ${cpx.toFixed(2)} ${cpy.toFixed(2)} ${((prev.x + curr.x) / 2).toFixed(2)} ${((prev.y + curr.y) / 2).toFixed(2)}`);
    }
  }
  // Final segment to exact start point
  const firstRight = rightEdge[0];
  pathParts.push(`L ${firstRight.x.toFixed(2)} ${firstRight.y.toFixed(2)}`);
  
  // Close path
  pathParts.push('Z');
  
  return pathParts.join(' ');
}

// ============================================================================
// Path Generator Selection
// ============================================================================

/**
 * Generate a link path using the specified style
 */
function generateLinkPath(
  source: AttachmentPoint,
  target: AttachmentPoint,
  curvature: number,
  minCtrlDist: number,
  style: PathStyle = 'constantWidth'
): string {
  switch (style) {
    case 'bezier':
      return generateBezierPath(source, target, curvature, minCtrlDist);
    case 'constantWidth':
      return generateConstantWidthPath(source, target, curvature, minCtrlDist);
    default:
      return generateConstantWidthPath(source, target, curvature, minCtrlDist);
  }
}

// ============================================================================
// Link Offset Calculation
// ============================================================================

/**
 * Calculate link offsets for stacking on a node edge
 */
function calculateLinkOffsets(
  links: Link[],
  nodeId: string,
  side: 'in' | 'out',
  totalValue: number,
  options: SankeyOptions
): Map<string, { offset: number; thickness: number }> {
  const offsets = new Map<string, { offset: number; thickness: number }>();
  
  const relevantLinks = side === 'out' 
    ? links.filter(l => l.source === nodeId)
    : links.filter(l => l.target === nodeId);
  
  if (totalValue === 0) {
    return offsets;
  }
  
  let cumulative = 0;
  for (const link of relevantLinks) {
    const proportion = link.value / totalValue;
    const offset = cumulative + proportion / 2;
    const pixelThickness = link.value * options.valueScale;
    offsets.set(link.id, { offset, thickness: pixelThickness });
    cumulative += proportion;
  }
  
  return offsets;
}

/**
 * Compute all link paths
 */
export function computeLinkPaths(
  nodes: ComputedNode[],
  links: Link[],
  options: SankeyOptions
): ComputedLink[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Pre-calculate offsets for all nodes
  const outOffsets = new Map<string, Map<string, { offset: number; thickness: number }>>();
  const inOffsets = new Map<string, Map<string, { offset: number; thickness: number }>>();
  
  for (const node of nodes) {
    outOffsets.set(node.id, calculateLinkOffsets(links, node.id, 'out', node.outgoingValue, options));
    inOffsets.set(node.id, calculateLinkOffsets(links, node.id, 'in', node.incomingValue, options));
  }
  
  return links.map(link => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);
    
    if (!sourceNode || !targetNode) {
      throw new Error(`Link "${link.id}" references missing node`);
    }
    
    const sourceData = outOffsets.get(link.source)?.get(link.id);
    const targetData = inOffsets.get(link.target)?.get(link.id);
    
    const sourceOffset = sourceData?.offset ?? 0.5;
    const targetOffset = targetData?.offset ?? 0.5;
    const linkThickness = link.value * options.valueScale;
    
    const source = getAttachmentPoint(sourceNode, 'out', sourceOffset, linkThickness, options);
    const target = getAttachmentPoint(targetNode, 'in', targetOffset, linkThickness, options);
    
    const path = generateLinkPath(
      source,
      target,
      options.linkCurvature,
      options.minControlPointDistance,
      options.pathStyle
    );
    
    return {
      ...link,
      sourceName: sourceNode.label ?? sourceNode.id,
      targetName: targetNode.label ?? targetNode.id,
      path,
    };
  });
}
