import { describe, it, expect, beforeEach } from "bun:test";
import {
    bucketOf, findComparison, INCHES_PER_UNIT, COMPARISONS,
} from "../../../source/views/firing-calculator/comparison";
import { state } from "../../../source/views/firing-calculator/state";
import { computeDerived } from "../../../source/views/firing-calculator/derived";
import { resetState, makePiece, setStudio, setPieces } from "./helpers";

beforeEach(() => resetState());


/* ── Bucket Selection Thresholds ──
   The narrow rule is strict greater-than (>) for 1.8×; the flat rule is
   strict less-than (<) for 0.5×. Boundary cases collapse to cubeish. */

describe("bucketOf classifies by aspect ratio", () => {
    it("narrow when tallest > 1.8 × next-largest", () => {
        // 10 > 1.8 × 5 = 9 → narrow
        expect(bucketOf(10, 5, 5)).toBe("narrow");
    });

    it("not narrow at exactly 1.8 ×", () => {
        // 9 ≤ 1.8 × 5 = 9 → cubeish
        expect(bucketOf(9, 5, 5)).toBe("cubeish");
    });

    it("flat when shortest < 0.5 × next-largest", () => {
        // 1 < 0.5 × 8 = 4 → flat
        expect(bucketOf(10, 8, 1)).toBe("flat");
    });

    it("not flat at exactly 0.5 ×", () => {
        // 4 ≥ 0.5 × 8 = 4 → cubeish
        expect(bucketOf(10, 8, 4)).toBe("cubeish");
    });

    it("cubeish for everything else", () => {
        expect(bucketOf(5, 5, 5)).toBe("cubeish");
        expect(bucketOf(8, 6, 4)).toBe("cubeish");
    });

    it("zero second dim returns cubeish", () => {
        expect(bucketOf(10, 0, 0)).toBe("cubeish");
    });

    it("dimensions can come in any order; sort handles it", () => {
        expect(bucketOf(5, 10, 5)).toBe("narrow");
        expect(bucketOf(1, 10, 8)).toBe("flat");
    });
});


/* ── findComparison Lookup ── */

describe("findComparison finds the first entry where vol <= max", () => {
    it("returns mug for cubeish 50 in³", () => {
        expect(findComparison(50, "cubeish")?.name).toBe("a coffee mug");
    });

    it("returns the smallest entry for tiny volumes", () => {
        expect(findComparison(0.5, "cubeish")?.name).toBe("a golf ball");
    });

    it("uses the Infinity catch-all for huge volumes", () => {
        expect(findComparison(100000, "cubeish")?.name).toBe("a mini fridge (are you sure?)");
    });

    it("returns null for zero or negative volumes", () => {
        expect(findComparison(0, "cubeish")).toBeNull();
        expect(findComparison(-5, "cubeish")).toBeNull();
    });

    it("narrow bucket has its own table", () => {
        expect(findComparison(2, "narrow")?.silhouette).toBe("pen");
    });

    it("flat bucket has its own table", () => {
        expect(findComparison(3, "flat")?.silhouette).toBe("coaster");
    });
});


/* ── Lookup Table Sanity ── */

describe("comparison tables are well-formed", () => {
    it("every bucket ends with an Infinity catch-all", () => {
        for (const bucket of ["cubeish", "narrow", "flat"] as const) {
            const table = COMPARISONS[bucket];
            expect(table[table.length - 1].max).toBe(Infinity);
        }
    });

    it("every bucket is sorted ascending by max", () => {
        for (const bucket of ["cubeish", "narrow", "flat"] as const) {
            const table = COMPARISONS[bucket];
            for (let index = 1; index < table.length; index++) {
                expect(table[index].max).toBeGreaterThan(table[index - 1].max);
            }
        }
    });

    it("every entry has a non-empty name and a silhouette key", () => {
        for (const bucket of ["cubeish", "narrow", "flat"] as const) {
            for (const entry of COMPARISONS[bucket]) {
                expect(entry.name.length).toBeGreaterThan(0);
                expect(entry.silhouette).toBeTruthy();
            }
        }
    });

    it('"are you sure?" hint stays on the largest cubeish entry as a fat-finger guard', () => {
        const lastCubeish = COMPARISONS.cubeish[COMPARISONS.cubeish.length - 1];
        expect(lastCubeish.name).toContain("are you sure");
    });
});


/* ── Conversion Factors ── */

describe("INCHES_PER_UNIT factors", () => {
    it("inch is identity", () => expect(INCHES_PER_UNIT.in).toBe(1));
    it("cm to inches is 1/2.54", () => expect(INCHES_PER_UNIT.cm).toBeCloseTo(1 / 2.54, 6));
    it("mm to inches is 1/25.4", () => expect(INCHES_PER_UNIT.mm).toBeCloseTo(1 / 25.4, 6));
});


/* ── End-to-End via computeDerived ──
   The derived layer must convert user-entered dimensions to inches before
   calling findComparison. Forgetting the conversion produces nonsense
   (a 10mm cube comparing to a microwave). */

describe("comparison via computeDerived applies dimensionUnit → inches", () => {
    it("10cm × 10cm × 10cm cube classifies via inch volume (~ 61 in³)", () => {
        setStudio({ basis: "volume", dimensionUnit: "cm" });
        setPieces([makePiece({ L: "10", W: "10", H: "10" })]);
        const derived = computeDerived();
        const comparison = derived.pieces[0].comparison;
        // 10cm = 3.94in; volume ≈ 61in³ → "a coffee mug" (the 35–90 cubeish bracket)
        expect(comparison?.name).toBe("a coffee mug");
    });

    it("10mm cube classifies as a small cubeish item, not a microwave", () => {
        setStudio({ basis: "volume", dimensionUnit: "mm" });
        setPieces([makePiece({ L: "10", W: "10", H: "10" })]);
        const derived = computeDerived();
        const comparison = derived.pieces[0].comparison;
        // 10mm ≈ 0.394in; volume ≈ 0.06in³ → smallest cubeish: "a golf ball"
        expect(comparison?.name).toBe("a golf ball");
    });

    it("4×4×5 inch piece classifies as a coffee mug", () => {
        setStudio({ basis: "volume", dimensionUnit: "in" });
        setPieces([makePiece({ L: "4", W: "4", H: "5" })]);
        expect(computeDerived().pieces[0].comparison?.name).toBe("a coffee mug");
    });

    it("aggregate uses cubeish bucket regardless of per-piece aspect ratios", () => {
        setStudio({ basis: "volume", dimensionUnit: "in" });
        setPieces([
            makePiece({ L: "4", W: "4", H: "5" }),    // mug, cubeish
            makePiece({ L: "3", W: "3", H: "12" }),   // narrow
        ]);
        const derived = computeDerived();
        // Aggregate volume 80 + 108 = 188 in³ → cubeish "a grapefruit"
        expect(derived.aggregate.comparison?.name).toBe("a grapefruit");
    });

    it("weight basis suppresses comparison silhouettes", () => {
        setStudio({ basis: "weight" });
        setPieces([makePiece({ weight: "5" })]);
        expect(computeDerived().pieces[0].comparison).toBeNull();
    });

    it("footprint mode falls back to flat-aspect via area", () => {
        setStudio({ basis: "footprint", dimensionUnit: "in" });
        setPieces([makePiece({ L: "4", W: "4" })]);
        // 16 in² → flat "a smartphone" (5 < 16 ≤ 25)
        expect(computeDerived().pieces[0].comparison?.name).toBe("a smartphone");
    });
});
