import { parseLocaleNumber } from "../../components/locale";
import {
    state, SHAPE_MODES,
    applyRate, reverseRate, calculateVolume, deriveFiringPercent,
} from "./state";
import type { ShapeMode } from "./state";


/* ── Derived View Data ── */

export interface Derived {
    shape: ShapeMode;
    totalValid: boolean;
    shrinkageInvalid: boolean;
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
    const shrinkageInvalid = state.shrinkageTouched && !totalValid;
    const parsedDimensions = state.dimensions.map((value) => parseLocaleNumber(value));
    const anyDimensionsEntered = state.dimensions.some((value) => value !== "");
    return {
        shape, totalPercent, greenwarePercent, bisquePercent,
        totalValid, shrinkageInvalid, parsedDimensions, anyDimensionsEntered,
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
        shrinkageInvalid: inputs.shrinkageInvalid,
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
