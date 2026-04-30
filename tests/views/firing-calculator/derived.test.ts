import { describe, it, expect, beforeEach } from "bun:test";
import { computeDerived } from "../../../source/views/firing-calculator/derived";
import { DIMENSION_UNITS, WEIGHT_UNITS } from "../../../source/views/firing-calculator/types";
import { resetState, setStudio, setPieces, makePiece } from "./helpers";

beforeEach(() => resetState());


// rateUnit
describe("rateUnit matches rateUnitFor(basis, dimensionUnit, weightUnit)", () => {
    it("volume/in yields cents per cubic inch", () => {
        setStudio({ basis: "volume", dimensionUnit: "in" });
        expect(computeDerived().rateUnit).toBe("¢/in³");
    });

    it("footprint/cm yields cents per square centimeter", () => {
        setStudio({ basis: "footprint", dimensionUnit: "cm" });
        expect(computeDerived().rateUnit).toBe("¢/cm²");
    });

    it("weight/lb yields dollars per pound", () => {
        setStudio({ basis: "weight", weightUnit: "lb" });
        expect(computeDerived().rateUnit).toBe("$/lb");
    });
});


// rateStep
describe("rateStep is 0.1 for cents bases, 0.05 for dollar bases", () => {
    it("volume gets 0.1", () => {
        setStudio({ basis: "volume" });
        expect(computeDerived().rateStep).toBe(0.1);
    });

    it("footprint gets 0.1", () => {
        setStudio({ basis: "footprint" });
        expect(computeDerived().rateStep).toBe(0.1);
    });

    it("weight gets 0.05", () => {
        setStudio({ basis: "weight" });
        expect(computeDerived().rateStep).toBe(0.05);
    });
});


// showRounding
describe("showRounding is true for volume and footprint, false for weight", () => {
    it("volume shows rounding", () => {
        setStudio({ basis: "volume" });
        expect(computeDerived().showRounding).toBe(true);
    });

    it("footprint shows rounding", () => {
        setStudio({ basis: "footprint" });
        expect(computeDerived().showRounding).toBe(true);
    });

    it("weight hides rounding", () => {
        setStudio({ basis: "weight" });
        expect(computeDerived().showRounding).toBe(false);
    });
});


// showMinHeight
describe("showMinHeight is true only for volume", () => {
    it("volume shows min height", () => {
        setStudio({ basis: "volume" });
        expect(computeDerived().showMinHeight).toBe(true);
    });

    it("footprint hides min height", () => {
        setStudio({ basis: "footprint" });
        expect(computeDerived().showMinHeight).toBe(false);
    });

    it("weight hides min height", () => {
        setStudio({ basis: "weight" });
        expect(computeDerived().showMinHeight).toBe(false);
    });
});


// activeUnitSet
describe("activeUnitSet selects dimension units for volume/footprint, weight units for weight", () => {
    it("volume uses DIMENSION_UNITS", () => {
        setStudio({ basis: "volume" });
        expect(computeDerived().activeUnitSet).toBe(DIMENSION_UNITS);
    });

    it("footprint uses DIMENSION_UNITS", () => {
        setStudio({ basis: "footprint" });
        expect(computeDerived().activeUnitSet).toBe(DIMENSION_UNITS);
    });

    it("weight uses WEIGHT_UNITS", () => {
        setStudio({ basis: "weight" });
        expect(computeDerived().activeUnitSet).toBe(WEIGHT_UNITS);
    });
});


// activeUnit
describe("activeUnit reflects dimensionUnit for volume/footprint, weightUnit for weight", () => {
    it("volume returns the dimension unit", () => {
        setStudio({ basis: "volume", dimensionUnit: "cm" });
        expect(computeDerived().activeUnit).toBe("cm");
    });

    it("footprint returns the dimension unit", () => {
        setStudio({ basis: "footprint", dimensionUnit: "mm" });
        expect(computeDerived().activeUnit).toBe("mm");
    });

    it("weight returns the weight unit", () => {
        setStudio({ basis: "weight", weightUnit: "oz" });
        expect(computeDerived().activeUnit).toBe("oz");
    });
});


// totalQuantityUnit
describe("totalQuantityUnit formats the display-unit suffix", () => {
    it("volume/in yields cubic inches", () => {
        setStudio({ basis: "volume", dimensionUnit: "in" });
        expect(computeDerived().totalQuantityUnit).toBe("in³");
    });

    it("footprint/cm yields square centimeters", () => {
        setStudio({ basis: "footprint", dimensionUnit: "cm" });
        expect(computeDerived().totalQuantityUnit).toBe("cm²");
    });

    it("weight/lb yields pounds", () => {
        setStudio({ basis: "weight", weightUnit: "lb" });
        expect(computeDerived().totalQuantityUnit).toBe("lb");
    });

    it("weight/kg yields kilograms", () => {
        setStudio({ basis: "weight", weightUnit: "kg" });
        expect(computeDerived().totalQuantityUnit).toBe("kg");
    });
});


// heightBelowMin
describe("heightBelowMin flags pieces whose H is below studio minHeight", () => {
    it("true when piece H is below minHeight on volume basis", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "2" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(true);
    });

    it("false when piece H equals minHeight", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "3" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("false when piece H exceeds minHeight", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "5" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("false when H is zero (incomplete dimension)", () => {
        setStudio({ basis: "volume", minHeight: 3 });
        setPieces([makePiece({ L: "5", W: "5", H: "0" })]);
        expect(computeDerived().pieces[0].heightBelowMin).toBe(false);
    });

    it("false when minHeight is zero (floor disabled)", () => {
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
