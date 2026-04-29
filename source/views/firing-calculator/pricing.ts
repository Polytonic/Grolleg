import { parseLocaleNumber, decimalFormat } from "../../components/locale";
import type { Basis, DimensionUnit, WeightUnit, Piece, Studio, PieceResult, Rounding } from "./types";


/* ── Pure Helpers ── */

// Coerces unknown input to a positive number, returning 0 for empty,
// non-finite, or non-positive values. Treating empty inputs as zero lets
// quantity/rate calculations short-circuit to a $0 price without throwing.
// Strings use parseLocaleNumber for locale-aware decimal handling.
export const toPositive = (value: unknown): number => {
    const parsed = typeof value === "string" ? parseLocaleNumber(value) : Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const applyRounding = (value: number, method: Rounding): number => {
    if (method === "total-ceil") return Math.ceil(value);
    if (method === "total-round") return Math.round(value);
    return value;
};

// Quantity in display units (cm³, in³, lb, etc.). Volume applies the
// height floor before per-dim ceiling so the floor reflects the studio's
// true billable height. Rounding is a measurement convention layered
// on top.
const roundedProduct = (raw: number[], rounding: Rounding): number => {
    if (raw.some((d) => d === 0)) return 0;
    const dimensions = rounding === "dimension-ceil" ? raw.map(Math.ceil) : raw;
    return applyRounding(dimensions.reduce((a, b) => a * b, 1), rounding);
};

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
    return 0;
};

// A piece pays for a firing only when both the studio toggle and the
// piece chip are on. The bundled flag picks one of two rate models:
//   • Bundled: a single combined charge (firingRates.bundled) covers
//     bisque AND glaze together, applied once if the piece includes either.
//   • Unbundled: bisque and glaze are independent charges, summed.
// Luster is independent in both modes. Both quantity and rate must
// be positive for a non-zero price; either being zero produces $0.
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
    const raw = quantity * rate;
    const price = quantity > 0 && rate > 0 ? raw : 0;
    return { quantity, rate, raw, price };
};


/* ── Cents-vs-Dollars Rate Conversion ──
   Volume and footprint rates display as cents (matching how potters speak:
   "4 cents per cubic inch"). Weight rates display as dollars ("$2/lb").
   All math operates on stored dollars; conversion happens at the input
   boundary via toDisplayRate / toStoredRate. */

export const rateIsCents = (basis: Basis): boolean =>
    basis === "volume" || basis === "footprint";

export const toDisplayRate = (stored: number, basis: Basis): number =>
    rateIsCents(basis) ? toPositive(stored) * 100 : toPositive(stored);

// Upper bound on display-unit rates. Catches accidental paste of
// scientific-notation values (`1e10` would otherwise produce a
// hundred-billion-dollar bill on a 10×10×10 piece) and absurd typos
// without restricting realistic studio rates (typical max ~50¢/in³).
export const MAX_DISPLAY_RATE = 1000;

export const toStoredRate = (display: number | string, basis: Basis): number => {
    const value = typeof display === "string" ? parseLocaleNumber(display) : display;
    if (!Number.isFinite(value)) return 0;
    const clamped = Math.max(0, Math.min(MAX_DISPLAY_RATE, value));
    return rateIsCents(basis) ? clamped / 100 : clamped;
};

export const rateUnitFor = (basis: Basis, dimensionUnit: DimensionUnit, weightUnit: WeightUnit): string => {
    if (basis === "volume")    return `¢/${dimensionUnit}³`;
    if (basis === "footprint") return `¢/${dimensionUnit}²`;
    if (basis === "weight")    return `$/${weightUnit}`;
    return "$";
};

// Re-export from locale so existing consumers of pricing.ts don't break.
export { expandUnit, UNIT_VERBOSE } from "../../components/locale";


/* ── Number Formatting ── */

const wholeFormat = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export const formatPrice = (value: number): string =>
    `$${decimalFormat.format(value)}`;

// Weight basis prints two decimals (small numbers like 1.25 lb);
// volume and footprint print whole numbers (large numbers like 240 in³).
export const formatQuantity = (value: number, basis: string): string =>
    basis === "weight" ? decimalFormat.format(value) : wholeFormat.format(value);
