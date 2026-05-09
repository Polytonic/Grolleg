// Types
export type Basis = "volume" | "footprint" | "weight";
export type DimensionUnit = "mm" | "cm" | "in";
export type WeightUnit = "g" | "kg" | "oz" | "lb";
export type FiringKey = "bisque" | "glaze" | "luster";
export type Rounding = "dimension-ceil" | "total-ceil" | "total-round" | "none";

export type FiringFlags = Record<FiringKey, boolean>;
export type FiringRates = Record<FiringKey | "bundled", number>;

// Pieces should store dimensions as strings so partial input like "12."
// survives redraws and empty stays distinct from zero.
export interface Piece {
    id: number;
    L: string;
    W: string;
    H: string;
    weight: string;
    firings: FiringFlags;
}

// Studio should be constructed from state every render rather than nested in
// state, so handlers can mutate primitives directly.
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
    price: number;
}


// Constants
export const FIRING_TYPES: { key: FiringKey; label: string }[] = [
    { key: "bisque", label: "Bisque" },
    { key: "glaze",  label: "Glaze" },
    { key: "luster", label: "Luster" },
];

// Defaults should stay grounded in typical community-studio rates. Volume and
// footprint display cents, while weight displays dollars. Luster runs 4-6x
// bisque in real studios, so the volume luster default sits at the low end.
// The bundled default is the combined bisque plus glaze rate a studio would
// charge when pricing the two together.
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
