# sankey-hand-layout

A user-driven layout Sankey diagram library. Design your layout once, reuse it across multiple years of data.

## Features

- **User-driven layout**: Drag nodes, rotate them (0°/90°/180°/270°), resize them, and export layouts for reuse
- **Orientation-based flow**: Links enter/exit nodes based on orientation, not fixed directions
- **CSS theming**: Style nodes and links using CSS classes generated from IDs
- **Interactive**: Hover, click, drag, rotate, and resize interactions
- **Two path styles**: Bezier ribbons or constant-width paths
- **Observable Framework compatible**: ESM and UMD builds included

![](demo.gif)

## Installation

```bash
npm install sankey-hand-layout
```

## Quick Start

```typescript
import { createSankey } from 'sankey-hand-layout';
import 'sankey-hand-layout/style.css';

const container = document.getElementById('diagram');

const sankey = createSankey(container, {
  nodes: [
    { id: 'atmosphere', label: 'Atmosphere', x: 100, y: 200, orientation: 0 },
    { id: 'forest', label: 'Forest', x: 300, y: 150, orientation: 0 },
    { id: 'soil', label: 'Soil', x: 300, y: 250, orientation: 0 },
  ],
  links: [
    { id: 'photosynthesis', source: 'atmosphere', target: 'forest', value: 100 },
    { id: 'litterfall', source: 'forest', target: 'soil', value: 30 },
    { id: 'respiration', source: 'soil', target: 'atmosphere', value: 25 },
  ],
  options: {
    valueScale: 0.5,
    curvature: 0.5,
  },
});
```

## API

### `createSankey(container, config)`

Creates a new Sankey diagram.

#### Parameters

- `container: HTMLElement` - The DOM element to render into
- `config.nodes: Node[]` - Array of node definitions
- `config.links: Link[]` - Array of link definitions  
- `config.layout?: Layout` - Optional saved layout to apply
- `config.options?: Partial<SankeyOptions>` - Optional configuration

#### Returns `SankeyInstance`

### Node

```typescript
interface Node {
  id: string;              // Unique identifier
  label?: string;          // Display label
  x: number;               // X position
  y: number;               // Y position
  orientation: 0 | 90 | 180 | 270;  // Rotation in degrees
  length?: number;         // Size along flow axis
}
```

Node orientation determines where links attach:

| Orientation | "In" side | "Out" side |
|-------------|-----------|------------|
| 0° (default) | left | right |
| 90° | top | bottom |
| 180° | right | left |
| 270° | bottom | top |

### Link

```typescript
interface Link {
  id: string;              // Unique identifier
  source: string;          // Source node ID (exits from "out" side)
  target: string;          // Target node ID (enters at "in" side)
  value: number;           // Flow value (determines thickness)
}
```

### SankeyOptions

```typescript
interface SankeyOptions {
  valueScale: number;      // Pixels per unit of flow value (default: 1)
  curvature: number;       // Bezier curvature 0-1 (default: 0.5)
  nodeLength: number;      // Default node length (default: 20)
  pathStyle: 'bezier' | 'constantWidth';  // Path rendering style
  transitionDuration: number;  // Animation duration in ms (default: 300, 0 = instant)
  transitionEasing: (t: number) => number;  // Easing function
}
```

### SankeyInstance Methods

#### Events

```typescript
// Subscribe to events
const unsubscribe = sankey.on('nodeClick', (node) => console.log(node));
sankey.on('nodeHover', (node) => { /* node or null */ });
sankey.on('linkClick', (link) => console.log(link));
sankey.on('linkHover', (link) => { /* link or null */ });
sankey.on('layoutChange', (layout) => { /* save layout */ });
sankey.on('transitionStart', () => { /* animation started */ });
sankey.on('transitionEnd', () => { /* animation complete */ });

// Unsubscribe
unsubscribe();
```

#### Layout Management

```typescript
// Get current layout (for saving)
const layout = sankey.getLayout();
localStorage.setItem('myLayout', JSON.stringify(layout));

// Apply a saved layout
const savedLayout = JSON.parse(localStorage.getItem('myLayout'));
sankey.setLayout(savedLayout);
```

#### Options

```typescript
// Change options at runtime
sankey.setOption('curvature', 0.7);
sankey.setOption('valueScale', 2);
sankey.setOption('pathStyle', 'constantWidth');
sankey.setOption('transitionDuration', 500);  // Slower animations

// Get current options
const options = sankey.getOptions();
```

#### Data Updates

```typescript
// Swap to different year's data (layout preserved, animates)
sankey.setData(year2024Nodes, year2024Links);

// Update just link values (common case - same nodes, different flows)
sankey.setLinks(year2024Links);  // Animates thickness changes
```

#### Animation Control

```typescript
import { easings } from 'sankey-hand-layout';

// Use built-in easings
sankey.setOption('transitionEasing', easings.easeOutCubic);

// Check animation state
if (sankey.isAnimating()) {
  sankey.cancelAnimation();
}

// Available easings: linear, easeIn, easeOut, easeInOut, easeOutCubic, easeInOutCubic
```

#### Cleanup

```typescript
sankey.destroy();
```

## CSS Styling

Nodes and links get CSS classes based on their IDs:

```css
/* Base styles */
.sankey-hand-layout .node rect { fill: steelblue; }
.sankey-hand-layout .link { fill: #999; fill-opacity: 0.5; }

/* Style by node ID */
.sankey-hand-layout .node--atmosphere rect { fill: #87CEEB; }
.sankey-hand-layout .node--forest rect { fill: #228B22; }

/* Style by link ID */
.sankey-hand-layout .link--photosynthesis { fill: #32CD32; }
.sankey-hand-layout .link--fire { fill: #ff4500; }

/* Hover states */
.sankey-hand-layout .link:hover { fill-opacity: 0.8; }
.sankey-hand-layout .node:hover rect { stroke: #333; stroke-width: 2; }
```

IDs are converted to CSS-safe class names: lowercase, spaces and special characters become hyphens.

## Interaction

### Dragging

Drag any node to reposition it. The `layoutChange` event fires when dragging ends.

### Rotating

Double-click a node to rotate it 90° clockwise. This changes which sides links attach to.

## Path Styles

### `bezier` (default)

Traditional Sankey ribbons that taper from source to target thickness.

### `constantWidth`

Paths maintain consistent width along their length. Good for flows where you want to emphasize the magnitude doesn't change.

## Browser Usage (UMD)

```html
<link rel="stylesheet" href="https://unpkg.com/sankey-hand-layout/dist/style.css">
<script src="https://unpkg.com/sankey-hand-layout/dist/sankey-hand-layout.umd.cjs"></script>
<script>
  const sankey = SankeyHandLayout.createSankey(container, { nodes, links });
</script>
```

## Observable Framework

In an Observable Framework project, add to your `package.json`:

```json
{
  "dependencies": {
    "sankey-hand-layout": "^0.1.0"
  }
}
```

Then in your `.md` file:

```js
import { createSankey } from "sankey-hand-layout";
import "sankey-hand-layout/style.css";
```

```js
const container = display(html`<div style="width: 800px; height: 600px;"></div>`);
const sankey = createSankey(container, { nodes, links });
```

## Observable Notebooks (legacy)

```javascript
SankeyHandLayout = require("sankey-hand-layout")

viewof diagram = {
  const container = html`<div style="width: 800px; height: 600px;"></div>`;
  const sankey = SankeyHandLayout.createSankey(container, { nodes, links });
  return container;
}
```

## License

MIT
