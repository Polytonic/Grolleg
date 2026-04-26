import { describe, it, expect, beforeEach } from "bun:test";
import {
    state,
    handleMinHeightInput, handleBasisChange,
    handleFiringRateInput, handleBundledRateInput,
    handleRoundingChange,
    toDisplayRate,
} from "../../../source/views/firing-calculator/state";
import { resetState, mockInputEvent } from "./helpers";

beforeEach(() => resetState());


/* ── handleMinHeightInput ── */

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

    it("clamps non-numeric input to 0", () => {
        state.minHeight = 5;
        handleMinHeightInput(mockInputEvent("abc"));
        expect(state.minHeight).toBe(0);
    });

    it("caps astronomical pasted exponents at the upper bound", () => {
        // A user pasting "1e10" or similar shouldn't be able to make every
        // piece's billed quantity astronomical.
        handleMinHeightInput(mockInputEvent("1e10"));
        expect(state.minHeight).toBeLessThanOrEqual(100);
    });

    it("preserves values within the realistic shelf-interval range", () => {
        handleMinHeightInput(mockInputEvent("12"));
        expect(state.minHeight).toBe(12);
    });
});


/* ── handleRoundingChange ── */

describe("handleRoundingChange", () => {
    it("updates the rounding mode from the select event", () => {
        handleRoundingChange(mockInputEvent("total-ceil"));
        expect(state.rounding).toBe("total-ceil");
    });
});


/* ── Rate Inputs ── */

describe("handleFiringRateInput", () => {
    it("converts cents-display values back to stored dollars on volume basis", () => {
        // Volume basis: rate stored in dollars, displayed as cents.
        // User types "8" -> stored 0.08.
        state.basis = "volume";
        handleFiringRateInput("bisque", mockInputEvent("8"));
        expect(state.firingRates.bisque).toBeCloseTo(0.08);
    });

    it("stores weight rates 1:1 (no cents conversion)", () => {
        state.basis = "weight";
        handleFiringRateInput("luster", mockInputEvent("3.5"));
        expect(state.firingRates.luster).toBeCloseTo(3.5);
    });

    it("non-numeric input stores as 0", () => {
        state.basis = "volume";
        handleFiringRateInput("bisque", mockInputEvent("not a number"));
        expect(state.firingRates.bisque).toBe(0);
    });

    it("clamps negatives to 0 (input min='0' is validation, not coercion)", () => {
        state.basis = "volume";
        handleFiringRateInput("bisque", mockInputEvent("-5"));
        expect(state.firingRates.bisque).toBe(0);
    });

    it("clamps absurd values like a pasted '1e10' to MAX_DISPLAY_RATE", () => {
        state.basis = "volume";
        handleFiringRateInput("bisque", mockInputEvent("1e10"));
        // MAX_DISPLAY_RATE = 1000 in display units; for volume that's
        // stored as 1000 / 100 = 10 dollars per in³. Far below the
        // hundred-billion-dollar bill the unclamped path produced.
        expect(state.firingRates.bisque).toBe(10);
    });
});

describe("handleBundledRateInput", () => {
    it("stores bundled rate via the same conversion as individual rates", () => {
        state.basis = "volume";
        handleBundledRateInput(mockInputEvent("6"));
        expect(state.bundledRate).toBeCloseTo(0.06);
        // Round-trip through display.
        expect(toDisplayRate(state.bundledRate, "volume")).toBeCloseTo(6);
    });
});


/* ── handleBasisChange Edge ── */

describe("handleBasisChange", () => {
    it("re-selecting the current basis is a no-op", () => {
        state.basis = "volume";
        const beforeRates = { ...state.firingRates };
        handleBasisChange(mockInputEvent("volume"));
        expect(state.firingRates).toEqual(beforeRates);
    });
});
