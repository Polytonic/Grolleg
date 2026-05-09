import { describe, it, expect, beforeEach } from "bun:test";
import { computeDerived } from "../../../source/views/firing-calculator/derived";
import { DIMENSION_UNITS, WEIGHT_UNITS } from "../../../source/views/firing-calculator/types";
import { resetState, setStudio, setPieces, makePiece } from "./helpers";

beforeEach(() => resetState());


// Rate Unit
describe("derived rate unit follows the billing basis and display unit", () => {
    const cases = [
        {
            label: "volume/in yields cents per cubic inch",
            studio: { basis: "volume", dimensionUnit: "in" },
            rateUnit: "¢/in³",
        },
        {
            label: "footprint/cm yields cents per square centimeter",
            studio: { basis: "footprint", dimensionUnit: "cm" },
            rateUnit: "¢/cm²",
        },
        {
            label: "weight/lb yields dollars per pound",
            studio: { basis: "weight", weightUnit: "lb" },
            rateUnit: "$/lb",
        },
    ] as const;

    for (const { label, studio, rateUnit } of cases) {
        it(label, () => {
            setStudio(studio);
            expect(computeDerived().rateUnit).toBe(rateUnit);
        });
    }
});


// Basis Visibility
describe("derived visibility follows the billing basis", () => {
    const cases = [
        { basis: "volume", showRounding: true, showMinHeight: true },
        { basis: "footprint", showRounding: true, showMinHeight: false },
        { basis: "weight", showRounding: false, showMinHeight: false },
    ] as const;

    for (const { basis, showRounding, showMinHeight } of cases) {
        it(`${basis} visibility`, () => {
            setStudio({ basis });
            const derived = computeDerived();
            expect(derived.showRounding).toBe(showRounding);
            expect(derived.showMinHeight).toBe(showMinHeight);
        });
    }
});


// Active Units
describe("active units follow the billing basis", () => {
    const cases = [
        {
            label: "volume uses dimension units and current dimension unit",
            studio: { basis: "volume", dimensionUnit: "cm" },
            activeUnitSet: DIMENSION_UNITS,
            activeUnit: "cm",
        },
        {
            label: "footprint uses dimension units and current dimension unit",
            studio: { basis: "footprint", dimensionUnit: "mm" },
            activeUnitSet: DIMENSION_UNITS,
            activeUnit: "mm",
        },
        {
            label: "weight uses weight units and current weight unit",
            studio: { basis: "weight", weightUnit: "oz" },
            activeUnitSet: WEIGHT_UNITS,
            activeUnit: "oz",
        },
    ] as const;

    for (const { label, studio, activeUnitSet, activeUnit } of cases) {
        it(label, () => {
            setStudio(studio);
            const derived = computeDerived();
            expect(derived.activeUnitSet).toBe(activeUnitSet);
            expect(derived.activeUnit).toBe(activeUnit);
        });
    }
});


// Total Quantity Unit
describe("total quantity suffix follows the display unit", () => {
    const cases = [
        {
            label: "volume/in yields cubic inches",
            studio: { basis: "volume", dimensionUnit: "in" },
            totalQuantityUnit: "in³",
        },
        {
            label: "footprint/cm yields square centimeters",
            studio: { basis: "footprint", dimensionUnit: "cm" },
            totalQuantityUnit: "cm²",
        },
        { label: "weight/lb yields pounds", studio: { basis: "weight", weightUnit: "lb" }, totalQuantityUnit: "lb" },
        { label: "weight/kg yields kilograms", studio: { basis: "weight", weightUnit: "kg" }, totalQuantityUnit: "kg" },
    ] as const;

    for (const { label, studio, totalQuantityUnit } of cases) {
        it(label, () => {
            setStudio(studio);
            expect(computeDerived().totalQuantityUnit).toBe(totalQuantityUnit);
        });
    }
});


// Minimum Height Warnings
describe("minimum-height warnings flag only short volume pieces", () => {
    it("true when piece height is below the studio minimum on volume basis", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "2" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(true);
    });

    it("false when piece height equals the studio minimum", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "3" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("false when piece height exceeds the studio minimum", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "5" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("false when H is zero (incomplete dimension)", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "0" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("false when minimum height is zero (floor disabled)", () => {
        setStudio({ basis: "volume", minHeight: 0 });
        setPieces([makePiece({ L: "5", W: "5", H: "1" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("always false on footprint basis regardless of H", () => {
        setStudio({ basis: "footprint", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "1" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("always false on weight basis", () => {
        setStudio({ basis: "weight", minHeight: 3 });
        setPieces([makePiece({ weight: "1" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("flags independently per piece", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([
            makePiece({ L: "5", W: "5", H: "2" }),
            makePiece({ L: "5", W: "5", H: "5" }),
        ]);
        const derived = computeDerived();
        expect(derived.pieces[0].heightBelowMin).toBe(true);
        expect(derived.pieces[1].heightBelowMin).toBe(false);
    });
});
