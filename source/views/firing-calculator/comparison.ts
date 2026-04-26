import m from "mithril";


/* ── Types ── */

export type ComparisonBucket = "cubeish" | "narrow" | "flat";

export type SilhouetteKey =
    | "golfBall" | "apple" | "softball" | "mug" | "grapefruit"
    | "cantaloupe" | "basketball" | "microwave" | "cat" | "fridge"
    | "pen" | "candle" | "sodaCan" | "wineBottle" | "rollingPin"
    | "baseballBat" | "floorLamp"
    | "coaster" | "phone" | "book" | "laptop" | "pizzaBox" | "cuttingBoard";

export interface ComparisonEntry {
    max: number;             // upper bound, inclusive, in cubic or square inches
    name: string;            // user-facing label, prefixed with "≈ " at render
    silhouette: SilhouetteKey;
}


/* ── Lookup Tables ──
   Each table is ordered ascending by `max`. Find the first entry whose
   max equals or exceeds the candidate volume. The final entry uses Infinity
   as a catch-all. The cubeish table doubles as the aggregate-load comparison
   since a stack of pieces has no meaningful aspect ratio. */

export const COMPARISONS: Record<ComparisonBucket, ComparisonEntry[]> = {
    cubeish: [
        { max: 4,        name: "a golf ball",                   silhouette: "golfBall" },
        { max: 12,       name: "a large apple",                 silhouette: "apple" },
        { max: 35,       name: "a softball",                    silhouette: "softball" },
        { max: 90,       name: "a coffee mug",                  silhouette: "mug" },
        { max: 220,      name: "a grapefruit",                  silhouette: "grapefruit" },
        { max: 550,      name: "a cantaloupe",                  silhouette: "cantaloupe" },
        { max: 1300,     name: "a basketball",                  silhouette: "basketball" },
        { max: 3500,     name: "a microwave",                   silhouette: "microwave" },
        { max: 7000,     name: "a sleeping housecat",           silhouette: "cat" },
        { max: Infinity, name: "a mini fridge (are you sure?)", silhouette: "fridge" },
    ],
    narrow: [
        { max: 3,        name: "a pen",          silhouette: "pen" },
        { max: 18,       name: "a candle",       silhouette: "candle" },
        { max: 45,       name: "a soda can",     silhouette: "sodaCan" },
        { max: 140,      name: "a wine bottle",  silhouette: "wineBottle" },
        { max: 450,      name: "a rolling pin",  silhouette: "rollingPin" },
        { max: 1400,     name: "a baseball bat", silhouette: "baseballBat" },
        { max: Infinity, name: "a floor lamp",   silhouette: "floorLamp" },
    ],
    flat: [
        { max: 5,        name: "a coaster",        silhouette: "coaster" },
        { max: 25,       name: "a smartphone",     silhouette: "phone" },
        { max: 75,       name: "a paperback book", silhouette: "book" },
        { max: 250,      name: "a laptop",         silhouette: "laptop" },
        { max: 700,      name: "a pizza box",      silhouette: "pizzaBox" },
        { max: Infinity, name: "a cutting board",  silhouette: "cuttingBoard" },
    ],
};


/* ── Conversion ──
   Lookup tables are in inches; convert user dimensions before lookup. */

export const INCHES_PER_UNIT: Record<"mm" | "cm" | "in", number> = {
    in: 1,
    cm: 1 / 2.54,
    mm: 1 / 25.4,
};


/* ── Bucket Selection by Aspect Ratio ──
     narrow:  tallest dim is more than 1.8× the next-largest (vases, bottles)
     flat:    shortest dim is less than 0.5× the next-largest (plates, tiles)
     cubeish: everything else
   For 2D inputs (footprint mode), pass H=0; the function returns 'cubeish'. */

export const bucketOf = (length: number, width: number, height: number): ComparisonBucket => {
    const [longest, middle, shortest] = [length, width, height].sort((first, second) => second - first);
    if (middle === 0) return "cubeish";
    if (longest > 1.8 * middle) return "narrow";
    if (shortest < 0.5 * middle) return "flat";
    return "cubeish";
};


/* ── Lookup ──
   Returns the first entry whose max >= vol. Returns null for non-positive
   inputs so callers can short-circuit without rendering a silhouette. */

export const findComparison = (
    volume: number,
    bucket: ComparisonBucket,
): ComparisonEntry | null => {
    if (volume <= 0) return null;
    const table = COMPARISONS[bucket];
    return table.find((entry) => volume <= entry.max) ?? null;
};


/* ── Silhouette Factories ──
   Each silhouette is a Mithril vnode factory taking a size in pixels. The
   shape uses currentColor for fill and stroke so the surrounding element's
   `color` style cascades. For cutout details (basketball cross-stripe,
   microwave window, fridge handle line) the page background color is read
   from the --color-bg custom property. */

const PAGE_BG = "var(--color-bg)";

const svg = (size: number, ...children: m.Vnode[]): m.Vnode =>
    m("svg.silhouette", {
        viewBox: "0 0 40 40",
        width: size, height: size,
        "aria-hidden": "true",
    }, children);

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
        m("path", { d: "M20 6 L20 34 M6 20 L34 20", stroke: PAGE_BG, "stroke-width": 0.9, opacity: 0.8 }),
    ),
    microwave: (size) => svg(size,
        m("rect", { x: 3, y: 10, width: 34, height: 22, rx: 1, fill: "currentColor" }),
        m("rect", { x: 6, y: 13, width: 22, height: 16, fill: PAGE_BG, opacity: 0.7 }),
    ),
    cat: (size) => svg(size,
        m("path", { d: "M4 28 Q6 20 13 19 Q16 14 20 15 Q24 14 27 19 Q34 20 36 28 Q36 31 33 31 L7 31 Q4 31 4 28Z", fill: "currentColor" }),
        m("path", { d: "M11 19 L12 14 L16 17 Z M24 17 L28 14 L29 19 Z", fill: "currentColor" }),
    ),
    fridge: (size) => svg(size,
        m("rect", { x: 10, y: 4, width: 20, height: 32, rx: 1.5, fill: "currentColor" }),
        m("line", { x1: 10, y1: 14, x2: 30, y2: 14, stroke: PAGE_BG, "stroke-width": 0.7, opacity: 0.8 }),
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


/* ── Component ──
   Renders the named silhouette at the given pixel size. Inherits color
   from the surrounding element via currentColor so the parent's `color`
   style tints the silhouette. */

export const Silhouette: m.Component<{ type: SilhouetteKey; size?: number }> = {
    view: ({ attrs: { type, size = 22 } }) =>
        SILHOUETTES[type](size),
};
