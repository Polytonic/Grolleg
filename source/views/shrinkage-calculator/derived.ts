import { parseLocaleNumber } from "../../components/locale";
import { applyRate, reverseRate, calculateVolume, deriveFiringPercent } from "./math";
import { state, SHAPE_MODES } from "./state";
import type { ShapeMode } from "./state";


// Derived View Data
// computeDerived should parse editable state, convert dimensions, and collect
// optional stage data once per render.
export interface Derived {
    shape: ShapeMode;
    totalValid: boolean;
    shrinkageInvalid: boolean;
    parsedDimensions: number[];
    anyDimensionsEntered: boolean;
    greenwarePercent: number;
    bisquePercent: number;
    convertedDimensions: (number | null)[] | null;
    anyResults: boolean;
    wetDimensions: number[] | null;
    finalDimensions: number[] | null;
    stageWetDimensions: (number | null)[] | null;
    stageFinalDimensions: (number | null)[] | null;
    firingPercent: number | null;
    boneDryDimensions: (number | null)[] | null;
    bisqueDimensions: (number | null)[] | null;
    volumeShrink: number | null;
    stagesWarning: string | null;
    showStagesCard: boolean;
}

type DimensionResult = number | null;


// Input Parsing
const completeDimensions = (dimensions: DimensionResult[]): number[] | null =>
    dimensions.every((dimension): dimension is number => dimension !== null)
        ? dimensions
        : null;

const parseInputs = () => {
    const shape = SHAPE_MODES[state.shapeIndex];
    const totalPercent = parseLocaleNumber(state.shrinkage);
    const greenwarePercent = parseLocaleNumber(state.greenwareShrinkage);
    const bisquePercent = parseLocaleNumber(state.bisqueShrinkage);
    const totalValid = Number.isFinite(totalPercent) && totalPercent > 0 && totalPercent < 100;
    const shrinkageInvalid = state.shrinkageTouched && !totalValid;
    const parsedDimensions = state.dimensions.map((value) => parseLocaleNumber(value));
    const anyDimensionsEntered = state.dimensions.some((value) => value !== "");
    return {
        shape, totalPercent, greenwarePercent, bisquePercent,
        totalValid, shrinkageInvalid, parsedDimensions, anyDimensionsEntered,
    };
};

type ParsedInputs = ReturnType<typeof parseInputs>;


// Direction Conversion
const computeResults = (inputs: ParsedInputs) => {
    if (!inputs.totalValid) {
        return {
            convertedDimensions: null,
            anyResults: false,
            wetDimensions: null,
            finalDimensions: null,
            stageWetDimensions: null,
            stageFinalDimensions: null,
        };
    }
    const convertedDimensions = inputs.parsedDimensions.map((value) => {
        if (!Number.isFinite(value) || value <= 0) return null;
        return state.direction === "wet-to-fired"
            ? applyRate(value, inputs.totalPercent)
            : reverseRate(value, inputs.totalPercent);
    });
    const anyResults = convertedDimensions.some((result) => result !== null);
    // Stage cards should mirror per-dimension results, while volume waits for a complete shape.
    const stageWetDimensions = convertedDimensions.map((result, index) => {
        if (result === null) return null;
        return state.direction === "wet-to-fired" ? inputs.parsedDimensions[index] : result;
    });
    const stageFinalDimensions = convertedDimensions.map((result, index) => {
        if (result === null) return null;
        return state.direction === "wet-to-fired" ? result : inputs.parsedDimensions[index];
    });
    const wetDimensions = completeDimensions(stageWetDimensions);
    const finalDimensions = completeDimensions(stageFinalDimensions);
    return { convertedDimensions, anyResults, wetDimensions, finalDimensions, stageWetDimensions, stageFinalDimensions };
};


// Stage Conversion
const computeStageData = (
    inputs: ParsedInputs,
    partialWetDimensions: DimensionResult[] | null,
    showStages: boolean,
) => {
    const stagesValid = showStages
        && Number.isFinite(inputs.greenwarePercent) && inputs.greenwarePercent >= 0
        && Number.isFinite(inputs.bisquePercent) && inputs.bisquePercent >= 0;
    const firingPercent = stagesValid
        ? deriveFiringPercent(inputs.totalPercent, inputs.greenwarePercent, inputs.bisquePercent)
        : null;
    const stagesConsistent = firingPercent !== null && firingPercent >= 0;
    const boneDryDimensions = partialWetDimensions && stagesConsistent
        ? partialWetDimensions.map((value) => value === null ? null : applyRate(value, inputs.greenwarePercent))
        : null;
    const bisqueDimensions = boneDryDimensions
        ? boneDryDimensions.map((value) => value === null ? null : applyRate(value, inputs.bisquePercent))
        : null;
    const stagesWarning = stagesValid && inputs.totalValid && !stagesConsistent
        ? "Greenware + Bisque shrinkage exceeds total shrinkage rate. Try lowering either stage or raising the rate."
        : null;
    return { firingPercent, boneDryDimensions, bisqueDimensions, stagesWarning };
};


// Volume Summary
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


// Public Derivation
export const computeDerived = (): Derived => {
    const inputs = parseInputs();
    const results = computeResults(inputs);
    const stageData = computeStageData(inputs, results.stageWetDimensions, state.showStages);
    const volumeShrink = computeVolumeShrink(results.wetDimensions, results.finalDimensions, inputs.shape);
    return {
        shape: inputs.shape,
        totalValid: inputs.totalValid,
        shrinkageInvalid: inputs.shrinkageInvalid,
        parsedDimensions: inputs.parsedDimensions,
        anyDimensionsEntered: inputs.anyDimensionsEntered,
        greenwarePercent: inputs.greenwarePercent,
        bisquePercent: inputs.bisquePercent,
        convertedDimensions: results.convertedDimensions,
        anyResults: results.anyResults,
        wetDimensions: results.wetDimensions,
        finalDimensions: results.finalDimensions,
        stageWetDimensions: results.stageWetDimensions,
        stageFinalDimensions: results.stageFinalDimensions,
        firingPercent: stageData.firingPercent,
        boneDryDimensions: stageData.boneDryDimensions,
        bisqueDimensions: stageData.bisqueDimensions,
        stagesWarning: stageData.stagesWarning,
        volumeShrink,
        showStagesCard: results.anyResults
            && results.stageFinalDimensions !== null
            && stageData.boneDryDimensions !== null
            && stageData.bisqueDimensions !== null,
    };
};
