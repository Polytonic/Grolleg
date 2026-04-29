import { haptic, focusLater } from "../../components/interaction";
import { detectDefaultDimensionUnit, formatNumber } from "../../components/locale";


/* ── Types ── */

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
    dimensions: number[];
    percent: number | null;
    isEndpoint: boolean;
}

// Tracks which dimension the user enters: "fired-to-wet" = user inputs fired, calculator shows wet.
export type Direction = "fired-to-wet" | "wet-to-fired";
export type Unit = "mm" | "cm" | "in";


/* ── Clay Body Presets ── */

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

// Group presets by their `group` field once at module load. The list is static.
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


/* ── Shape Modes ── */

export const SHAPE_MODES: ShapeMode[] = [
    { id: "single",   label: "Linear",    fields: ["Length"] },
    { id: "cylinder", label: "Cylinder",  fields: ["Diameter", "Height"] },
    { id: "rectangle", label: "Rectangle", fields: ["Length", "Width", "Height"] },
];


/* ── Pure Math ── */

export const applyRate = (dimension: number, percent: number): number =>
    dimension * (1 - percent / 100);

export const reverseRate = (dimension: number, percent: number): number =>
    dimension / (1 - percent / 100);

export const format = formatNumber;

export const calculateVolume = (dimensions: number[], shapeId: ShapeMode["id"]): number | null => {
    if (shapeId === "rectangle" && dimensions.length >= 3) return dimensions[0] * dimensions[1] * dimensions[2];
    if (shapeId === "cylinder" && dimensions.length >= 2) return Math.PI * (dimensions[0] / 2) ** 2 * dimensions[1];
    return null;
};

// (1 - total) == (1 - greenware) * (1 - bisque) * (1 - firing).
// Guard against 0/0 (total=100 and a stage=100) producing NaN that slips past range checks.
export const deriveFiringPercent = (
    totalPercent: number,
    greenwarePercent: number,
    bisquePercent: number,
): number | null => {
    const factor = (1 - totalPercent / 100) /
        ((1 - greenwarePercent / 100) * (1 - bisquePercent / 100));
    if (Number.isFinite(factor) && factor > 0 && factor <= 1) return (1 - factor) * 100;
    return null;
};


const defaultUnit: Unit = detectDefaultDimensionUnit();

/* ── State ── */

interface StateShape {
    direction: Direction;
    shapeIndex: number;
    presetIndex: number;
    shrinkage: string;
    greenwareShrinkage: string;
    bisqueShrinkage: string;
    showStages: boolean;
    unit: Unit;
    dimensions: string[];  // strings, not numbers: preserves partial input ("12.") and distinguishes empty from 0
    shrinkageTouched: boolean;
    pulseKey: number;  // monotonic counter that triggers CSS pulse animation on direction change
}

// Shared initial values so tests can reset to the same defaults
export const INITIAL_STATE: StateShape = {
    direction: "fired-to-wet",
    shapeIndex: 1,
    presetIndex: 1,
    shrinkage: "12",
    greenwareShrinkage: "6",
    bisqueShrinkage: "0.75",
    showStages: false,
    unit: defaultUnit,
    dimensions: SHAPE_MODES[1].fields.map(() => ""),
    shrinkageTouched: false,
    pulseKey: 0,
};

export const state: StateShape = {
    ...INITIAL_STATE,
    dimensions: [...INITIAL_STATE.dimensions],
};


/* ── Event Handlers ── */

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

// Switching shapes preserves values for named fields that exist in both modes.
// Height carries from Cylinder to Rectangle, for example.
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

// Changing direction with dimensions entered flashes the inputs briefly so
// the user notices the output side swapped. pulseKey monotonically increments
// to signal the input's onupdate hook that the animation class should restart.
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
    state.dimensions[fieldIndex] = (event.currentTarget as HTMLInputElement).value;
};

// Enter on a dimension input advances to the next field, or blurs on the last.
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
