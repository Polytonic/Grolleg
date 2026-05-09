import m from "mithril";


// Types
type SilhouetteKey =
    | "golfBall" | "apple" | "softball" | "mug" | "grapefruit"
    | "cantaloupe" | "basketball" | "microwave" | "cat" | "fridge"
    | "pen" | "candle" | "sodaCan" | "wineBottle" | "rollingPin"
    | "baseballBat" | "floorLamp"
    | "coaster" | "phone" | "book" | "laptop" | "pizzaBox" | "cuttingBoard";

export type { SilhouetteKey };


// SVG Helpers
const PAGE_BACKGROUND = "var(--color-bg)";

const svg = (size: number, ...children: m.Vnode[]): m.Vnode =>
    m("svg.silhouette", {
        viewBox: "0 0 40 40",
        width: size, height: size,
        "aria-hidden": "true",
    }, children);


// Silhouette Map
// Silhouettes should stay small and single-color so they work as inline badges.
const SILHOUETTES: Record<SilhouetteKey, (size: number) => m.Vnode> = {
    golfBall: (size) => svg(size,
        m("circle", { cx: 20, cy: 20, r: 13, fill: "currentColor" }),
    ),
    apple: (size) => svg(size,
        m("path", { d: "M21 13 Q19 8 24 8", stroke: "currentColor", "stroke-width": 1.5, fill: "none", "stroke-linecap": "round" }),
        m("path", { d: "M23 11 L27 9 L26 13 Z", fill: "currentColor" }),
        m("ellipse", { cx: 20, cy: 25, rx: 10, ry: 10.5, fill: "currentColor" }),
    ),
    softball: (size) => svg(size,
        m("circle", { cx: 20, cy: 20, r: 13, fill: "currentColor" }),
    ),
    mug: (size) => svg(size,
        m("rect", { x: 9, y: 11, width: 17, height: 20, rx: 1.5, fill: "currentColor" }),
        m("path", { d: "M26 15 Q33 15 33 22 Q33 28 26 28", stroke: "currentColor", "stroke-width": 2.2, fill: "none" }),
    ),
    grapefruit: (size) => svg(size,
        m("circle", { cx: 20, cy: 20, r: 14, fill: "currentColor" }),
    ),
    cantaloupe: (size) => svg(size,
        m("ellipse", { cx: 20, cy: 20, rx: 14, ry: 12, fill: "currentColor" }),
    ),
    basketball: (size) => svg(size,
        m("circle", { cx: 20, cy: 20, r: 14, fill: "currentColor" }),
        m("path", { d: "M20 6 L20 34 M6 20 L34 20", stroke: PAGE_BACKGROUND, "stroke-width": 0.9, opacity: 0.8 }),
    ),
    microwave: (size) => svg(size,
        m("rect", { x: 3, y: 10, width: 34, height: 22, rx: 1, fill: "currentColor" }),
        m("rect", { x: 6, y: 13, width: 22, height: 16, fill: PAGE_BACKGROUND, opacity: 0.7 }),
    ),
    cat: (size) => svg(size,
        m("path", { d: "M4 28 Q6 20 13 19 Q16 14 20 15 Q24 14 27 19 Q34 20 36 28 Q36 31 33 31 L7 31 Q4 31 4 28Z", fill: "currentColor" }),
        m("path", { d: "M11 19 L12 14 L16 17 Z M24 17 L28 14 L29 19 Z", fill: "currentColor" }),
    ),
    fridge: (size) => svg(size,
        m("rect", { x: 10, y: 4, width: 20, height: 32, rx: 1.5, fill: "currentColor" }),
        m("line", { x1: 10, y1: 14, x2: 30, y2: 14, stroke: PAGE_BACKGROUND, "stroke-width": 0.7, opacity: 0.8 }),
    ),
    pen: (size) => svg(size,
        m("rect", { x: 18.5, y: 4, width: 3, height: 28, fill: "currentColor" }),
        m("polygon", { points: "18.5,32 20,37 21.5,32", fill: "currentColor" }),
    ),
    candle: (size) => svg(size,
        m("rect", { x: 15, y: 14, width: 10, height: 20, rx: 0.5, fill: "currentColor" }),
        m("path", { d: "M20 14 Q17 10 20 5 Q23 10 20 14Z", fill: "currentColor" }),
    ),
    sodaCan: (size) => svg(size,
        m("rect", { x: 13, y: 7, width: 14, height: 26, rx: 2, fill: "currentColor" }),
    ),
    wineBottle: (size) => svg(size,
        m("path", { d: "M17 4 L17 14 Q13 16 13 21 L13 35 L27 35 L27 21 Q27 16 23 14 L23 4 Z", fill: "currentColor" }),
    ),
    rollingPin: (size) => svg(size,
        m("rect", { x: 9, y: 17, width: 22, height: 7, rx: 1, fill: "currentColor" }),
        m("rect", { x: 3, y: 19.5, width: 6, height: 2, fill: "currentColor" }),
        m("rect", { x: 31, y: 19.5, width: 6, height: 2, fill: "currentColor" }),
    ),
    baseballBat: (size) => svg(size,
        m("path", { d: "M5 21 Q5 20 6 20 Q12 20 18 20.2 Q28 20.5 34 22 Q35 22.2 35 22.7 Q35 23.2 34 23.3 Q28 24 18 23.8 Q12 23.8 6 23.8 Q5 23.8 5 23 Z", fill: "currentColor" }),
    ),
    floorLamp: (size) => svg(size,
        m("path", { d: "M13 5 L27 5 L25 14 L15 14 Z", fill: "currentColor" }),
        m("rect", { x: 19.3, y: 14, width: 1.4, height: 20, fill: "currentColor" }),
        m("rect", { x: 13, y: 34, width: 14, height: 2, rx: 0.5, fill: "currentColor" }),
    ),
    coaster: (size) => svg(size,
        m("circle", { cx: 20, cy: 20, r: 13, fill: "currentColor" }),
    ),
    phone: (size) => svg(size,
        m("rect", { x: 13.5, y: 5, width: 13, height: 30, rx: 2, fill: "currentColor" }),
    ),
    book: (size) => svg(size,
        m("rect", { x: 8, y: 9, width: 24, height: 22, fill: "currentColor" }),
    ),
    laptop: (size) => svg(size,
        m("rect", { x: 7, y: 9, width: 26, height: 16, fill: "currentColor" }),
        m("rect", { x: 4, y: 25, width: 32, height: 3, rx: 0.5, fill: "currentColor" }),
    ),
    pizzaBox: (size) => svg(size,
        m("rect", { x: 4, y: 12, width: 32, height: 18, fill: "currentColor" }),
    ),
    cuttingBoard: (size) => svg(size,
        m("rect", { x: 3, y: 14, width: 30, height: 14, rx: 1, fill: "currentColor" }),
        m("circle", { cx: 35, cy: 21, r: 1.2, fill: "currentColor" }),
    ),
};


// Component Export
export const Silhouette: m.Component<{ type: SilhouetteKey; size?: number }> = {
    view: ({ attrs: { type, size = 22 } }) =>
        SILHOUETTES[type](size),
};
