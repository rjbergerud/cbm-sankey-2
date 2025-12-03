import { ComputedNode, ComputedLink, SankeyOptions } from '../core/types';
import { toClassName } from '../core/Graph';

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
    nodeGroup.setAttribute('class', `node node--${toClassName(node.id)}`);
    nodeGroup.setAttribute('data-node-id', node.id);
    nodeGroup.setAttribute('data-orientation', String(node.orientation));
    
    // Calculate dimensions based on orientation
    const length = node.length ?? options.nodeLength;
    const thickness = Math.max(node.thickness, options.minNodeThickness);
    
    // Width/height depend on orientation
    const isHorizontal = node.orientation === 0 || node.orientation === 180;
    const width = isHorizontal ? length : thickness;
    const height = isHorizontal ? thickness : length;
    
    // Create rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(node.x - width / 2));
    rect.setAttribute('y', String(node.y - height / 2));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    nodeGroup.appendChild(rect);
    
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
