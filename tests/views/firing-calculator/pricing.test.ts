import { describe, it, expect, beforeEach } from "bun:test";
import { expandUnit } from "../../../source/components/locale";
import { BASIS_META, FIRING_TYPES } from "../../../source/views/firing-calculator/types";
import {
    calculatePrice, computeQuantity,
    toDisplayRate, toStoredRate, rateUnitFor, rateIsCents,
    toPositive, formatPrice, formatQuantity,
} from "../../../source/views/firing-calculator/pricing";
import { studioSnapshot } from "../../../source/views/firing-calculator/state";

import { resetState, makePiece, setStudio } from "./helpers";

beforeEach(() => resetState());


// Positive Number Parsing
describe("toPositive() coerces input to a positive number or zero", () => {
    const cases = [
        { label: "empty string returns 0", input: "", expected: 0 },
        { label: "negative number returns 0", input: -5, expected: 0 },
        { label: "positive number passes through", input: 3.14, expected: 3.14 },
        { label: "numeric string parses", input: "12.5", expected: 12.5 },
        { label: "European thousands parses", input: "1.500,75", expected: 1500.75 },
    ] as const;

    for (const { label, input, expected } of cases) {
        it(label, () => expect(toPositive(input)).toBe(expected));
    }
});

describe("toPositive() hostile inputs", () => {
    it("scientific notation parses as the expanded number", () => {
        expect(toPositive("1e5")).toBe(100000);
    });

    it("leading currency symbol returns 0", () => {
        expect(toPositive("$12.50")).toBe(0);
    });

    it("trailing non-numeric suffix returns 0", () => {
        expect(toPositive("12abc")).toBe(0);
    });

    it("trailing unit suffix returns 0", () => {
        expect(toPositive("12.5cm")).toBe(0);
    });

    it("negative string returns 0", () => {
        expect(toPositive("-5")).toBe(0);
    });
});


// Unit Name Expansion
describe("expandUnit", () => {
    it("maps known abbreviation to verbose name", () => {
        expect(expandUnit("in")).toBe("inches");
        expect(expandUnit("cm")).toBe("centimeters");
        expect(expandUnit("lb")).toBe("pounds");
    });

    it("falls back to the raw unit string for unknown keys", () => {
        expect(expandUnit("xyz")).toBe("xyz");
    });
});


// Price and Quantity Formatting
describe("formatPrice", () => {
    it("formats zero as a dollar amount", () => {
        expect(formatPrice(0)).toBe("$0.00");
    });

    it("formats a positive value as a dollar amount", () => {
        expect(formatPrice(3.2)).toBe("$3.20");
    });

    it("formats a large value as a dollar amount", () => {
        expect(formatPrice(1234.56)).toBe("$1,234.56");
    });
});

describe("formatQuantity", () => {
    it("weight basis formats with two decimals", () => {
        expect(formatQuantity(1.5, "weight")).toBe("1.50");
    });

    it("volume basis formats as whole number", () => {
        expect(formatQuantity(80, "volume")).toBe("80");
    });

    it("footprint basis formats as whole number", () => {
        expect(formatQuantity(16, "footprint")).toBe("16");
    });
});


// Empty and Disabled-Firing Edge Cases
describe("calculatePrice edge cases", () => {
    it("empty piece returns price 0", () => {
        const result = calculatePrice(makePiece(), studioSnapshot());
        expect(result.price).toBe(0);
        expect(result.quantity).toBe(0);
    });

    it("piece with no firings selected returns 0 even with valid dimensions", () => {
        const piece = makePiece({
            L: "4", W: "4", H: "4",
            firings: { bisque: false, glaze: false, luster: false },
        });
        expect(calculatePrice(piece, studioSnapshot()).price).toBe(0);
    });

    it("studio firing off masks piece firing on (AND-gate)", () => {
        const piece = makePiece({
            L: "4", W: "4", H: "4",
            firings: { bisque: true, glaze: false, luster: false },
        });
        setStudio({ firingToggles: { bisque: false, glaze: false, luster: false } });
        expect(calculatePrice(piece, studioSnapshot()).price).toBe(0);
    });

    it("price is zero when quantity > 0 but rate sums to 0", () => {
        const piece = makePiece({
            L: "4", W: "4", H: "4",
            firings: { bisque: true, glaze: false, luster: false },
        });
        setStudio({ firingRates: { bisque: 0, glaze: 0.045, luster: 0.08 } });
        const result = calculatePrice(piece, studioSnapshot());
        expect(result.quantity).toBeGreaterThan(0);
        expect(result.rate).toBe(0);
        expect(result.price).toBe(0);
    });
});


// Minimum Height Behavior
describe("minimum height applies before per-dimension ceiling", () => {
    it("1×1×1 with min=2 and dimension-ceil yields quantity 1×1×2 = 2 (floor first, then ceil)", () => {
        const piece = makePiece({ L: "1", W: "1", H: "1" });
        setStudio({ minHeight: 2, rounding: "dimension-ceil" });
        expect(computeQuantity(piece, "volume", "dimension-ceil", 2)).toBe(2);
    });

    it("minHeight=0 disables the floor", () => {
        const piece = makePiece({ L: "1", W: "1", H: "0.5" });
        setStudio({ minHeight: 0, rounding: "none" });
        expect(computeQuantity(piece, "volume", "none", 0)).toBe(0.5);
    });

    it("entered H above minHeight passes through", () => {
        const piece = makePiece({ L: "2", W: "2", H: "5" });
        expect(computeQuantity(piece, "volume", "none", 2)).toBe(20);
    });

    it("min height does not apply to footprint basis", () => {
        const piece = makePiece({ L: "3", W: "3", H: "1" });
        setStudio({ basis: "footprint", minHeight: 2, rounding: "none" });
        expect(computeQuantity(piece, "footprint", "none", 2)).toBe(9);
    });

    it("min height does not apply to weight basis", () => {
        const piece = makePiece({ weight: "0.5" });
        setStudio({ basis: "weight", minHeight: 2 });
        expect(computeQuantity(piece, "weight", "none", 2)).toBe(0.5);
    });
});


// Incomplete Dimensions
describe("incomplete dimensions return zero quantity", () => {
    it("volume with missing H returns 0", () => {
        const piece = makePiece({ L: "5", W: "5", H: "" });
        expect(computeQuantity(piece, "volume", "none", 2)).toBe(0);
    });

    it("volume with missing L returns 0", () => {
        const piece = makePiece({ L: "", W: "5", H: "5" });
        expect(computeQuantity(piece, "volume", "none", 0)).toBe(0);
    });

    it("footprint with missing W returns 0", () => {
        const piece = makePiece({ L: "5", W: "" });
        expect(computeQuantity(piece, "footprint", "none", 0)).toBe(0);
    });

    it("all dimensions present produces non-zero quantity", () => {
        const piece = makePiece({ L: "5", W: "5", H: "5" });
        expect(computeQuantity(piece, "volume", "none", 0)).toBe(125);
    });
});


// Rounding Modes
describe("rounding modes produce expected quantities", () => {
    const piece = () => makePiece({ L: "3.1", W: "3.1", H: "3.1" });

    it("dimension-ceil rounds each dimension up before multiplication", () => {
        // ceil(3.1) = 4. Then 4 × 4 × 4 = 64.
        expect(computeQuantity(piece(), "volume", "dimension-ceil", 0)).toBe(64);
    });

    it("total-ceil multiplies first then ceils", () => {
        // 3.1 × 3.1 × 3.1 = 29.791. Ceil = 30.
        expect(computeQuantity(piece(), "volume", "total-ceil", 0)).toBe(30);
    });

    it("total-round rounds product to nearest", () => {
        // 29.791 rounds to 30.
        expect(computeQuantity(piece(), "volume", "total-round", 0)).toBe(30);
    });

    it("'none' uses exact decimals", () => {
        expect(computeQuantity(piece(), "volume", "none", 0)).toBeCloseTo(29.791, 5);
    });

    it("dimension-ceil on footprint rounds each L/W independently", () => {
        const piece = makePiece({ L: "5.2", W: "3.1" });
        // ceil(5.2) × ceil(3.1) = 6 × 4.
        expect(computeQuantity(piece, "footprint", "dimension-ceil", 0)).toBe(24);
    });
});


// Cents vs Dollars Conversion
describe("rate conversion (display vs stored)", () => {
    it("rateIsCents true for volume and footprint, false for weight", () => {
        expect(rateIsCents("volume")).toBe(true);
        expect(rateIsCents("footprint")).toBe(true);
        expect(rateIsCents("weight")).toBe(false);
    });

    it("volume stored 0.04 → display 4 (cents)", () => {
        expect(toDisplayRate(0.04, "volume")).toBeCloseTo(4);
    });

    it("weight stored 1.50 → display 1.50 (dollars 1:1)", () => {
        expect(toDisplayRate(1.50, "weight")).toBeCloseTo(1.50);
    });

    it("volume display 4 → stored 0.04", () => {
        expect(toStoredRate("4", "volume")).toBeCloseTo(0.04);
    });

    it("weight display 1.50 → stored 1.50", () => {
        expect(toStoredRate("1.50", "weight")).toBeCloseTo(1.50);
    });

    it("toStoredRate of non-numeric returns 0", () => {
        expect(toStoredRate("abc", "volume")).toBe(0);
    });

    it("toStoredRate with numeric (non-string) first argument", () => {
        expect(toStoredRate(4, "volume")).toBeCloseTo(0.04);
        expect(toStoredRate(1.5, "weight")).toBeCloseTo(1.5);
    });

    it("toDisplayRate for footprint is also cents-based", () => {
        expect(toDisplayRate(0.07, "footprint")).toBeCloseTo(7);
    });

    it("rate unit suffix matches basis", () => {
        expect(rateUnitFor("volume", "in", "lb")).toBe("¢/in³");
        expect(rateUnitFor("footprint", "cm", "kg")).toBe("¢/cm²");
        expect(rateUnitFor("weight", "in", "lb")).toBe("$/lb");
    });

    it("toDisplayRate may produce IEEE 754 noise that the display layer must scrub", () => {
        expect(toDisplayRate(0.035, "volume")).toBeCloseTo(3.5);
    });
});


// Bundled Rate Semantics
describe("bundled rate effective behavior", () => {
    it("bundled bisque/glaze charge firingRates.bundled ONCE (not once per firing)", () => {
        const piece = makePiece({
            L: "1", W: "1", H: "1",
            firings: { bisque: true, glaze: true, luster: false },
        });
        setStudio({
            firingToggles: { bisque: true, glaze: true, luster: false },
            firingRates: { bisque: 0.04, glaze: 0.045, luster: 0.08, bundled: 0.06 },
            bundled: true,
            rounding: "none", minHeight: 0,
        });
        const result = calculatePrice(piece, studioSnapshot());
        expect(result.rate).toBeCloseTo(0.06);
        expect(result.price).toBeCloseTo(0.06);
    });

    it("bundled charge still applies if only one of bisque/glaze is enabled on the piece", () => {
        const piece = makePiece({
            L: "1", W: "1", H: "1",
            firings: { bisque: true, glaze: false, luster: false },
        });
        setStudio({
            firingToggles: { bisque: true, glaze: true, luster: false },
            firingRates: { bisque: 0.04, glaze: 0.045, luster: 0.08, bundled: 0.06 },
            bundled: true,
            rounding: "none", minHeight: 0,
        });
        const result = calculatePrice(piece, studioSnapshot());
        expect(result.rate).toBeCloseTo(0.06);
    });

    it("bundled luster adds the individual luster rate on top of the bundle", () => {
        const piece = makePiece({
            L: "1", W: "1", H: "1",
            firings: { bisque: true, glaze: true, luster: true },
        });
        setStudio({
            firingToggles: { bisque: true, glaze: true, luster: true },
            firingRates: { bisque: 0.04, glaze: 0.045, luster: 0.08, bundled: 0.06 },
            bundled: true,
            rounding: "none", minHeight: 0,
        });
        // Rate = bundled (0.06) + luster (0.08) = 0.14.
        const result = calculatePrice(piece, studioSnapshot());
        expect(result.rate).toBeCloseTo(0.14);
    });
});


// End-to-End Pricing
describe("calculatePrice end-to-end", () => {
    it("4×4×5 mug at default rates, bisque only", () => {
        const piece = makePiece({
            L: "4", W: "4", H: "5",
            firings: { bisque: true, glaze: false, luster: false },
        });
        // Quantity = 4×4×5 = 80 because dimensions are already integers.
        // Rate = 0.04 for bisque only.
        // Price = 80 × 0.04 = $3.20.
        setStudio({ rounding: "dimension-ceil", firingRates: { bisque: 0.04, glaze: 0.045, luster: 0.08 } });
        const result = calculatePrice(piece, studioSnapshot());
        expect(result.quantity).toBe(80);
        expect(result.rate).toBeCloseTo(0.04);
        expect(result.price).toBeCloseTo(3.20);
    });

    it("weight basis prices by piece weight", () => {
        const piece = makePiece({
            weight: "2.5",
            firings: { bisque: true, glaze: false, luster: false },
        });
        setStudio({
            basis: "weight",
            firingRates: { bisque: 1.0, glaze: 1.5, luster: 2.0 },
        });
        // Quantity = 2.5. Rate = $1/lb. Price = $2.50.
        const result = calculatePrice(piece, studioSnapshot());
        expect(result.quantity).toBe(2.5);
        expect(result.rate).toBeCloseTo(1.0);
        expect(result.price).toBeCloseTo(2.5);
    });
});


// Constants Sanity
describe("BASIS_META and FIRING_TYPES sanity", () => {
    it("each basis has labeled defaults for every firing", () => {
        for (const basis of ["volume", "footprint", "weight"] as const) {
            expect(BASIS_META[basis].label).toBeTruthy();
            for (const firing of FIRING_TYPES) {
                expect(BASIS_META[basis].defaults[firing.key]).toBeGreaterThan(0);
            }
        }
    });

    it("luster rate is 3-6× bisque for each basis (specialty firing convention)", () => {
        for (const basis of ["volume", "footprint", "weight"] as const) {
            const bisque = BASIS_META[basis].defaults.bisque;
            const luster = BASIS_META[basis].defaults.luster;
            const lusterToBisqueRatio = luster / bisque;
            expect(lusterToBisqueRatio).toBeGreaterThan(3);
            expect(lusterToBisqueRatio).toBeLessThan(6);
        }
    });

    it("ordering bisque ≤ glaze < luster holds for each basis", () => {
        // Bisque and glaze can match (some studios price them at one
        // shared rate even when shown as separate inputs). Luster is
        // always more expensive: it is a specialty firing.
        for (const basis of ["volume", "footprint", "weight"] as const) {
            const defaults = BASIS_META[basis].defaults;
            expect(defaults.bisque).toBeLessThanOrEqual(defaults.glaze);
            expect(defaults.glaze).toBeLessThan(defaults.luster);
        }
    });
});
