import type { DimensionUnit } from "./types";
import type { SilhouetteKey } from "./silhouettes";


// Types
type ComparisonBucket = "cubeish" | "narrow" | "flat";

export interface ComparisonEntry {
    max: number;             // upper bound, inclusive, in cubic or square inches
    name: string;            // user-facing label, prefixed with "≈ " at render
    silhouette: SilhouetteKey;
}


/* Lookup Tables   Each table is ordered ascending by `max`. Find the first entry whose
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


/* Conversion   Lookup tables are in inches; convert user dimensions before lookup. */

export const INCHES_PER_UNIT: Record<DimensionUnit, number> = {
    in: 1,
    cm: 1 / 2.54,
    mm: 1 / 25.4,
};


/* Bucket Selection by Aspect Ratio     narrow:  tallest dim is more than 1.8× the next-largest (vases, bottles)
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


/* Lookup   Returns the first entry whose max >= vol. Returns null for non-positive
   inputs so callers can short-circuit without rendering a silhouette. */

export const findComparison = (
    volume: number,
    bucket: ComparisonBucket,
): ComparisonEntry | null => {
    if (volume <= 0) return null;
    const table = COMPARISONS[bucket];
    return table.find((entry) => volume <= entry.max) ?? null;
};
