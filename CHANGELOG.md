# Changelog

All notable changes to this project will be documented in this file.

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
