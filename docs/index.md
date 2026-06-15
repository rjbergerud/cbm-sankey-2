# sankey-hand-layout

A user-driven layout Sankey diagram library with interactive drag, rotate, and resize.

```js
import { createSankey, serializeLayout, parseLayout } from "sankey-hand-layout";
```

```js
// Sample data
const nodes = [
  { id: "atmosphere", label: "Atmosphere", x: 100, y: 200, orientation: 0 },
  { id: "forest", label: "Forest", x: 350, y: 100, orientation: 0 },
  { id: "soil", label: "Soil", x: 350, y: 300, orientation: 0 },
  { id: "products", label: "Products", x: 600, y: 200, orientation: 0 },
];

const links = [
  { id: "photosynthesis", source: "atmosphere", target: "forest", value: 100 },
  { id: "litterfall", source: "forest", target: "soil", value: 30 },
  { id: "respiration", source: "soil", target: "atmosphere", value: 25 },
  { id: "harvest", source: "forest", target: "products", value: 20 },
  { id: "decomposition", source: "products", target: "atmosphere", value: 15 },
];
```

## Interactive Diagram

Drag nodes to reposition, double-click to rotate, drag edges to resize.

```js
const container = display(html`<div style="width: 100%; height: 500px; border: 1px solid #ccc; border-radius: 4px;"></div>`);
```

```js
const sankey = createSankey(container, {
  nodes,
  links,
  options: {
    valueScale: 2,
    pathStyle: "bezier",
  },
});

// Listen for layout changes
sankey.on("layoutChange", (layout) => {
  console.log("Layout changed:", layout);
});
```

<style>
/* Custom theme */
.sankey-hand-layout .node--atmosphere rect { fill: #87CEEB; }
.sankey-hand-layout .node--forest rect { fill: #228B22; }
.sankey-hand-layout .node--soil rect { fill: #8B4513; }
.sankey-hand-layout .node--products rect { fill: #DAA520; }

.sankey-hand-layout .link--photosynthesis { fill: #32CD32; }
.sankey-hand-layout .link--litterfall { fill: #8B4513; }
.sankey-hand-layout .link--respiration { fill: #CD5C5C; }
.sankey-hand-layout .link--harvest { fill: #DAA520; }
.sankey-hand-layout .link--decomposition { fill: #A0522D; }
</style>

## Save and Load Layouts

Export the current layout to reuse with different data:

```js
const layoutJson = Inputs.button("Export Layout", {
  value: null,
  reduce: () => {
    const layout = sankey.getLayout();
    return serializeLayout(layout);
  }
});
```

```js
display(layoutJson ? html`<pre><code>${layoutJson}</code></pre>` : html`<p><em>Click "Export Layout" to see the JSON</em></p>`);
```
