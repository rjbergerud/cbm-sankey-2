import { ComputedNode, ComputedLink, SankeyOptions, NodeShape } from '../core/types';
import { toClassName } from '../core/Graph';

/**
 * Calculate the inset depth for shaped nodes (how much the shape is inset from edges)
 * This leaves room for the base rectangle to show where links attach
 */
function getShapeInset(shape: NodeShape, width: number, height: number): number {
  const minDim = Math.min(width, height);
  switch (shape) {
    case 'arrow':
      return minDim * 0.4; // Match the tipDepth
    case 'chevron':
      return minDim * 0.35; // Match the tipDepth
    case 'diamond':
      return Math.min(width, height) * 0.5; // Diamond extends to edges
    case 'circle':
      return Math.min(width, height) * 0.15; // Small inset for circles
    default:
      return 0;
  }
}

/**
 * Generate SVG path for different node shapes (as overlay, inset from base rectangle)
 */
function createNodeShapeOverlay(
  shape: NodeShape,
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: number
): SVGElement | null {
  const ns = 'http://www.w3.org/2000/svg';
  
  // For rect, no overlay needed
  if (shape === 'rect') {
    return null;
  }
  
  const inset = getShapeInset(shape, width, height);
  const hw = width / 2;
  const hh = height / 2;
  
  switch (shape) {
    case 'arrow': {
      // Arrow overlay - inset from both ends so base rect shows
      const path = document.createElementNS(ns, 'path');
      const tipDepth = inset;
      
      let d: string;
      if (orientation === 0) {
        // Pointing right - inset from left edge, tip on right
        d = `M ${x - hw + inset} ${y - hh} L ${x + hw - tipDepth} ${y - hh} L ${x + hw} ${y} L ${x + hw - tipDepth} ${y + hh} L ${x - hw + inset} ${y + hh} Z`;
      } else if (orientation === 180) {
        // Pointing left - inset from right edge, tip on left
        d = `M ${x + hw - inset} ${y - hh} L ${x - hw + tipDepth} ${y - hh} L ${x - hw} ${y} L ${x - hw + tipDepth} ${y + hh} L ${x + hw - inset} ${y + hh} Z`;
      } else if (orientation === 90) {
        // Pointing down - inset from top, tip on bottom
        d = `M ${x - hw} ${y - hh + inset} L ${x + hw} ${y - hh + inset} L ${x + hw} ${y + hh - tipDepth} L ${x} ${y + hh} L ${x - hw} ${y + hh - tipDepth} Z`;
      } else {
        // Pointing up (270) - inset from bottom, tip on top
        d = `M ${x - hw} ${y + hh - inset} L ${x + hw} ${y + hh - inset} L ${x + hw} ${y - hh + tipDepth} L ${x} ${y - hh} L ${x - hw} ${y - hh + tipDepth} Z`;
      }
      path.setAttribute('d', d);
      return path;
    }
    
    case 'chevron': {
      // Chevron overlay - inset from both ends
      const path = document.createElementNS(ns, 'path');
      const tipDepth = inset;
      const notchDepth = Math.min(width, height) * 0.2;
      
      let d: string;
      if (orientation === 0) {
        // Pointing right
        d = `M ${x - hw + inset + notchDepth} ${y} L ${x - hw + inset} ${y - hh} L ${x + hw - tipDepth} ${y - hh} L ${x + hw} ${y} L ${x + hw - tipDepth} ${y + hh} L ${x - hw + inset} ${y + hh} Z`;
      } else if (orientation === 180) {
        // Pointing left  
        d = `M ${x + hw - inset - notchDepth} ${y} L ${x + hw - inset} ${y - hh} L ${x - hw + tipDepth} ${y - hh} L ${x - hw} ${y} L ${x - hw + tipDepth} ${y + hh} L ${x + hw - inset} ${y + hh} Z`;
      } else if (orientation === 90) {
        // Pointing down
        d = `M ${x} ${y - hh + inset + notchDepth} L ${x - hw} ${y - hh + inset} L ${x - hw} ${y + hh - tipDepth} L ${x} ${y + hh} L ${x + hw} ${y + hh - tipDepth} L ${x + hw} ${y - hh + inset} Z`;
      } else {
        // Pointing up (270)
        d = `M ${x} ${y + hh - inset - notchDepth} L ${x - hw} ${y + hh - inset} L ${x - hw} ${y - hh + tipDepth} L ${x} ${y - hh} L ${x + hw} ${y - hh + tipDepth} L ${x + hw} ${y + hh - inset} Z`;
      }
      path.setAttribute('d', d);
      return path;
    }
    
    case 'diamond': {
      // Diamond overlay - centered, doesn't need edge insets since it's a point shape
      const path = document.createElementNS(ns, 'path');
      // Slightly smaller diamond that leaves corners exposed
      const diamondHw = hw * 0.7;
      const diamondHh = hh * 0.7;
      const d = `M ${x} ${y - diamondHh} L ${x + diamondHw} ${y} L ${x} ${y + diamondHh} L ${x - diamondHw} ${y} Z`;
      path.setAttribute('d', d);
      return path;
    }
    
    case 'circle': {
      // Ellipse overlay - slightly smaller to show base rect at edges
      const ellipse = document.createElementNS(ns, 'ellipse');
      ellipse.setAttribute('cx', String(x));
      ellipse.setAttribute('cy', String(y));
      ellipse.setAttribute('rx', String((width / 2) - inset));
      ellipse.setAttribute('ry', String((height / 2) - inset));
      return ellipse;
    }
    
    default:
      return null;
  }
}

/**
 * Create the main SVG container
 */
export function createSVGContainer(container: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'sankey-hand-layout');
  svg.style.width = '100%';
  svg.style.height = '100%';
  
  // Create layer groups (links first so nodes render on top)
  const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  linksGroup.setAttribute('class', 'links');
  svg.appendChild(linksGroup);
  
  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodesGroup.setAttribute('class', 'nodes');
  svg.appendChild(nodesGroup);
  
  container.appendChild(svg);
  return svg;
}

/**
 * Render all nodes
 */
export function renderNodes(
  svg: SVGSVGElement,
  nodes: ComputedNode[],
  options: SankeyOptions
): void {
  const nodesGroup = svg.querySelector('.nodes');
  if (!nodesGroup) return;
  
  // Clear existing nodes
  nodesGroup.innerHTML = '';
  
  for (const node of nodes) {
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const shape = node.shape ?? 'rect';
    nodeGroup.setAttribute('class', `node node--${toClassName(node.id)} node-shape--${shape}`);
    nodeGroup.setAttribute('data-node-id', node.id);
    nodeGroup.setAttribute('data-orientation', String(node.orientation));
    nodeGroup.setAttribute('data-shape', shape);
    
    // Calculate dimensions based on orientation
    const length = node.length ?? options.nodeLength;
    const thickness = Math.max(node.thickness, options.minNodeThickness);
    
    // Width/height depend on orientation
    const isHorizontal = node.orientation === 0 || node.orientation === 180;
    const width = isHorizontal ? length : thickness;
    const height = isHorizontal ? thickness : length;
    
    // Always create a base rectangle (this is where links attach)
    const baseRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    baseRect.setAttribute('x', String(node.x - width / 2));
    baseRect.setAttribute('y', String(node.y - height / 2));
    baseRect.setAttribute('width', String(width));
    baseRect.setAttribute('height', String(height));
    baseRect.classList.add('node-base');
    nodeGroup.appendChild(baseRect);
    
    // For non-rect shapes, add the shape overlay on top
    if (shape !== 'rect') {
      const shapeOverlay = createNodeShapeOverlay(shape, node.x, node.y, width, height, node.orientation);
      if (shapeOverlay) {
        shapeOverlay.classList.add('node-shape-overlay');
        nodeGroup.appendChild(shapeOverlay);
      }
    }
    
    // Create label
    if (node.label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(node.x));
      text.setAttribute('y', String(node.y));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = node.label;
      nodeGroup.appendChild(text);
    }
    
    nodesGroup.appendChild(nodeGroup);
  }
}

/**
 * Render all links
 */
export function renderLinks(
  svg: SVGSVGElement,
  links: ComputedLink[],
  options: SankeyOptions
): void {
  const linksGroup = svg.querySelector('.links');
  if (!linksGroup) return;
  
  // Clear existing links
  linksGroup.innerHTML = '';
  
  for (const link of links) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', `link link--${toClassName(link.id)}`);
    path.setAttribute('data-link-id', link.id);
    path.setAttribute('data-source', link.source);
    path.setAttribute('data-target', link.target);
    path.setAttribute('d', link.path);
    // Links are now filled shapes, not stroked lines
    
    linksGroup.appendChild(path);
  }
}

/**
 * Clear all rendered content
 */
export function clearSVG(svg: SVGSVGElement): void {
  const nodesGroup = svg.querySelector('.nodes');
  const linksGroup = svg.querySelector('.links');
  
  if (nodesGroup) nodesGroup.innerHTML = '';
  if (linksGroup) linksGroup.innerHTML = '';
}
