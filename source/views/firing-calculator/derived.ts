import {
    bucketOf, findComparison, COMPARISONS, INCHES_PER_UNIT,
} from "./comparison";
import type { ComparisonEntry } from "./comparison";
import { DIMENSION_UNITS, WEIGHT_UNITS } from "./types";
import type { Basis, DimensionUnit, WeightUnit, Piece, Studio, PieceResult } from "./types";
import { toPositive, calculatePrice, rateIsCents, rateUnitFor } from "./pricing";
import { state, studioSnapshot, handleDimensionUnitChange, handleWeightUnitChange } from "./state";


/* ── Derived View Data ──
   Computed once per render. Bundles per-piece pricing, comparison
   lookups, warning state, and the affordances the controls section
   needs (which fields show, what step value, what unit suffix) so view
   code stays declarative. */

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
    rateStep: number;
    showRounding: boolean;
    showMinHeight: boolean;
    activeUnitSet: readonly DimensionUnit[] | readonly WeightUnit[];
    activeUnit: DimensionUnit | WeightUnit;
    // Widened to `string` so the shared UnitToggle's `onSelect: (unit:
    // string) => void` accepts it. The implementation knows the unit
    // is a member of `activeUnitSet` and casts internally.
    setActiveUnit: (unit: string) => void;
    totalQuantityUnit: string;
}

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
        // Footprint mode falls back to the flat-aspect table by area. The L/W
        // sort handles non-square footprints. Bucket selection is moot since
        // we're directly indexing the flat table.
        const sorted = [length, width].sort((a, b) => b - a);
        if (sorted[1] === 0) return null;
        const area = sorted[0] * sorted[1];
        return COMPARISONS.flat.find((entry) => area <= entry.max) ?? null;
    }
    if (length * width * height <= 0) return null;
    return findComparison(length * width * height, bucketOf(length, width, height));
};

const computeQuantityUnit = (basis: Basis, dimensionUnit: DimensionUnit, weightUnit: WeightUnit): string =>
    basis === "volume"    ? `${dimensionUnit}³`
  : basis === "footprint" ? `${dimensionUnit}²`
  : weightUnit;

// Aggregate. Total volume is computed in cubic inches across all pieces
// for the cubeish silhouette lookup, which always uses inches regardless
// of the user's display unit.
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
    const pieces: PieceComputed[] = state.pieces.map((piece) => {
        const result = calculatePrice(piece, studio);
        const comparison = computePieceComparison(piece, studio);
        const heightBelowMin = studio.basis === "volume"
            && toPositive(piece.H) > 0
            && toPositive(studio.minHeight) > 0
            && toPositive(piece.H) < toPositive(studio.minHeight);
        return {
            piece, result, comparison, heightBelowMin,
            quantityUnit: computeQuantityUnit(studio.basis, studio.dimensionUnit, studio.weightUnit),
        };
    });

    return {
        studio,
        pieces,
        aggregate: computeAggregate(pieces, studio),
        rateUnit: rateUnitFor(studio.basis, studio.dimensionUnit, studio.weightUnit),
        rateStep: rateIsCents(studio.basis) ? 0.1 : 0.05,
        showRounding: studio.basis === "volume" || studio.basis === "footprint",
        showMinHeight: studio.basis === "volume",
        activeUnitSet: studio.basis === "weight" ? WEIGHT_UNITS : DIMENSION_UNITS,
        activeUnit: studio.basis === "weight" ? studio.weightUnit : studio.dimensionUnit,
        setActiveUnit: studio.basis === "weight"
            ? (unit) => handleWeightUnitChange(unit as WeightUnit)
            : (unit) => handleDimensionUnitChange(unit as DimensionUnit),
        totalQuantityUnit: computeQuantityUnit(studio.basis, studio.dimensionUnit, studio.weightUnit),
    };
};
