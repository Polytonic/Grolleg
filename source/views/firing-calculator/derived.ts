import {
    bucketOf, findComparison, COMPARISONS, INCHES_PER_UNIT,
} from "./comparison";
import type { ComparisonEntry } from "./comparison";
import { DIMENSION_UNITS, WEIGHT_UNITS } from "./types";
import type { Basis, DimensionUnit, WeightUnit, Piece, Studio, PieceResult } from "./types";
import { toPositive, calculatePrice, rateUnitFor } from "./pricing";
import { state, studioSnapshot, handleDimensionUnitChange, handleWeightUnitChange } from "./state";


// Derived View Data
// computeDerived should bundle per-piece pricing, comparison lookup, warning
// state, and control affordances once per render so view code stays declarative.

export interface PieceComputed {
    piece: Piece;
    result: PieceResult;
    comparison: ComparisonEntry | null;
    heightBelowMin: boolean;
    quantityUnit: string;
}

export interface Derived {
    studio: Studio;
    pieces: PieceComputed[];
    aggregate: {
        total: number;
        totalQuantity: number;
        comparison: ComparisonEntry | null;
    };
    rateUnit: string;
    showRounding: boolean;
    showMinHeight: boolean;
    activeUnitSet: readonly DimensionUnit[] | readonly WeightUnit[];
    activeUnit: DimensionUnit | WeightUnit;
    // setActiveUnit should accept UnitToggle's shared string callback and
    // ignore values outside the active unit set.
    setActiveUnit: (unit: string) => void;
    totalQuantityUnit: string;
}

const isDimensionUnit = (unit: string): unit is DimensionUnit =>
    DIMENSION_UNITS.some((candidate) => candidate === unit);

const isWeightUnit = (unit: string): unit is WeightUnit =>
    WEIGHT_UNITS.some((candidate) => candidate === unit);

const pieceToInches = (piece: Piece, dimensionUnit: DimensionUnit) => {
    const factor = INCHES_PER_UNIT[dimensionUnit];
    return {
        length: toPositive(piece.L) * factor,
        width: toPositive(piece.W) * factor,
        height: toPositive(piece.H) * factor,
    };
};

const computePieceComparison = (piece: Piece, studio: Studio): ComparisonEntry | null => {
    if (studio.basis === "weight") return null;
    const { length, width, height } = pieceToInches(piece, studio.dimensionUnit);
    if (studio.basis === "footprint") {
        // Footprint mode should use the flat-aspect table by area. Sorting
        // length and width handles non-square footprints.
        const sorted = [length, width].sort((a, b) => b - a);
        if (sorted[1] === 0) return null;
        const area = sorted[0] * sorted[1];
        return COMPARISONS.flat.find((entry) => area <= entry.max) ?? null;
    }
    if (length * width * height <= 0) return null;
    return findComparison(length * width * height, bucketOf(length, width, height));
};

const computeQuantityUnit = (basis: Basis, dimensionUnit: DimensionUnit, weightUnit: WeightUnit): string => {
    if (basis === "volume") return `${dimensionUnit}³`;
    if (basis === "footprint") return `${dimensionUnit}²`;
    return weightUnit;
};

// Aggregate
// computeAggregate should use cubic inches for the cubeish silhouette lookup,
// regardless of the user's display unit.
const computeAggregate = (pieces: PieceComputed[], studio: Studio) => {
    let total = 0;
    let totalQuantity = 0;
    let totalVolumeInCubicInches = 0;
    for (const computed of pieces) {
        total += computed.result.price;
        totalQuantity += computed.result.quantity;
        if (studio.basis === "volume" || studio.basis === "footprint") {
            const { length, width, height } = pieceToInches(computed.piece, studio.dimensionUnit);
            totalVolumeInCubicInches += length * width * (studio.basis === "volume" ? height : 1);
        }
    }
    const comparison = totalVolumeInCubicInches > 0
        ? findComparison(totalVolumeInCubicInches, "cubeish")
        : null;
    return { total, totalQuantity, comparison };
};

export const computeDerived = (): Derived => {
    const studio = studioSnapshot();
    const quantityUnit = computeQuantityUnit(studio.basis, studio.dimensionUnit, studio.weightUnit);
    const pieces: PieceComputed[] = state.pieces.map((piece) => {
        const result = calculatePrice(piece, studio);
        const comparison = computePieceComparison(piece, studio);
        const enteredHeight = toPositive(piece.H);
        const minimumHeight = toPositive(studio.minHeight);
        const heightBelowMin = studio.basis === "volume"
            && enteredHeight > 0
            && minimumHeight > 0
            && enteredHeight < minimumHeight;
        return {
            piece, result, comparison, heightBelowMin,
            quantityUnit,
        };
    });

    return {
        studio,
        pieces,
        aggregate: computeAggregate(pieces, studio),
        rateUnit: rateUnitFor(studio.basis, studio.dimensionUnit, studio.weightUnit),
        showRounding: studio.basis === "volume" || studio.basis === "footprint",
        showMinHeight: studio.basis === "volume",
        activeUnitSet: studio.basis === "weight" ? WEIGHT_UNITS : DIMENSION_UNITS,
        activeUnit: studio.basis === "weight" ? studio.weightUnit : studio.dimensionUnit,
        setActiveUnit: studio.basis === "weight"
            ? (unit) => { if (isWeightUnit(unit)) handleWeightUnitChange(unit); }
            : (unit) => { if (isDimensionUnit(unit)) handleDimensionUnitChange(unit); },
        totalQuantityUnit: quantityUnit,
    };
};
