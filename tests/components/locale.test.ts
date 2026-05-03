import { describe, it, expect } from "bun:test";
import {
    parseLocaleNumber,
    detectDefaultDimensionUnit,
    detectDefaultWeightUnit,
    formatNumber,
    decimalFormat,
} from "../../source/components/locale";


// parseLocaleNumber
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

    it("1.234 (dot-only) is ambiguous — parser treats dot as decimal, not thousands", () => {
        expect(parseLocaleNumber("1.234")).toBe(1.234);
    });

    it("non-numeric text returns NaN", () => {
        expect(parseLocaleNumber("abc")).toBeNaN();
    });
});

describe("parseLocaleNumber — ambiguous comma input", () => {
    it("1,234 → thousands (3 digits after comma, no dot)", () => {
        expect(parseLocaleNumber("1,234")).toBe(1234);
    });

    it("1,234,567 → thousands (multiple commas, 3 digits after last)", () => {
        expect(parseLocaleNumber("1,234,567")).toBe(1234567);
    });

    it("12,345 → thousands (3 digits after comma)", () => {
        expect(parseLocaleNumber("12,345")).toBe(12345);
    });

    it("100,000 → thousands (3 digits after comma)", () => {
        expect(parseLocaleNumber("100,000")).toBe(100000);
    });

    it("1,23 → European decimal (2 digits after comma)", () => {
        expect(parseLocaleNumber("1,23")).toBe(1.23);
    });

    it("1,5 → European decimal (1 digit after comma)", () => {
        expect(parseLocaleNumber("1,5")).toBe(1.5);
    });

    it("0,5 → European decimal (1 digit after comma)", () => {
        expect(parseLocaleNumber("0,5")).toBe(0.5);
    });

    it("1,2345 → European decimal (4 digits after comma)", () => {
        expect(parseLocaleNumber("1,2345")).toBe(1.2345);
    });
});


// Region Detection
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


// formatNumber
describe("formatNumber", () => {
    it("formats with two decimal places", () => {
        expect(formatNumber(12.5)).toBe("12.50");
    });

    it("null returns en dash", () => {
        expect(formatNumber(null)).toBe("\u2013");
    });

    it("NaN returns en dash", () => {
        expect(formatNumber(NaN)).toBe("\u2013");
    });

    it("Infinity returns en dash", () => {
        expect(formatNumber(Infinity)).toBe("\u2013");
    });

    it("negative Infinity returns en dash", () => {
        expect(formatNumber(-Infinity)).toBe("\u2013");
    });

    it("zero formats with decimals", () => {
        expect(formatNumber(0)).toBe("0.00");
    });

    it("negative zero preserves sign (IEEE 754)", () => {
        expect(formatNumber(-0)).toBe("-0.00");
    });
});


// decimalFormat
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
