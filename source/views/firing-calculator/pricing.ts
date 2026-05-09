import { parseLocaleNumber, decimalFormat } from "../../components/locale";
import type { Basis, DimensionUnit, WeightUnit, Piece, Studio, PieceResult, Rounding } from "./types";


// Pure Helpers
/**
 * Empty, invalid, or non-positive inputs become zero before quantity and rate math.
 * String inputs use locale-aware parsing.
 */
export const toPositive = (value: string | number): number => {
    const parsed = typeof value === "string" ? parseLocaleNumber(value) : Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const applyRounding = (value: number, method: Rounding): number => {
    if (method === "total-ceil") return Math.ceil(value);
    if (method === "total-round") return Math.round(value);
    return value;
};

/**
 * Dimension rounding applies before total rounding.
 * Any zero dimension keeps the billable product at zero.
 */
const roundedProduct = (rawDimensions: number[], rounding: Rounding): number => {
    if (rawDimensions.some((dimension) => dimension === 0)) return 0;
    const dimensions = rounding === "dimension-ceil" ? rawDimensions.map(Math.ceil) : rawDimensions;
    return applyRounding(dimensions.reduce((product, dimension) => product * dimension, 1), rounding);
};

/** Volume uses billable height, footprint uses area, and weight uses entered weight. */
export const computeQuantity = (
    piece: Piece, basis: Basis, rounding: Rounding, minHeight: number,
): number => {
    if (basis === "volume") {
        const rawHeight = toPositive(piece.H);
        if (rawHeight === 0) return 0;
        const height = Math.max(rawHeight, toPositive(minHeight));
        return roundedProduct([toPositive(piece.L), toPositive(piece.W), height], rounding);
    }
    if (basis === "footprint") {
        return roundedProduct([toPositive(piece.L), toPositive(piece.W)], rounding);
    }
    if (basis === "weight") return toPositive(piece.weight);
    const _exhaustive: never = basis;
    return _exhaustive;
};

/**
 * Computes quantity, effective rate, and price for one piece.
 * Studio toggles and piece chips both gate charges.
 * Bundled mode charges bisque or glaze once, with luster added separately.
 */
export const calculatePrice = (piece: Piece, studio: Studio): PieceResult => {
    const quantity = computeQuantity(piece, studio.basis, studio.rounding, studio.minHeight);
    let rate = 0;
    if (studio.bundled) {
        const bisqueActive = studio.firingToggles.bisque && piece.firings.bisque;
        const glazeActive  = studio.firingToggles.glaze  && piece.firings.glaze;
        if (bisqueActive || glazeActive) rate += toPositive(studio.firingRates.bundled);
    } else {
        if (studio.firingToggles.bisque && piece.firings.bisque) {
            rate += toPositive(studio.firingRates.bisque);
        }
        if (studio.firingToggles.glaze && piece.firings.glaze) {
            rate += toPositive(studio.firingRates.glaze);
        }
    }
    if (studio.firingToggles.luster && piece.firings.luster) {
        rate += toPositive(studio.firingRates.luster);
    }
    const price = quantity * rate;
    return { quantity, rate, price };
};


// Rate Conversion
// Display rates should match how potters speak: cents for volume and footprint,
// dollars for weight. Stored rates stay in dollars.

/** Volume and footprint rates display as cents while storage stays in dollars. */
export const rateIsCents = (basis: Basis): boolean =>
    basis === "volume" || basis === "footprint";

/** Stored dollar rates show as cents for spatial bases and dollars for weight. */
export const toDisplayRate = (stored: number, basis: Basis): number =>
    rateIsCents(basis) ? toPositive(stored) * 100 : toPositive(stored);

/** The display-rate ceiling catches pasted scientific notation and implausible typos. */
const MAX_DISPLAY_RATE = 1000;

/** Invalid rates become zero and extreme display values clamp before storage. */
export const toStoredRate = (display: number | string, basis: Basis): number => {
    const value = typeof display === "string" ? parseLocaleNumber(display) : display;
    if (!Number.isFinite(value)) return 0;
    const clamped = Math.max(0, Math.min(MAX_DISPLAY_RATE, value));
    return rateIsCents(basis) ? clamped / 100 : clamped;
};

/** Spatial pricing suffixes use cents. Weight pricing suffixes use dollars. */
export const rateUnitFor = (basis: Basis, dimensionUnit: DimensionUnit, weightUnit: WeightUnit): string => {
    if (basis === "volume")    return `¢/${dimensionUnit}³`;
    if (basis === "footprint") return `¢/${dimensionUnit}²`;
    if (basis === "weight")    return `$/${weightUnit}`;
    const _exhaustive: never = basis;
    return _exhaustive;
};


// Number Formatting
const wholeFormat = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

/** Result rows and totals always show dollar currency. */
export const formatPrice = (value: number): string =>
    `$${decimalFormat.format(value)}`;

/** Formats billable quantity, preserving decimals for weight and rounding spatial bases. */
export const formatQuantity = (value: number, basis: Basis): string =>
    basis === "weight" ? decimalFormat.format(value) : wholeFormat.format(value);
