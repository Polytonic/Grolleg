import { describe, it, expect } from "bun:test";
import {
    parseLocaleNumber,
    detectDefaultDimensionUnit,
    detectDefaultWeightUnit,
    formatNumber,
    decimalFormat,
} from "../../source/components/locale";


/* ── parseLocaleNumber ── */

describe("parseLocaleNumber", () => {
    it("12.5 (US decimal)", () => {
        expect(parseLocaleNumber("12.5")).toBe(12.5);
    });

    it("12,5 (European decimal)", () => {
        expect(parseLocaleNumber("12,5")).toBe(12.5);
    });

    it("100 (integer)", () => {
        expect(parseLocaleNumber("100")).toBe(100);
    });

    it("1,500.75 (US thousands)", () => {
        expect(parseLocaleNumber("1,500.75")).toBe(1500.75);
    });

    it("1.500,75 (European thousands)", () => {
        expect(parseLocaleNumber("1.500,75")).toBe(1500.75);
    });

    it("1.234,56 treats comma as decimal (comma last)", () => {
        expect(parseLocaleNumber("1.234,56")).toBe(1234.56);
    });

    it("1,234.56 treats dot as decimal (dot last)", () => {
        expect(parseLocaleNumber("1,234.56")).toBe(1234.56);
    });

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


/* ── Region Detection ── */

describe("detectDefaultDimensionUnit", () => {
    it("returns a valid dimension unit", () => {
        const unit = detectDefaultDimensionUnit();
        expect(["mm", "cm", "in"]).toContain(unit);
    });
});

describe("detectDefaultWeightUnit", () => {
    it("returns a valid weight unit", () => {
        const unit = detectDefaultWeightUnit();
        expect(["g", "kg", "oz", "lb"]).toContain(unit);
    });
});


/* ── formatNumber ── */

describe("formatNumber", () => {
    it("formats with two decimal places", () => {
        const result = formatNumber(12.5);
        expect(result).toContain("12");
        expect(result).toContain("50");
    });

    it("null returns em dash", () => {
        expect(formatNumber(null)).toBe("\u2014");
    });

    it("NaN returns em dash", () => {
        expect(formatNumber(NaN)).toBe("\u2014");
    });

    it("Infinity returns em dash", () => {
        expect(formatNumber(Infinity)).toBe("\u2014");
    });

    it("zero formats with decimals", () => {
        expect(formatNumber(0)).toContain("0");
    });
});


/* ── decimalFormat ── */

describe("decimalFormat", () => {
    it("formats with two decimal places", () => {
        const result = decimalFormat.format(3.5);
        expect(result).toContain("3");
        expect(result).toContain("50");
    });

    it("rounds to two decimals", () => {
        const result = decimalFormat.format(1.999);
        expect(result).toContain("2");
    });
});
