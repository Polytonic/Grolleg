import { haptic, focusLater } from "../../components/interaction";
import { detectDefaultDimensionUnit } from "../../components/locale";


// Types
interface Preset {
    name: string;
    total: string;
    greenware: string;
    bisque: string;
    group: string;
}

interface PresetOption extends Preset {
    index: number;
}

interface PresetGroup {
    label: string;
    options: PresetOption[];
}

export interface ShapeMode {
    id: "single" | "cylinder" | "rectangle";
    label: string;
    fields: string[];
}

export interface Stage {
    label: string;
    dimensions: (number | null)[];
    percent: number | null;
    isEndpoint: boolean;
}

// Direction should name which dimension the user enters and which side the
// calculator converts toward.
export type Direction = "fired-to-wet" | "wet-to-fired";
export type Unit = "mm" | "cm" | "in";


// Clay Body Presets
const PRESETS: Preset[] = [
    { name: "Earthenware (Cone 04)",   total: "7",  greenware: "5",   bisque: "0.5",  group: "Generic" },
    { name: "Stoneware (Cone 6)",      total: "12", greenware: "6",   bisque: "0.75", group: "Generic" },
    { name: "Stoneware (Cone 10)",     total: "13", greenware: "6",   bisque: "0.75", group: "Generic" },
    { name: "Porcelain (Cone 10)",     total: "15", greenware: "7",   bisque: "0.75", group: "Generic" },
    { name: "Custom",                  total: "",   greenware: "",    bisque: "0.75", group: "Generic" },
    { name: "Laguna B-Mix 5 (Cone 5)", total: "12", greenware: "6",   bisque: "0.75", group: "Popular Clays" },
    { name: "Standard 182 (Cone 10)",  total: "12", greenware: "6",   bisque: "0.75", group: "Popular Clays" },
    { name: "Standard 240 (Cone 6)",   total: "13", greenware: "6.5", bisque: "0.75", group: "Popular Clays" },
    { name: "Standard 266 (Cone 6)",   total: "13", greenware: "6.5", bisque: "0.75", group: "Popular Clays" },
];

const CUSTOM_INDEX = PRESETS.findIndex((preset) => preset.name === "Custom");

// PRESET_GROUPS should group the static preset list once at module load.
export const PRESET_GROUPS: PresetGroup[] = (() => {
    const groups: PresetGroup[] = [];
    let currentLabel: string | null = null;
    PRESETS.forEach((preset, index) => {
        if (preset.group !== currentLabel) {
            currentLabel = preset.group;
            groups.push({ label: preset.group, options: [] });
        }
        groups[groups.length - 1].options.push({ ...preset, index });
    });
    return groups;
})();


// Shape Modes
export const SHAPE_MODES: ShapeMode[] = [
    { id: "single",   label: "Linear",    fields: ["Length"] },
    { id: "cylinder", label: "Cylinder",  fields: ["Diameter", "Height"] },
    { id: "rectangle", label: "Rectangle", fields: ["Length", "Width", "Height"] },
];

// State
const defaultDimensionUnit: Unit = detectDefaultDimensionUnit();

interface StateShape {
    direction: Direction;
    shapeIndex: number;
    presetIndex: number;
    shrinkage: string;
    greenwareShrinkage: string;
    bisqueShrinkage: string;
    showStages: boolean;
    unit: Unit;
    // dimensions should stay as strings so partial input like "12." survives redraws.
    dimensions: string[];
    shrinkageTouched: boolean;
    // pulseKey should tick when direction changes and inputs need to replay the CSS pulse.
    pulseKey: number;
}

// Shared initial values should let tests reset to the same defaults.
const INITIAL_STATE: StateShape = {
    direction: "fired-to-wet",
    shapeIndex: 1,
    presetIndex: 1,
    shrinkage: "12",
    greenwareShrinkage: "6",
    bisqueShrinkage: "0.75",
    showStages: false,
    unit: defaultDimensionUnit,
    dimensions: SHAPE_MODES[1].fields.map(() => ""),
    shrinkageTouched: false,
    pulseKey: 0,
};

// cloneInitialState should deep-clone dimensions so callers can mutate the
// active draft without changing shared defaults.
export function cloneInitialState(): StateShape {
    return { ...INITIAL_STATE, dimensions: [...INITIAL_STATE.dimensions] };
}

export const state: StateShape = cloneInitialState();


// Event Handlers
export const handlePresetChange = (event: Event) => {
    const index = parseInt((event.currentTarget as HTMLSelectElement).value, 10);
    state.presetIndex = index;
    const preset = PRESETS[index];
    // Custom preset has no predefined values, so prompt the user to type one.
    if (preset.total === "") {
        state.shrinkage = "";
        state.shrinkageTouched = false;
        focusLater("shrinkage-rate");
        return;
    }
    state.shrinkage = preset.total;
    state.greenwareShrinkage = preset.greenware;
    state.bisqueShrinkage = preset.bisque;
};

export const handleShrinkageInput = (event: Event) => {
    state.shrinkage = (event.currentTarget as HTMLInputElement).value;
    state.presetIndex = CUSTOM_INDEX;
};

export const handleShrinkageBlur = () => { state.shrinkageTouched = true; };

export const handleStageToggle = (event: Event) => {
    haptic();
    state.showStages = (event.currentTarget as HTMLInputElement).checked;
};

export const handleGreenwareInput = (event: Event) => {
    state.greenwareShrinkage = (event.currentTarget as HTMLInputElement).value;
    state.presetIndex = CUSTOM_INDEX;
};

export const handleBisqueInput = (event: Event) => {
    state.bisqueShrinkage = (event.currentTarget as HTMLInputElement).value;
    state.presetIndex = CUSTOM_INDEX;
};

// handleShapeChange should preserve values for named fields that exist in both
// modes, such as Height moving from Cylinder to Rectangle.
export const handleShapeChange = (newShapeIndex: number) => {
    haptic();
    const oldFields = SHAPE_MODES[state.shapeIndex].fields;
    const newFields = SHAPE_MODES[newShapeIndex].fields;
    state.dimensions = newFields.map((field) => {
        const oldIndex = oldFields.indexOf(field);
        return oldIndex !== -1 ? state.dimensions[oldIndex] : "";
    });
    state.shapeIndex = newShapeIndex;
    focusLater(`dimension-${newFields[0].toLowerCase()}`);
};

// handleDirectionChange should flash entered dimensions so the user notices the
// output side swapped.
export const handleDirectionChange = (nextDirection: Direction) => {
    haptic();
    if (nextDirection !== state.direction && state.dimensions.some((value) => value !== "")) {
        state.pulseKey += 1;
    }
    state.direction = nextDirection;
};

export const handleUnitChange = (nextUnit: Unit) => {
    haptic();
    state.unit = nextUnit;
};

export const handleDimensionInput = (fieldIndex: number, event: Event) => {
    state.dimensions = state.dimensions.map((value, index) =>
        index === fieldIndex ? (event.currentTarget as HTMLInputElement).value : value,
    );
};

// Enter should advance to the next dimension input, or blur the last one.
export const handleDimensionKey = (fieldIndex: number, event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const fields = SHAPE_MODES[state.shapeIndex].fields;
    if (fieldIndex === fields.length - 1) {
        (event.currentTarget as HTMLInputElement).blur();
        return;
    }
    globalThis.document?.getElementById(`dimension-${fields[fieldIndex + 1].toLowerCase()}`)?.focus();
};
