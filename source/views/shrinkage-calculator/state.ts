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
    id: "single" | "cylinder" | "rect";
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

// Per-vnode state the dimension input carries to track pulse replays.
export type PulseState = { lastPulseKey: number };


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
    { id: "rect",     label: "Rectangle", fields: ["Length", "Width", "Height"] },
];


/* ── Pure Math ── */

export const applyRate = (dimension: number, percent: number): number =>
    dimension * (1 - percent / 100);

export const reverseRate = (dimension: number, percent: number): number =>
    dimension / (1 - percent / 100);

// Locale-aware number formatter for display output.
const numberFormat = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// Em dash signals empty or invalid state, distinguishing it from a zero value.
export const format = (value: number | null): string =>
    value !== null && Number.isFinite(value) ? numberFormat.format(value) : "—";

// Normalizes locale number formats before parsing. Detects whether comma
// is a decimal or thousands separator based on position, then strips
// grouping separators and normalizes the decimal to a period.
export const parseLocaleNumber = (value: string): number => {
    const trimmed = value.trim();
    // If the last separator is a comma, treat it as decimal (e.g., "1.500,75" or "12,5")
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    if (lastComma > lastDot) {
        return parseFloat(trimmed.replace(/\./g, "").replace(",", "."));
    }
    // Otherwise treat dot as decimal (e.g., "1,500.75" or "12.5")
    return parseFloat(trimmed.replace(/,/g, ""));
};

export const calculateVolume = (dimensions: number[], shapeId: ShapeMode["id"]): number | null => {
    if (shapeId === "rect" && dimensions.length >= 3) return dimensions[0] * dimensions[1] * dimensions[2];
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


/* ── Progressive Enhancements ── */

// iOS Safari silently ignores vibration, so no error handling needed.
const haptic = () => { navigator?.vibrate?.(15); };

// US/Canada default to inches, everywhere else to centimeters.
const defaultUnit: Unit = (() => {
    const language = navigator?.language ?? "";
    return language.startsWith("en-US") || language.startsWith("en-CA") ? "in" : "cm";
})();

// Defer focus to next tick so the DOM reflects the latest state mutation.
const focusLater = (id: string) =>
    setTimeout(() => { globalThis.document?.getElementById(id)?.focus(); }, 0);


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
    shrinkTouched: boolean;
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
    shrinkTouched: false,
    pulseKey: 0,
};

export const state: StateShape = { ...INITIAL_STATE };


/* ── Event Handlers ── */

export const handlePresetChange = (event: Event) => {
    const index = parseInt((event.currentTarget as HTMLSelectElement).value, 10);
    state.presetIndex = index;
    const preset = PRESETS[index];
    // Custom preset has no predefined values, so prompt the user to type one.
    if (preset.total === "") {
        state.shrinkage = "";
        state.shrinkTouched = false;
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

export const handleShrinkageBlur = () => { state.shrinkTouched = true; };

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


/* ── Derived View Data ── */

export interface Derived {
    shape: ShapeMode;
    totalValid: boolean;
    shrinkInvalid: boolean;
    parsedDimensions: number[];
    anyDimensionsEntered: boolean;
    greenwarePercent: number;
    bisquePercent: number;
    firedResults: (number | null)[] | null;
    anyResults: boolean;
    wetDimensions: number[] | null;
    finalDimensions: number[] | null;
    firingPercent: number | null;
    boneDryDimensions: number[] | null;
    bisqueDimensions: number[] | null;
    volumeShrink: number | null;
    stagesWarning: string | null;
    showStagesCard: boolean;
}

const parseInputs = () => {
    const shape = SHAPE_MODES[state.shapeIndex];
    const totalPercent = parseLocaleNumber(state.shrinkage);
    const greenwarePercent = parseLocaleNumber(state.greenwareShrinkage);
    const bisquePercent = parseLocaleNumber(state.bisqueShrinkage);
    const totalValid = Number.isFinite(totalPercent) && totalPercent > 0 && totalPercent < 100;
    const shrinkInvalid = state.shrinkTouched && !totalValid;
    const parsedDimensions = state.dimensions.map((value) => parseLocaleNumber(value));
    const anyDimensionsEntered = state.dimensions.some((value) => value !== "");
    return {
        shape, totalPercent, greenwarePercent, bisquePercent,
        totalValid, shrinkInvalid, parsedDimensions, anyDimensionsEntered,
    };
};

type ParsedInputs = ReturnType<typeof parseInputs>;

const computeResults = (inputs: ParsedInputs) => {
    if (!inputs.totalValid) {
        return { firedResults: null, anyResults: false, wetDimensions: null, finalDimensions: null };
    }
    const firedResults = inputs.parsedDimensions.map((value) => {
        if (!Number.isFinite(value) || value <= 0) return null;
        return state.direction === "wet-to-fired"
            ? applyRate(value, inputs.totalPercent)
            : reverseRate(value, inputs.totalPercent);
    });
    const anyResults = firedResults.some((result) => result !== null);
    // Timeline and volumetric math require all dimensions. Per-dimension
    // partial results render above regardless.
    const allValid = firedResults.every((result) => result !== null);
    const wetDimensions = allValid
        ? (state.direction === "wet-to-fired" ? inputs.parsedDimensions : firedResults as number[])
        : null;
    const finalDimensions = allValid
        ? (state.direction === "wet-to-fired" ? firedResults as number[] : inputs.parsedDimensions)
        : null;
    return { firedResults, anyResults, wetDimensions, finalDimensions };
};

const computeStageData = (inputs: ParsedInputs, wetDimensions: number[] | null, showStages: boolean) => {
    const stagesValid = showStages
        && Number.isFinite(inputs.greenwarePercent) && inputs.greenwarePercent >= 0
        && Number.isFinite(inputs.bisquePercent) && inputs.bisquePercent >= 0;
    const firingPercent = stagesValid
        ? deriveFiringPercent(inputs.totalPercent, inputs.greenwarePercent, inputs.bisquePercent)
        : null;
    const stagesConsistent = firingPercent !== null && firingPercent > 0;
    const boneDryDimensions = wetDimensions && stagesConsistent
        ? wetDimensions.map((value) => applyRate(value, inputs.greenwarePercent))
        : null;
    const bisqueDimensions = boneDryDimensions
        ? boneDryDimensions.map((value) => applyRate(value, inputs.bisquePercent))
        : null;
    const stagesWarning = stagesValid && inputs.totalValid && !stagesConsistent
        ? "Greenware + Bisque shrinkage exceeds total shrinkage rate. Try lowering either stage or raising the rate."
        : null;
    return { firingPercent, boneDryDimensions, bisqueDimensions, stagesWarning };
};

const computeVolumeShrink = (
    wetDimensions: number[] | null,
    finalDimensions: number[] | null,
    shape: ShapeMode,
): number | null => {
    if (!wetDimensions || !finalDimensions) return null;
    const volumeWet = calculateVolume(wetDimensions, shape.id);
    const volumeFired = calculateVolume(finalDimensions, shape.id);
    if (volumeWet === null || volumeFired === null) return null;
    return (1 - volumeFired / volumeWet) * 100;
};

export const computeDerived = (): Derived => {
    const inputs = parseInputs();
    const results = computeResults(inputs);
    const stageData = computeStageData(inputs, results.wetDimensions, state.showStages);
    const volumeShrink = computeVolumeShrink(results.wetDimensions, results.finalDimensions, inputs.shape);
    return {
        shape: inputs.shape,
        totalValid: inputs.totalValid,
        shrinkInvalid: inputs.shrinkInvalid,
        parsedDimensions: inputs.parsedDimensions,
        anyDimensionsEntered: inputs.anyDimensionsEntered,
        greenwarePercent: inputs.greenwarePercent,
        bisquePercent: inputs.bisquePercent,
        firedResults: results.firedResults,
        anyResults: results.anyResults,
        wetDimensions: results.wetDimensions,
        finalDimensions: results.finalDimensions,
        firingPercent: stageData.firingPercent,
        boneDryDimensions: stageData.boneDryDimensions,
        bisqueDimensions: stageData.bisqueDimensions,
        stagesWarning: stageData.stagesWarning,
        volumeShrink,
        showStagesCard: results.anyResults
            && results.finalDimensions !== null
            && stageData.boneDryDimensions !== null
            && stageData.bisqueDimensions !== null,
    };
};
