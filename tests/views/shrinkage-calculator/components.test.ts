import { describe, it, expect, beforeEach } from "bun:test";
import mq from "mithril-query";
import { state, computeDerived } from "../../../source/views/shrinkage-calculator/state";
import { ShrinkageCalculatorView } from "../../../source/views/shrinkage-calculator/shrinkage-calculator";
import { ClayControls } from "../../../source/views/shrinkage-calculator/controls";
import { ClayBodyField, ShrinkageField } from "../../../source/views/shrinkage-calculator/clay-selection";
import { ResultsCard } from "../../../source/views/shrinkage-calculator/results";
import { StageInputs } from "../../../source/views/shrinkage-calculator/shrinkage-stages";
import { resetState } from "../../helpers";

beforeEach(() => resetState());


// Orchestrator layout

describe("ShrinkageCalculatorView", () => {
    it("renders title and subtitle", () => {
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.contain("Shrinkage Calculator"));
        expect(output.should.contain("Convert between wet and fired dimensions"));
    });

    it("shows hint box with no dimensions", () => {
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.have(".hint-box"));
        expect(output.should.contain("Enter dimensions to see results"));
    });

    it("hint adapts when only dimensions entered (no shrinkage)", () => {
        state.shrinkage = "";
        state.dimensions = ["100", "200"];
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.contain("Enter a shrinkage rate to see results"));
    });

    it("hint adapts when nothing entered", () => {
        state.shrinkage = "";
        state.dimensions = ["", ""];
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.contain("Enter a shrinkage rate and dimensions to see results"));
    });

    it("results replace hint box when both inputs provided", () => {
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.not.have(".hint-box"));
        expect(output.should.have(".results-card"));
    });

    it("disclaimer appears with results", () => {
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.contain("Actual shrinkage depends on your specific clay"));
    });

    it("disclaimer hidden without results", () => {
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.not.contain("Actual shrinkage depends"));
    });

    it("stage inputs appear when checkbox enabled", () => {
        state.showStages = true;
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.have(".stage-inputs"));
    });

    it("stage inputs hidden when checkbox disabled", () => {
        state.showStages = false;
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.not.have(".stage-inputs"));
    });

    it("timeline appears with stages enabled and all dimensions", () => {
        state.showStages = true;
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.contain("Shrinkage stages"));
    });

    it("checkbox label reads correctly", () => {
        const output = mq(ShrinkageCalculatorView);
        expect(output.should.contain("Show shrinkage rate by stage"));
    });
});


// Clay body and shrinkage controls

describe("ClayBodyField", () => {
    it("renders preset dropdown with optgroups", () => {
        const output = mq(ClayBodyField);
        expect(output.should.have("#clay-body"));
        expect(output.should.contain("Stoneware (Cone 6)"));
        expect(output.should.contain("Custom"));
    });

    it("contains tooltip help button", () => {
        const output = mq(ClayBodyField);
        expect(output.should.contain("?"));
    });
});

describe("ShrinkageField", () => {
    it("renders shrinkage input", () => {
        const derived = computeDerived();
        const output = mq(ShrinkageField, { derived });
        expect(output.should.have("#shrinkage-rate"));
        expect(output.should.contain("Shrinkage Rate"));
    });

    it("shows error when invalid and touched", () => {
        state.shrinkage = "";
        state.shrinkTouched = true;
        const derived = computeDerived();
        const output = mq(ShrinkageField, { derived });
        expect(output.should.have(".error"));
        expect(output.should.contain("Enter a number greater than 0 and less than 100"));
    });

    it("hides error when valid", () => {
        state.shrinkage = "12";
        state.shrinkTouched = true;
        const derived = computeDerived();
        const output = mq(ShrinkageField, { derived });
        expect(output.should.not.have(".error"));
    });
});


// Shape, direction, and dimension controls

describe("ClayControls", () => {
    it("renders all shape options", () => {
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.contain("Linear"));
        expect(output.should.contain("Cylinder"));
        expect(output.should.contain("Rectangle"));
    });

    it("renders direction options", () => {
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.contain("Fired → Wet"));
        expect(output.should.contain("Wet → Fired"));
    });

    it("section title reflects direction", () => {
        state.direction = "fired-to-wet";
        expect(mq(ClayControls, { derived: computeDerived() }).should.contain("Enter fired dimensions"));

        state.direction = "wet-to-fired";
        expect(mq(ClayControls, { derived: computeDerived() }).should.contain("Enter wet dimensions"));
    });

    it("Cylinder renders Diameter and Height inputs", () => {
        state.shapeIndex = 1;
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.have("#dimension-diameter"));
        expect(output.should.have("#dimension-height"));
    });

    it("Rectangle renders Length, Width, and Height inputs", () => {
        state.shapeIndex = 2;
        state.dimensions = ["", "", ""];
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.have("#dimension-length"));
        expect(output.should.have("#dimension-width"));
        expect(output.should.have("#dimension-height"));
    });

    it("Linear renders only Length input", () => {
        state.shapeIndex = 0;
        state.dimensions = [""];
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.have("#dimension-length"));
        expect(output.should.not.have("#dimension-diameter"));
        expect(output.should.not.have("#dimension-width"));
    });

    it("unit toggle shows all three units", () => {
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.contain("mm"));
        expect(output.should.contain("cm"));
        expect(output.should.contain("in"));
    });

    it("active shape pill has active class", () => {
        state.shapeIndex = 1;
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.have(".shape-pill.active"));
    });

    it("shape pills have aria-pressed", () => {
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.have("[aria-pressed]"));
    });

    it("direction pills have aria-label", () => {
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.have("[aria-label]"));
    });

    it("section has role group", () => {
        const output = mq(ClayControls, { derived: computeDerived() });
        expect(output.should.have("[role]"));
    });
});


// Results

describe("ResultsCard", () => {
    it("header reflects direction", () => {
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];

        state.direction = "fired-to-wet";
        expect(mq(ResultsCard, { derived: computeDerived() }).should.contain("Wet dimensions"));

        state.direction = "wet-to-fired";
        expect(mq(ResultsCard, { derived: computeDerived() }).should.contain("Fired dimensions"));
    });

    it("shows dimension labels matching shape", () => {
        state.shapeIndex = 1;
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const output = mq(ResultsCard, { derived: computeDerived() });
        expect(output.should.contain("Diameter"));
        expect(output.should.contain("Height"));
    });

    it("volumetric shrinkage shown for cylinder", () => {
        state.shapeIndex = 1;
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        expect(mq(ResultsCard, { derived: computeDerived() }).should.contain("Volumetric shrinkage"));
    });

    it("volumetric shrinkage hidden for linear", () => {
        state.shapeIndex = 0;
        state.shrinkage = "12";
        state.dimensions = ["100"];
        expect(mq(ResultsCard, { derived: computeDerived() }).should.not.contain("Volumetric shrinkage"));
    });

    it("empty result shows em dash", () => {
        state.shrinkage = "12";
        state.dimensions = ["100", ""];
        const output = mq(ResultsCard, { derived: computeDerived() });
        expect(output.should.have(".result-value.empty"));
    });
});


// Shrinkage stages

describe("StageInputs", () => {
    it("renders all three stage fields", () => {
        state.showStages = true;
        const output = mq(StageInputs, { derived: computeDerived() });
        expect(output.should.contain("Greenware"));
        expect(output.should.contain("Bisque"));
        expect(output.should.contain("Fired"));
    });

    it("renders progression hints", () => {
        state.showStages = true;
        const output = mq(StageInputs, { derived: computeDerived() });
        expect(output.should.contain("Wet → Bone Dry"));
        expect(output.should.contain("Bone Dry → Bisque"));
        expect(output.should.contain("Bisque → Fired"));
    });

    it("warning when stages exceed total", () => {
        state.showStages = true;
        state.shrinkage = "12";
        state.greenwareShrinkage = "8";
        state.bisqueShrinkage = "6";
        const output = mq(StageInputs, { derived: computeDerived() });
        expect(output.should.contain("exceeds total shrinkage rate"));
    });

    it("no warning when stages are valid", () => {
        state.showStages = true;
        state.shrinkage = "12";
        state.greenwareShrinkage = "6";
        state.bisqueShrinkage = "0.75";
        const output = mq(StageInputs, { derived: computeDerived() });
        expect(output.should.not.contain("exceeds"));
    });

    it("has greenware and bisque input fields", () => {
        state.showStages = true;
        const output = mq(StageInputs, { derived: computeDerived() });
        expect(output.should.have("#greenware-percent"));
        expect(output.should.have("#bisque-percent"));
    });

    it("fired percentage is read-only (derived value, not input)", () => {
        state.showStages = true;
        const output = mq(StageInputs, { derived: computeDerived() });
        expect(output.should.have(".derived-value"));
        expect(output.should.not.have("#fired-percent"));
    });

    it("fired percentage has live region for screen readers", () => {
        state.showStages = true;
        const output = mq(StageInputs, { derived: computeDerived() });
        expect(output.should.have("[role]"));
        expect(output.should.have("[aria-live]"));
    });
});
