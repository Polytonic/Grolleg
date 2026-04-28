import { describe, it, expect } from "bun:test";
import {
    applyRate,
    reverseRate,
    format,
    calculateVolume,
    deriveFiringPercent,
} from "../../../source/views/shrinkage-calculator/state";
import { parseLocaleNumber } from "../../../source/components/locale";


// Shrinkage application and reversal

describe("applyRate", () => {
    it("shrinks 100 by 12% to 88", () => {
        expect(applyRate(100, 12)).toBeCloseTo(88, 2);
    });

    it("0% shrinkage returns original", () => {
        expect(applyRate(100, 0)).toBe(100);
    });

    it("100% shrinkage returns zero", () => {
        expect(applyRate(100, 100)).toBe(0);
    });

    it("zero dimension stays zero", () => {
        expect(applyRate(0, 12)).toBe(0);
    });
});

describe("reverseRate", () => {
    it("reverses 88 at 12% back to 100", () => {
        expect(reverseRate(88, 12)).toBeCloseTo(100, 2);
    });

    it("0% shrinkage returns original", () => {
        expect(reverseRate(100, 0)).toBe(100);
    });

    it("100% shrinkage returns Infinity", () => {
        expect(reverseRate(100, 100)).toBe(Infinity);
    });

    it("reverseRate is the inverse of applyRate", () => {
        expect(reverseRate(applyRate(150, 13), 13)).toBeCloseTo(150, 10);
    });

    it("round-trips through both directions", () => {
        const original = 234.5;
        const percent = 15.3;
        expect(reverseRate(applyRate(original, percent), percent)).toBeCloseTo(original, 10);
        expect(applyRate(reverseRate(original, percent), percent)).toBeCloseTo(original, 10);
    });
});


// Number formatting

describe("format", () => {
    it("formats with two decimal places", () => {
        const result = format(12.5);
        expect(result).toContain("12");
        expect(result).toContain("50");
    });

    it("null returns em dash", () => {
        expect(format(null)).toBe("—");
    });

    it("NaN returns em dash", () => {
        expect(format(NaN)).toBe("—");
    });

    it("Infinity returns em dash", () => {
        expect(format(Infinity)).toBe("—");
    });

    it("negative Infinity returns em dash", () => {
        expect(format(-Infinity)).toBe("—");
    });

    it("zero formats with decimals", () => {
        expect(format(0)).toContain("0");
    });

    it("negative zero formats as zero", () => {
        const result = format(-0);
        expect(result).toContain("0");
    });
});


// Locale-aware number parsing

describe("parseLocaleNumber", () => {
    // Standard formats
    it("12.5 (US decimal)", () => {
        expect(parseLocaleNumber("12.5")).toBe(12.5);
    });

    it("12,5 (European decimal)", () => {
        expect(parseLocaleNumber("12,5")).toBe(12.5);
    });

    it("100 (integer)", () => {
        expect(parseLocaleNumber("100")).toBe(100);
    });

    // Thousands separators
    it("1,500.75 (US thousands)", () => {
        expect(parseLocaleNumber("1,500.75")).toBe(1500.75);
    });

    it("1.500,75 (European thousands)", () => {
        expect(parseLocaleNumber("1.500,75")).toBe(1500.75);
    });

    // Last-separator disambiguation
    it("1.234,56 treats comma as decimal (comma last)", () => {
        expect(parseLocaleNumber("1.234,56")).toBe(1234.56);
    });

    it("1,234.56 treats dot as decimal (dot last)", () => {
        expect(parseLocaleNumber("1,234.56")).toBe(1234.56);
    });

    // Edge cases
    it("empty string returns NaN", () => {
        expect(parseLocaleNumber("")).toBeNaN();
    });

    it("trims whitespace", () => {
        expect(parseLocaleNumber("  12.5  ")).toBe(12.5);
    });

    it("zero", () => {
        expect(parseLocaleNumber("0")).toBe(0);
    });

    it("negative values", () => {
        expect(parseLocaleNumber("-5.5")).toBe(-5.5);
    });

    it("leading decimal (.75)", () => {
        expect(parseLocaleNumber(".75")).toBe(0.75);
    });

    it("trailing decimal (12.)", () => {
        expect(parseLocaleNumber("12.")).toBe(12);
    });

    it("non-numeric text returns NaN", () => {
        expect(parseLocaleNumber("abc")).toBeNaN();
    });
});


// Volume calculation

describe("calculateVolume", () => {
    it("rectangular: L * W * H", () => {
        expect(calculateVolume([10, 20, 30], "rect")).toBe(6000);
    });

    it("cylindrical: pi * (D/2)^2 * H", () => {
        expect(calculateVolume([10, 20], "cylinder")).toBeCloseTo(Math.PI * 25 * 20, 5);
    });

    it("linear returns null (no volume for single dimension)", () => {
        expect(calculateVolume([10], "single")).toBeNull();
    });

    it("insufficient dimensions return null", () => {
        expect(calculateVolume([10], "rect")).toBeNull();
        expect(calculateVolume([10], "cylinder")).toBeNull();
    });

    it("zero dimension produces zero volume", () => {
        expect(calculateVolume([0, 10, 20], "rect")).toBe(0);
        expect(calculateVolume([0, 20], "cylinder")).toBe(0);
    });
});


// Stage decomposition: (1 - total) = (1 - greenware) * (1 - bisque) * (1 - firing)

describe("deriveFiringPercent", () => {
    it("derives firing from Stoneware Cone 6 defaults (12%, 6%, 0.75%)", () => {
        const result = deriveFiringPercent(12, 6, 0.75);
        expect(result).not.toBeNull();
        expect(result!).toBeCloseTo(5.66, 1);
    });

    it("null when stages exceed total (8% + 6% > 12%)", () => {
        expect(deriveFiringPercent(12, 8, 6)).toBeNull();
    });

    it("null when total is 100% (division by zero)", () => {
        expect(deriveFiringPercent(100, 0, 0)).toBeNull();
    });

    it("null when a stage is 100% (zero factor)", () => {
        expect(deriveFiringPercent(50, 100, 0)).toBeNull();
    });

    it("zero greenware puts all drying shrinkage into firing", () => {
        const result = deriveFiringPercent(12, 0, 0.75);
        expect(result).not.toBeNull();
        expect(result!).toBeGreaterThan(0);
    });

    it("stages compose multiplicatively to equal total", () => {
        const total = 15;
        const greenware = 7;
        const bisque = 1;
        const firing = deriveFiringPercent(total, greenware, bisque)!;

        const totalFactor = 1 - total / 100;
        const composedFactor = (1 - greenware / 100) * (1 - bisque / 100) * (1 - firing / 100);
        expect(totalFactor).toBeCloseTo(composedFactor, 10);
    });

    it("0% total with 0% stages returns 0% firing", () => {
        expect(deriveFiringPercent(0, 0, 0)).toBe(0);
    });
});
