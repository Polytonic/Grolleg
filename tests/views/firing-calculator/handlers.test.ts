import { describe, it, expect, beforeEach } from "bun:test";
import { toDisplayRate } from "../../../source/views/firing-calculator/pricing";
import {
    state,
    handleMinHeightInput, handleBasisChange,
    handleFiringRateInput, handleBundledRateInput,
    handleRoundingChange,
} from "../../../source/views/firing-calculator/state";
import { resetState, mockInputEvent } from "./helpers";

beforeEach(() => resetState());


// Handle Min Height Input
describe("handleMinHeightInput", () => {
    it("parses a positive number and stores it", () => {
        handleMinHeightInput(mockInputEvent("3.5"));
        expect(state.minHeight).toBe(3.5);
    });

    it("treats empty input as 0 (disables the floor)", () => {
        state.minHeight = 5;
        handleMinHeightInput(mockInputEvent(""));
        expect(state.minHeight).toBe(0);
    });

    it("clamps negative input to 0", () => {
        state.minHeight = 5;
        handleMinHeightInput(mockInputEvent("-3"));
        expect(state.minHeight).toBe(0);
    });

    it("leaves previous value for non-numeric input", () => {
        state.minHeight = 5;
        handleMinHeightInput(mockInputEvent("abc"));
        expect(state.minHeight).toBe(5);
    });

    it("leaves previous value for trailing junk input", () => {
        state.minHeight = 5;
        handleMinHeightInput(mockInputEvent("12cm"));
        expect(state.minHeight).toBe(5);
    });

    it("clamps pasted exponent input to the exact upper bound", () => {
        // Pasted exponent input must not make every piece's billed quantity
        // astronomical.
        handleMinHeightInput(mockInputEvent("1e10"));
        expect(state.minHeight).toBe(100);
    });

    it("preserves values within the realistic shelf-interval range", () => {
        handleMinHeightInput(mockInputEvent("12"));
        expect(state.minHeight).toBe(12);
    });

    it("accepts the exact upper bound", () => {
        handleMinHeightInput(mockInputEvent("100"));
        expect(state.minHeight).toBe(100);
    });

    it("clamps one above the upper bound", () => {
        handleMinHeightInput(mockInputEvent("101"));
        expect(state.minHeight).toBe(100);
    });
});


// Handle Rounding Change
describe("handleRoundingChange", () => {
    it("updates the rounding mode from the select event", () => {
        handleRoundingChange(mockInputEvent("total-ceil"));
        expect(state.rounding).toBe("total-ceil");
    });
});


// Rate Inputs
describe("handleFiringRateInput", () => {
    it("converts cents-display values back to stored dollars on volume basis", () => {
        // Volume basis: rate stored in dollars, displayed as cents.
        // Input "8" should store 0.08.
        state.basis = "volume";
        handleFiringRateInput("bisque", mockInputEvent("8"));
        expect(state.firingRates.bisque).toBeCloseTo(0.08);
    });

    it("stores weight rates 1:1 (no cents conversion)", () => {
        state.basis = "weight";
        handleFiringRateInput("luster", mockInputEvent("3.5"));
        expect(state.firingRates.luster).toBeCloseTo(3.5);
    });

    it("non-numeric input leaves the previous rate unchanged", () => {
        state.basis = "volume";
        state.firingRates.bisque = 0.04;
        handleFiringRateInput("bisque", mockInputEvent("not a number"));
        expect(state.firingRates.bisque).toBe(0.04);
    });

    it("trailing junk input leaves the previous rate unchanged", () => {
        state.basis = "volume";
        state.firingRates.bisque = 0.04;
        handleFiringRateInput("bisque", mockInputEvent("12abc"));
        expect(state.firingRates.bisque).toBe(0.04);
    });

    it("clamps negatives to 0 (input min='0' is validation, not coercion)", () => {
        state.basis = "volume";
        handleFiringRateInput("bisque", mockInputEvent("-5"));
        expect(state.firingRates.bisque).toBe(0);
    });

    it("clamps absurd values like a pasted '1e10' to MAX_DISPLAY_RATE", () => {
        state.basis = "volume";
        handleFiringRateInput("bisque", mockInputEvent("1e10"));
        // MAX_DISPLAY_RATE = 1000 in display units. For volume that is
        // stored as 1000 / 100 = 10 dollars per in³. Far below the
        // hundred-billion-dollar bill the unclamped path produced.
        expect(state.firingRates.bisque).toBe(10);
    });
});

describe("handleBundledRateInput", () => {
    it("stores bundled rate in firingRates.bundled via the same conversion as individual rates", () => {
        state.basis = "volume";
        handleBundledRateInput(mockInputEvent("6"));
        expect(state.firingRates.bundled).toBeCloseTo(0.06);
        expect(toDisplayRate(state.firingRates.bundled, "volume")).toBeCloseTo(6);
    });

    it("trailing junk input leaves the previous bundled rate unchanged", () => {
        state.basis = "volume";
        state.firingRates.bundled = 0.06;
        handleBundledRateInput(mockInputEvent("12abc"));
        expect(state.firingRates.bundled).toBe(0.06);
    });
});
