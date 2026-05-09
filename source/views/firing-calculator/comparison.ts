import type { DimensionUnit } from "./types";
import type { SilhouetteKey } from "./silhouettes";


// Types
/** Aspect bucket used to choose the comparison lookup table. */
type ComparisonBucket = "cubeish" | "narrow" | "flat";

/** Size comparison option rendered with a label and silhouette. */
export interface ComparisonEntry {
    /** Inclusive upper bound in cubic or square inches. */
    max: number;
    /** User-facing label, prefixed with "≈ " at render. */
    name: string;
    /** Silhouette key paired with the comparison label. */
    silhouette: SilhouetteKey;
}


// Lookup Tables
// Each table should stay ordered by max so lookup can use the first matching
// entry. The cubeish table also represents aggregate loads.

/** Human-scale volume and footprint comparison tables, ordered by upper bound. */
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


// Conversion
// Lookup tables use inches, so user dimensions should convert before lookup.

/** Supported display-unit multipliers for inch-based comparison lookup. */
export const INCHES_PER_UNIT: Record<DimensionUnit, number> = {
    in: 1,
    cm: 1 / 2.54,
    mm: 1 / 25.4,
};


// Bucket Selection by Aspect Ratio
// bucketOf should classify tall forms as narrow, thin forms as flat, and all
// other three-dimensional forms as cubeish.

/**
 * Classifies aspect ratio for comparison lookup.
 * Two-dimensional footprint inputs stay cubeish.
 */
export const bucketOf = (length: number, width: number, height: number): ComparisonBucket => {
    const [longest, middle, shortest] = [length, width, height].sort((first, second) => second - first);
    if (middle === 0) return "cubeish";
    if (longest > 1.8 * middle) return "narrow";
    if (shortest < 0.5 * middle) return "flat";
    return "cubeish";
};


// Lookup
// findComparison should return null for non-positive volume so callers can skip
// silhouette rendering.

/** Non-positive candidates produce null so callers skip silhouette rendering. */
export const findComparison = (
    volume: number,
    bucket: ComparisonBucket,
): ComparisonEntry | null => {
    if (volume <= 0) return null;
    const table = COMPARISONS[bucket];
    return table.find((entry) => volume <= entry.max) ?? null;
};
