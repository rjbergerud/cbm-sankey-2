# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2025-12-04

### ✨ New Features

**Node Shapes**
- New `shape` property on nodes: `'rect'` | `'arrow'` | `'chevron'` | `'diamond'` | `'circle'`
- Shapes render as overlays on top of base rectangles (links still connect to rectangle edges)
- Shapes respect node orientation for directional shapes (arrow, chevron)
- Shapes are saved/restored with layout serialization

**Light/Dark Theme System**
- Full CSS custom properties theme system with `--sankey-*` variables
- New `setTheme('light' | 'dark')` API method
- Themes control: background, node fills, link colors, text colors, handle colors
- Text labels now have outline stroke for readability on any background

### 🐛 Bug Fixes

- Fixed node animation: both base rectangle and shape overlay now animate together during transitions
- Fixed `setData()` to preserve incoming node shapes rather than overwriting with saved layout values
- Fixed opacity mismatch between node base rectangles and links (now both use 0.45)
- Fixed text readability on light backgrounds with stroke outline

### 🔧 API Changes

```typescript
// Node shape property
const nodes = [
  { id: 'source', shape: 'arrow' },
  { id: 'process', shape: 'chevron' },
  { id: 'sink', shape: 'circle' }
];

// Theme control
sankey.setTheme('dark');  // or 'light'

// Available shapes
type NodeShape = 'rect' | 'arrow' | 'chevron' | 'diamond' | 'circle';
```

### 🎨 CSS Custom Properties

```css
/* Override theme variables */
.sankey-hand-layout {
  --sankey-background: #1a1a2e;
  --sankey-node-fill: #4a90d9;
  --sankey-link-fill: #888;
  --sankey-text-fill: #fff;
  --sankey-text-stroke: #000;
  --sankey-handle-fill: #fff;
  --sankey-handle-stroke: #333;
}
```

## [0.2.0] - 2025-12-03

### ✨ New Features

**Animated Transitions**
- Smooth animations when switching between data sets using `setLinks()` or `setData()`
- Configurable duration via `transitionDuration` option (default: 300ms)
- Built-in easing functions: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeOutCubic`, `easeInOutCubic`
- New events: `transitionStart` and `transitionEnd`
- Animation control methods: `isAnimating()` and `cancelAnimation()`

**New `setLinks()` Method**
- Update just link values while preserving node layout
- Perfect for time-series data where nodes stay fixed but flow values change
- Animates thickness changes automatically

**Dual Resize Handles**
- Resize handles now appear on both ends of each node
- Drag either handle to resize the node length

### 📦 Dependencies

- Added `d3-interpolate` (~5KB) for smooth path and value interpolation

### 🔧 API Changes

```typescript
// New options
transitionDuration: number;  // Animation duration in ms (0 = instant)
transitionEasing: (t: number) => number;  // Easing function

// New methods
sankey.setLinks(links);     // Update link values with animation
sankey.isAnimating();       // Check if animating
sankey.cancelAnimation();   // Stop current animation

// New events
sankey.on('transitionStart', () => {});
sankey.on('transitionEnd', () => {});

// Built-in easings
import { easings } from 'sankey-hand-layout';
sankey.setOption('transitionEasing', easings.easeOutCubic);
```

### 🎨 Package Renamed

- Package renamed from `cbm-sankey` to `sankey-hand-layout`
- CSS class prefix changed from `.cbm-sankey` to `.sankey-hand-layout`
- UMD global changed from `CbmSankey` to `SankeyHandLayout`

## [0.1.0] - 2025-11-26

### Initial Release

- User-driven layout: drag nodes, rotate (0°/90°/180°/270°), resize
- Orientation-based flow: links enter/exit based on node orientation
- CSS theming via auto-generated classes from node/link IDs
- Two path styles: `bezier` (ribbon) and `constantWidth`
- Layout serialization: save/load layouts as JSON
- Events: `nodeClick`, `nodeHover`, `linkClick`, `linkHover`, `layoutChange`
- Link ordering: drag to reorder links at node edges
- ESM and UMD builds for browser and bundler usage
- Observable Framework compatible
