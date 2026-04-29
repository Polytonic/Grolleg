import { describe, it, expect, beforeEach } from "bun:test";
import {
    state,
    handlePresetChange, handleShrinkageInput, handleShrinkageBlur,
    handleStageToggle, handleGreenwareInput, handleBisqueInput,
    handleShapeChange, handleDirectionChange, handleUnitChange,
    handleDimensionInput, handleDimensionKey,
} from "../../../source/views/shrinkage-calculator/state";
import { computeDerived } from "../../../source/views/shrinkage-calculator/derived";
import { resetState, mockInputEvent, mockCheckboxEvent, mockSelectEvent, mockKeyboardEvent } from "../../helpers";

import { PRESET_GROUPS } from "../../../source/views/shrinkage-calculator/state";

beforeEach(() => resetState());


// Preset Data

describe("PRESET_GROUPS", () => {
    it("has Generic and Popular Clays groups", () => {
        expect(PRESET_GROUPS.length).toBe(2);
        expect(PRESET_GROUPS[0].label).toBe("Generic");
        expect(PRESET_GROUPS[1].label).toBe("Popular Clays");
    });

    it("Custom preset is in the Generic group", () => {
        const generic = PRESET_GROUPS[0];
        const custom = generic.options.find((option) => option.name === "Custom");
        expect(custom).toBeDefined();
        expect(custom!.total).toBe("");
    });
});


// Shrinkage Validation

describe("shrinkage validation", () => {
    it("12% is valid", () => {
        state.shrinkage = "12";
        state.shrinkageTouched = true;
        expect(computeDerived().shrinkageInvalid).toBe(false);
    });

    it("empty string is invalid when touched", () => {
        state.shrinkage = "";
        state.shrinkageTouched = true;
        expect(computeDerived().shrinkageInvalid).toBe(true);
    });

    it("error hidden until blur (shrinkageTouched = false)", () => {
        state.shrinkage = "";
        state.shrinkageTouched = false;
        expect(computeDerived().shrinkageInvalid).toBe(false);
    });

    it("0% rejected (must be > 0)", () => {
        state.shrinkage = "0";
        expect(computeDerived().totalValid).toBe(false);
    });

    it("100% rejected (must be < 100)", () => {
        state.shrinkage = "100";
        expect(computeDerived().totalValid).toBe(false);
    });

    it("negative rejected", () => {
        state.shrinkage = "-5";
        expect(computeDerived().totalValid).toBe(false);
    });

    it("non-numeric rejected", () => {
        state.shrinkage = "abc";
        expect(computeDerived().totalValid).toBe(false);
    });

    it("0.1% valid (lower boundary)", () => {
        state.shrinkage = "0.1";
        expect(computeDerived().totalValid).toBe(true);
    });

    it("99.9% valid (upper boundary)", () => {
        state.shrinkage = "99.9";
        expect(computeDerived().totalValid).toBe(true);
    });
});


// Dimension Results

describe("dimension results", () => {
    it("wet-to-fired applies shrinkage", () => {
        state.direction = "wet-to-fired";
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const derived = computeDerived();
        expect(derived.firedResults![0]).toBeCloseTo(88, 1);
        expect(derived.firedResults![1]).toBeCloseTo(176, 1);
    });

    it("fired-to-wet reverses shrinkage", () => {
        state.direction = "fired-to-wet";
        state.shrinkage = "12";
        state.dimensions = ["88", "176"];
        const derived = computeDerived();
        expect(derived.firedResults![0]).toBeCloseTo(100, 0);
        expect(derived.firedResults![1]).toBeCloseTo(200, 0);
    });

    it("partial entry shows per-dimension results", () => {
        state.shrinkage = "12";
        state.dimensions = ["100", ""];
        const derived = computeDerived();
        expect(derived.anyResults).toBe(true);
        expect(derived.firedResults![0]).not.toBeNull();
        expect(derived.firedResults![1]).toBeNull();
    });

    it("partial entry blocks volume and timeline", () => {
        state.shrinkage = "12";
        state.dimensions = ["100", ""];
        const derived = computeDerived();
        expect(derived.wetDimensions).toBeNull();
        expect(derived.finalDimensions).toBeNull();
        expect(derived.volumeShrink).toBeNull();
    });

    it("no results without valid shrinkage", () => {
        state.shrinkage = "";
        state.dimensions = ["100", "200"];
        const derived = computeDerived();
        expect(derived.anyResults).toBe(false);
        expect(derived.firedResults).toBeNull();
    });

    it("zero dimension returns null for that field", () => {
        state.shrinkage = "12";
        state.dimensions = ["0", "100"];
        expect(computeDerived().firedResults![0]).toBeNull();
    });

    it("negative dimension returns null for that field", () => {
        state.shrinkage = "12";
        state.dimensions = ["-5", "100"];
        expect(computeDerived().firedResults![0]).toBeNull();
    });
});


// Volumetric Shrinkage

describe("volumetric shrinkage", () => {
    it("computed for cylinder", () => {
        state.direction = "wet-to-fired";
        state.shrinkage = "12";
        state.shapeIndex = 1;
        state.dimensions = ["100", "200"];
        const volume = computeDerived().volumeShrink!;
        expect(volume).toBeGreaterThan(0);
        expect(volume).toBeLessThan(100);
    });

    it("computed for rectangle", () => {
        state.direction = "wet-to-fired";
        state.shrinkage = "12";
        state.shapeIndex = 2;
        state.dimensions = ["100", "200", "50"];
        expect(computeDerived().volumeShrink).not.toBeNull();
    });

    it("null for linear", () => {
        state.shapeIndex = 0;
        state.shrinkage = "12";
        state.dimensions = ["100"];
        expect(computeDerived().volumeShrink).toBeNull();
    });
});


// Shrinkage Stages

describe("shrinkage stages", () => {
    it("computes all stage dimensions when enabled", () => {
        state.showStages = true;
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const derived = computeDerived();
        expect(derived.firingPercent).not.toBeNull();
        expect(derived.boneDryDimensions).not.toBeNull();
        expect(derived.bisqueDimensions).not.toBeNull();
        expect(derived.showStagesCard).toBe(true);
    });

    it("dimensions shrink progressively through stages", () => {
        state.showStages = true;
        state.direction = "wet-to-fired";
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const derived = computeDerived();
        expect(derived.boneDryDimensions![0]).toBeLessThan(derived.wetDimensions![0]);
        expect(derived.bisqueDimensions![0]).toBeLessThan(derived.boneDryDimensions![0]);
        expect(derived.finalDimensions![0]).toBeLessThan(derived.bisqueDimensions![0]);
    });

    it("three-stage composition matches total shrinkage", () => {
        state.direction = "wet-to-fired";
        state.showStages = true;
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const derived = computeDerived();
        expect(derived.finalDimensions![0]).toBeCloseTo(derived.wetDimensions![0] * (1 - 12 / 100), 5);
    });

    it("warning when stages exceed total", () => {
        state.showStages = true;
        state.shrinkage = "12";
        state.greenwareShrinkage = "8";
        state.bisqueShrinkage = "6";
        state.dimensions = ["100", "200"];
        const derived = computeDerived();
        expect(derived.stagesWarning).not.toBeNull();
        expect(derived.showStagesCard).toBe(false);
    });

    it("no warning when stages are consistent", () => {
        state.showStages = true;
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        expect(computeDerived().stagesWarning).toBeNull();
    });

    it("all null when stages disabled", () => {
        state.showStages = false;
        state.shrinkage = "12";
        state.dimensions = ["100", "200"];
        const derived = computeDerived();
        expect(derived.firingPercent).toBeNull();
        expect(derived.boneDryDimensions).toBeNull();
        expect(derived.showStagesCard).toBe(false);
    });
});


// Hint Message Flags

describe("hint message flags", () => {
    it("only shrinkage entered: totalValid true, no dimensions", () => {
        state.shrinkage = "12";
        state.dimensions = ["", ""];
        const derived = computeDerived();
        expect(derived.totalValid).toBe(true);
        expect(derived.anyDimensionsEntered).toBe(false);
    });

    it("only dimensions entered: totalValid false, dimensions present", () => {
        state.shrinkage = "";
        state.dimensions = ["100", ""];
        const derived = computeDerived();
        expect(derived.totalValid).toBe(false);
        expect(derived.anyDimensionsEntered).toBe(true);
    });

    it("nothing entered: both false", () => {
        state.shrinkage = "";
        state.dimensions = ["", ""];
        const derived = computeDerived();
        expect(derived.totalValid).toBe(false);
        expect(derived.anyDimensionsEntered).toBe(false);
    });
});


// Event Handlers: Preset and Shrinkage

describe("handlePresetChange", () => {
    it("populates shrinkage from preset", () => {
        handlePresetChange(mockSelectEvent("0")); // Earthenware Cone 04
        expect(state.presetIndex).toBe(0);
        expect(state.shrinkage).toBe("7");
        expect(state.greenwareShrinkage).toBe("5");
        expect(state.bisqueShrinkage).toBe("0.5");
    });

    it("Custom preset clears shrinkage and resets touched", () => {
        state.shrinkageTouched = true;
        handlePresetChange(mockSelectEvent("4")); // Custom
        expect(state.shrinkage).toBe("");
        expect(state.shrinkageTouched).toBe(false);
    });

    it("selecting preset after error clears the error", () => {
        state.shrinkage = "";
        state.shrinkageTouched = true;
        expect(computeDerived().shrinkageInvalid).toBe(true);

        handlePresetChange(mockSelectEvent("1")); // Stoneware Cone 6
        expect(state.shrinkage).toBe("12");
        expect(computeDerived().shrinkageInvalid).toBe(false);
    });
});

describe("handleShrinkageInput", () => {
    it("updates shrinkage and switches to Custom preset", () => {
        state.presetIndex = 1;
        handleShrinkageInput(mockInputEvent("15"));
        expect(state.shrinkage).toBe("15");
        expect(state.presetIndex).toBe(4); // CUSTOM_INDEX
    });
});

describe("handleShrinkageBlur", () => {
    it("sets shrinkageTouched flag", () => {
        state.shrinkageTouched = false;
        handleShrinkageBlur();
        expect(state.shrinkageTouched).toBe(true);
    });
});


// Event Handlers: Stages

describe("handleStageToggle", () => {
    it("toggles showStages", () => {
        state.showStages = false;
        handleStageToggle(mockCheckboxEvent(true));
        expect(state.showStages).toBe(true);

        handleStageToggle(mockCheckboxEvent(false));
        expect(state.showStages).toBe(false);
    });
});

describe("handleGreenwareInput", () => {
    it("updates greenware and switches to Custom", () => {
        state.presetIndex = 1;
        handleGreenwareInput(mockInputEvent("8"));
        expect(state.greenwareShrinkage).toBe("8");
        expect(state.presetIndex).toBe(4);
    });
});

describe("handleBisqueInput", () => {
    it("updates bisque and switches to Custom", () => {
        state.presetIndex = 1;
        handleBisqueInput(mockInputEvent("1.5"));
        expect(state.bisqueShrinkage).toBe("1.5");
        expect(state.presetIndex).toBe(4);
    });
});


// Event Handlers: Shape, Direction, Unit, Dimensions

describe("handleShapeChange", () => {
    it("Cylinder to Rectangle preserves Height", () => {
        state.shapeIndex = 1;
        state.dimensions = ["100", "200"];
        handleShapeChange(2);
        expect(state.dimensions).toEqual(["", "", "200"]);
    });

    it("Cylinder to Linear loses all fields", () => {
        state.shapeIndex = 1;
        state.dimensions = ["100", "200"];
        handleShapeChange(0);
        expect(state.dimensions).toEqual([""]);
    });

    it("Rectangle to Linear preserves Length", () => {
        state.shapeIndex = 2;
        state.dimensions = ["10", "20", "30"];
        handleShapeChange(0);
        expect(state.dimensions).toEqual(["10"]);
    });

    it("Linear to Cylinder creates empty dimensions", () => {
        state.shapeIndex = 0;
        state.dimensions = ["100"];
        handleShapeChange(1);
        expect(state.dimensions).toEqual(["", ""]);
    });
});

describe("handleDirectionChange", () => {
    it("increments pulseKey when direction changes with dimensions entered", () => {
        state.dimensions = ["100", "200"];
        const before = state.pulseKey;
        handleDirectionChange("wet-to-fired");
        expect(state.direction).toBe("wet-to-fired");
        expect(state.pulseKey).toBe(before + 1);
    });

    it("no pulse when dimensions empty", () => {
        state.dimensions = ["", ""];
        const before = state.pulseKey;
        handleDirectionChange("wet-to-fired");
        expect(state.pulseKey).toBe(before);
    });

    it("no pulse when direction unchanged", () => {
        state.dimensions = ["100", "200"];
        const before = state.pulseKey;
        handleDirectionChange("fired-to-wet");
        expect(state.pulseKey).toBe(before);
    });
});

describe("handleUnitChange", () => {
    it("updates unit without affecting dimensions", () => {
        state.dimensions = ["100", "200"];
        handleUnitChange("in");
        expect(state.unit).toBe("in");
        expect(state.dimensions).toEqual(["100", "200"]);
    });
});

describe("handleDimensionInput", () => {
    it("updates the dimension at the given index", () => {
        state.dimensions = ["", ""];
        handleDimensionInput(0, mockInputEvent("150"));
        expect(state.dimensions[0]).toBe("150");
        expect(state.dimensions[1]).toBe("");
    });
});

describe("handleDimensionKey", () => {
    it("ignores non-Enter keys", () => {
        const event = mockKeyboardEvent("Tab");
        handleDimensionKey(0, event);
        expect(event.defaultPrevented).toBe(false);
    });

    it("prevents default on Enter and blurs last field", () => {
        // Use last field index so handler takes the blur path (no document.getElementById)
        let blurred = false;
        const event = {
            key: "Enter",
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
            currentTarget: { blur() { blurred = true; } },
        } as unknown as KeyboardEvent;

        const lastIndex = state.dimensions.length - 1;
        handleDimensionKey(lastIndex, event);
        expect(event.defaultPrevented).toBe(true);
        expect(blurred).toBe(true);
    });

    // Focus advance to next field (non-last index) requires document.getElementById.
    // Tested manually in browser, not automatable without jsdom.
});
