/* ── Types ── */

export type Basis = "volume" | "footprint" | "weight";
export type DimensionUnit = "mm" | "cm" | "in";
export type WeightUnit = "g" | "kg" | "oz" | "lb";
export type FiringKey = "bisque" | "glaze" | "luster";
export type Rounding = "dimension-ceil" | "total-ceil" | "total-round" | "none";

export type FiringFlags = Record<FiringKey, boolean>;
export type FiringRates = Record<FiringKey | "bundled", number>;

// Pieces store dimensions as strings so partial input like "12."
// survives re-renders and empty distinguishes from zero. Coerced to
// numbers via toPositive() at use.
export interface Piece {
    id: number;
    L: string;
    W: string;
    H: string;
    weight: string;
    firings: FiringFlags;
}

// The studio bundle a piece needs to be priced. Constructed from state
// every render via studioSnapshot() rather than nested in state so
// handlers can mutate primitives directly.
export interface Studio {
    basis: Basis;
    dimensionUnit: DimensionUnit;
    weightUnit: WeightUnit;
    firingToggles: FiringFlags;
    firingRates: FiringRates;
    bundled: boolean;
    minHeight: number;
    rounding: Rounding;
}

export interface PieceResult {
    quantity: number;
    rate: number;
    raw: number;
    price: number;
}


/* ── Constants ── */

export const FIRING_TYPES: { key: FiringKey; label: string }[] = [
    { key: "bisque", label: "Bisque" },
    { key: "glaze",  label: "Glaze" },
    { key: "luster", label: "Luster" },
];

// Defaults grounded in typical community-studio rates. Stored in
// dollars. Volume and footprint display as cents (× 100), weight
// displays as dollars 1:1. Luster runs 4-6x bisque in real studios
// (third firing, gold compounds, small batches), not 2x; the volume
// luster default sits at the low end of that band. The bundled
// default is the combined bisque+glaze rate a studio pricing the two
// together would charge, meaningfully higher than bisque alone so
// toggling Bundled on a single-piece view actually changes the
// total instead of leaving it at the bisque rate.
interface BasisMetaEntry {
    label: string;
    defaults: FiringRates;
}

export const BASIS_META: Record<Basis, BasisMetaEntry> = {
    volume: {
        label: "Volume (L × W × H)",
        defaults: { bisque: 0.035, glaze: 0.035, luster: 0.14, bundled: 0.07 },
    },
    footprint: {
        label: "Footprint (L × W)",
        defaults: { bisque: 0.07, glaze: 0.07, luster: 0.28, bundled: 0.14 },
    },
    weight: {
        label: "Weight",
        defaults: { bisque: 1.0, glaze: 1.0, luster: 4.0, bundled: 2.0 },
    },
};

export const ROUNDING_OPTIONS: { key: Rounding; label: string }[] = [
    { key: "dimension-ceil",    label: "Per Dimension" },
    { key: "total-ceil",  label: "Total" },
    { key: "total-round", label: "Nearest Whole" },
    { key: "none",        label: "Don't Round" },
];

export const DIMENSION_UNITS: readonly DimensionUnit[] = ["mm", "cm", "in"];
export const WEIGHT_UNITS: readonly WeightUnit[] = ["g", "kg", "oz", "lb"];
