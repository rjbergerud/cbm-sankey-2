# Specs
I'd like to create a sankey diagram tool that relies mostly on the user for layout. 

The idea is that for the most part, we will have several years of flow data all following the same structure, so we'll lay it out once, and re-use that layout for all years.  The user will be able to adjust the layout through a gui.

The library should allow:
- allow the user to adjust the thickness of links globally
- allow the user to adjust the x-y position of nodes through a gui
- allow users to globally alter the curvature of links
- nodes orientated in 90 degree increments, with the ability to rotate them through a gui
- fully customizable styling and theming through css
- custom width nodes that can be resized through a gui
- events fired for on hover and on click for nodes and links
- packaged as a reusable library with a simple api
- able to run in Observable notebooks and quarto documents

Extensions we'd like to eventually add:
- For certain flows, allow them to drawn for a section as a set of subflows with no gaps, kind of a like a stacked bar chart along the link
- the ability to toggle different layers - for instance, after splitting into natural disturbances and annual processes, we might have a layer that categorizes carbon fluxes by DOM or Biomass source, or instead we might choose to further split disturbances and annual processes into their respective subcategories (eg. fire, insect, harvest for disturbances, DOMtoAir, SoftwoodStemSnagToAir for annual processes)
- Allow nodes to be grouped into categories, and show aggregate flows between categories as well as flows between nodes.  Nodes can belong to multiple categories, and categories can belong to other categories.

If these features impact design decisions early on, let me know about them and choose whether or not to accommodate them.

---

# Architecture

## Data Model

### Node

```typescript
interface Node {
  id: string;
  label?: string;
  x: number;
  y: number;
  orientation: 0 | 90 | 180 | 270;  // degrees clockwise
  length?: number;                  // size along flow axis (for text/spacing)
  categories?: string[];            // for future grouping feature
}
```

- **length**: The dimension along the flow direction (left-right at 0°, top-bottom at 90°). Used to fit labels or stretch out flows. Defaults to `nodeLength` from options.
- **thickness**: NOT stored — calculated at render time from the sum of connected link values.

Node orientation determines link attachment:
| Orientation | "In" side | "Out" side |
|-------------|-----------|------------|
| 0° (default) | left | right |
| 90° | top | bottom |
| 180° | right | left |
| 270° | bottom | top |

### Link
```typescript
interface Link {
  id: string;
  source: string;           // node id - exits from "out" side
  target: string;           // node id - enters at "in" side  
  value: number;
  layer?: string;           // for future layer toggling
  subflows?: Subflow[];     // for future stacked subflows
}

interface Subflow {
  value: number;
  className?: string;       // for styling
}
```

### Layout (serializable, reusable across data years)

```typescript
interface Layout {
  nodes: Record<string, {
    x: number;
    y: number;
    orientation: 0 | 90 | 180 | 270;
    length?: number;
  }>;
}
```

### Graph (runtime state)
```typescript
interface Graph {
  nodes: Node[];
  links: Link[];
}
```

## Global Settings

```typescript
interface SankeyOptions {
  linkThickness: number;    // multiplier for link stroke width
  linkCurvature: number;    // 0-1, controls bezier control point distance
  nodeLength: number;       // default node length (along flow axis)
  valueScale: number;       // pixels per unit of flow value (for node thickness)
}
```

## Module Structure

```
cbm-sankey/
├── src/
│   ├── core/
│   │   ├── types.ts            # All TypeScript interfaces
│   │   ├── Graph.ts            # Graph construction & validation
│   │   └── Layout.ts           # Layout save/load/apply
│   │
│   ├── render/
│   │   ├── SVGRenderer.ts      # Main renderer, creates SVG structure
│   │   ├── NodeRenderer.ts     # Draws nodes as rectangles
│   │   ├── LinkRenderer.ts     # Draws links as bezier paths
│   │   └── PathGenerator.ts    # Calculates bezier curves based on orientations
│   │
│   ├── interaction/
│   │   ├── EventEmitter.ts     # Pub/sub for hover, click, drag events
│   │   ├── DragHandler.ts      # Node position dragging
│   │   └── RotateHandler.ts    # Node orientation changes (90° increments)
│   │
│   ├── styles/
│   │   └── default.css         # Default theme (user can override)
│   │
│   └── index.ts                # Public API entry point
│
├── package.json
├── vite.config.ts              # Library build config
└── tsconfig.json
```

## Public API

```typescript
// Creation
const sankey = createSankey(container: HTMLElement, {
  nodes: Node[],
  links: Link[],
  layout?: Layout,          // optional saved layout
  options?: Partial<SankeyOptions>
});

// Events
sankey.on('nodeClick', (node: Node) => void);
sankey.on('nodeHover', (node: Node | null) => void);
sankey.on('linkClick', (link: Link) => void);
sankey.on('linkHover', (link: Link | null) => void);
sankey.on('layoutChange', (layout: Layout) => void);

// Layout management
sankey.getLayout(): Layout;
sankey.setLayout(layout: Layout): void;

// Global adjustments
sankey.setOption(key: keyof SankeyOptions, value: number): void;

// Data updates (same layout, different year's data)
sankey.setData(nodes: Node[], links: Link[]): void;

// Cleanup
sankey.destroy(): void;
```

## Rendering Strategy

**SVG-based** for:
- Native CSS styling support
- Built-in event handling
- Observable/Quarto compatibility
- Easier debugging

**Structure:**

```html
<svg class="cbm-sankey">
  <g class="links">
    <path class="link link--fire" data-link-id="fire" />
    ...
  </g>
  <g class="nodes">
    <g class="node node--atmosphere" data-node-id="atmosphere">
      <rect />
      <text />
    </g>
    ...
  </g>
</svg>
```

IDs are converted to CSS-safe class names: `node--{id}` and `link--{id}` (sanitized: lowercase, spaces/special chars → hyphens).

## Path Generation

Links are bezier curves calculated from:
1. Source node position + orientation → exit point & direction
2. Target node position + orientation → entry point & direction
3. Global curvature setting → control point distance

Multiple links on the same node edge are stacked (offset along the edge based on cumulative value).

## CSS Theming

```css
/* Base styles */
.cbm-sankey .node rect { fill: steelblue; }
.cbm-sankey .node text { font-size: 12px; }
.cbm-sankey .link { fill: none; stroke: #999; stroke-opacity: 0.5; }
.cbm-sankey .link:hover { stroke-opacity: 0.8; }
.cbm-sankey .node.dragging { cursor: grabbing; }

/* Style by node ID */
.cbm-sankey .node--atmosphere rect { fill: #87CEEB; }
.cbm-sankey .node--forest-floor rect { fill: #228B22; }

/* Style by link ID */
.cbm-sankey .link--fire { stroke: #ff4500; }
.cbm-sankey .link--harvest { stroke: #8B4513; }
.cbm-sankey .link--photosynthesis { stroke: #32CD32; }
```

## Build Target

- **ESM** for modern bundlers and Observable
- **UMD** for direct browser use and Quarto
- **CSS** as separate file (importable or linkable)

---

# Future Extension Hooks

Already accommodated in the data model:
- `node.categories[]` — ready for category grouping
- `link.layer` — ready for layer toggling  
- `link.subflows[]` — ready for stacked subflow rendering

These fields are optional and ignored until the features are implemented.

---

# Work Plan

## Phase 1: Project Setup
- [ ] Initialize npm project with TypeScript
- [ ] Configure Vite for library build (ESM + UMD)
- [ ] Set up tsconfig.json
- [ ] Create folder structure (`src/core`, `src/render`, `src/interaction`, `src/styles`)
- [ ] Add dev dependencies (vite, typescript)

## Phase 2: Core Data Model
- [ ] Create `src/core/types.ts` with all interfaces (Node, Link, Layout, SankeyOptions, Graph)
- [ ] Create `src/core/Graph.ts` — graph construction, validation, node/link lookups
- [ ] Create `src/core/Layout.ts` — save/load/apply layout to graph
- [ ] Write unit tests for core data model

## Phase 3: Basic Rendering
- [ ] Create `src/render/SVGRenderer.ts` — main renderer, SVG container setup
- [ ] Create `src/render/NodeRenderer.ts` — draw nodes as rectangles with labels
- [ ] Create `src/render/LinkRenderer.ts` — draw links as paths (placeholder straight lines)
- [ ] Create `src/styles/default.css` — base styles
- [ ] Create `src/index.ts` — export `createSankey()` with basic render

**Milestone: Static diagram renders with rectangles and straight lines**

## Phase 4: Path Generation
- [ ] Create `src/render/PathGenerator.ts` — bezier curve calculation
- [ ] Handle orientation combinations (exit/entry points based on node orientation)
- [ ] Implement link stacking (multiple links on same edge)
- [ ] Add curvature parameter support

**Milestone: Proper curved Sankey links render correctly**

## Phase 5: Interaction — Events
- [ ] Create `src/interaction/EventEmitter.ts` — pub/sub pattern
- [ ] Add hover events for nodes and links (CSS classes + callbacks)
- [ ] Add click events for nodes and links
- [ ] Wire events through `sankey.on()` API

**Milestone: Hover/click events fire correctly**

## Phase 6: Interaction — Layout Editing
- [ ] Create `src/interaction/DragHandler.ts` — node position dragging
- [ ] Create `src/interaction/RotateHandler.ts` — rotate nodes (double-click or key)
- [ ] Add node length resize handle (drag edge)
- [ ] Fire `layoutChange` event on any edit
- [ ] Implement `getLayout()` / `setLayout()` API

**Milestone: Users can drag nodes, rotate them, resize length, and export layout**

## Phase 7: Global Options
- [ ] Implement `setOption()` for linkThickness
- [ ] Implement `setOption()` for linkCurvature  
- [ ] Implement `setOption()` for valueScale
- [ ] Implement `setOption()` for nodeLength (default)
- [ ] Re-render on option change

**Milestone: Global sliders can adjust diagram appearance**

## Phase 8: Data Updates
- [ ] Implement `setData()` — swap nodes/links while preserving layout
- [ ] Handle missing nodes in layout gracefully (use defaults)
- [ ] Handle extra nodes in layout gracefully (ignore)

**Milestone: Can swap between years of data with same layout**

## Phase 9: Polish & Packaging
- [ ] CSS class generation from IDs (sanitization)
- [ ] Documentation (README with API examples)
- [ ] Observable notebook example
- [ ] Quarto document example
- [ ] Publish to npm

---

## Future Phases (Post-MVP)

### Phase 10: Subflows
- [ ] Render `link.subflows[]` as stacked colored segments along link path

### Phase 11: Layer Toggling
- [ ] Add `visibleLayers` state
- [ ] Filter links by `link.layer` 
- [ ] Provide API to toggle layers

### Phase 12: Category Grouping
- [ ] Compute aggregate flows between categories
- [ ] Render category bounding boxes
- [ ] Toggle between node view and category view

