import m from "mithril";
import {
    bucketOf, findComparison, COMPARISONS,
    INCHES_PER_UNIT,
} from "./comparison";
import type { ComparisonEntry } from "./comparison";


/* ── Types ── */

export type Basis = "volume" | "footprint" | "weight";
export type DimensionUnit = "mm" | "cm" | "in";
export type WeightUnit = "g" | "kg" | "lb";
export type FiringKey = "bisque" | "glaze" | "luster";
export type Rounding = "dim-ceil" | "total-ceil" | "total-round" | "none";

export type FiringFlags = Record<FiringKey, boolean>;
export type FiringRates = Record<FiringKey, number>;

// Pieces store dimensions as strings so partial input ("12.") survives
// re-renders and empty distinguishes from zero. Coerced to numbers via
// toPositive() at use.
export interface Piece {
    id: number;
    name: string;
    L: string;
    W: string;
    H: string;
    weight: string;
    firings: FiringFlags;
}

// The studio bundle a piece needs to be priced. Constructed from state
// every render via studioSnapshot() rather than nested in state, so handlers
// don't have to walk an extra layer to mutate primitives.
export interface Studio {
    basis: Basis;
    dimensionUnit: DimensionUnit;
    weightUnit: WeightUnit;
    firingToggles: FiringFlags;
    firingRates: FiringRates;
    bundled: boolean;
    bundledRate: number;
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

// Defaults grounded in real-world studio rates (Photopottery, KilnFire,
// Greenwich House Pottery). Stored in dollars; volume/footprint display as
// cents (× 100), weight displays as dollars 1:1.
export const BASIS_META: Record<Basis, { label: string; defaults: FiringRates }> = {
    volume: {
        label: "Volume (L × W × H)",
        defaults: { bisque: 0.04, glaze: 0.045, luster: 0.08 },
    },
    footprint: {
        label: "Footprint (L × W)",
        defaults: { bisque: 0.08, glaze: 0.10, luster: 0.15 },
    },
    weight: {
        label: "Weight",
        defaults: { bisque: 1.0, glaze: 1.5, luster: 2.0 },
    },
};

export const ROUNDING_OPTIONS: { key: Rounding; label: string }[] = [
    { key: "dim-ceil",    label: "Round up each measurement" },
    { key: "total-ceil",  label: "Round up the total" },
    { key: "total-round", label: "Round to the nearest whole" },
    { key: "none",        label: "Don't round" },
];

export const DIMENSION_UNITS: readonly DimensionUnit[] = ["mm", "cm", "in"];
export const WEIGHT_UNITS: readonly WeightUnit[] = ["g", "kg", "lb"];

const UNIT_HINT_MS = 4000;


/* ── Pure Helpers ── */

// Coerces unknown input to a positive number, returning 0 for empty,
// non-finite, or non-positive values. Treating empty inputs as zero lets
// quantity/rate calculations short-circuit to a $0 price without throwing.
export const toPositive = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const applyRounding = (value: number, method: Rounding): number => {
    if (method === "total-ceil") return Math.ceil(value);
    if (method === "total-round") return Math.round(value);
    return value;
};

// Quantity in display units (cm³, in³, lb, etc.). Volume applies the height
// floor BEFORE per-dim ceiling: the floor expresses the studio's true
// billable height; rounding is a measurement convention layered on top.
export const computeQuantity = (
    piece: Piece, basis: Basis, rounding: Rounding, minHeight: number,
): number => {
    if (basis === "volume") {
        let length = toPositive(piece.L), width = toPositive(piece.W);
        let height = Math.max(toPositive(piece.H), toPositive(minHeight));
        if (rounding === "dim-ceil") {
            length = Math.ceil(length);
            width = Math.ceil(width);
            height = Math.ceil(height);
        }
        return applyRounding(length * width * height, rounding);
    }
    if (basis === "footprint") {
        let length = toPositive(piece.L), width = toPositive(piece.W);
        if (rounding === "dim-ceil") {
            length = Math.ceil(length);
            width = Math.ceil(width);
        }
        return applyRounding(length * width, rounding);
    }
    if (basis === "weight") return toPositive(piece.weight);
    return 0;
};

// Bundled bisque/glaze share a single rate; luster always prices independently.
export const getEffectiveRate = (firingKey: FiringKey, studio: Studio): number => {
    if (studio.bundled && (firingKey === "bisque" || firingKey === "glaze")) {
        return toPositive(studio.bundledRate);
    }
    return toPositive(studio.firingRates[firingKey]);
};

// AND-gate: a piece pays for a firing only when both the studio toggle and
// the piece chip are on. Both quantity > 0 and rate > 0 are required for a
// nonzero price (zero quantity OR zero rate produces $0 honestly).
export const calculatePrice = (piece: Piece, studio: Studio): PieceResult => {
    const quantity = computeQuantity(piece, studio.basis, studio.rounding, studio.minHeight);
    let rate = 0;
    for (const firingType of FIRING_TYPES) {
        if (studio.firingToggles[firingType.key] && piece.firings[firingType.key]) {
            rate += getEffectiveRate(firingType.key, studio);
        }
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

export const toStoredRate = (display: number | string, basis: Basis): number => {
    const value = Number(display);
    if (!Number.isFinite(value)) return 0;
    return rateIsCents(basis) ? value / 100 : value;
};

export const rateUnitFor = (basis: Basis, dimensionUnit: DimensionUnit, weightUnit: WeightUnit): string => {
    if (basis === "volume")    return `¢/${dimensionUnit}³`;
    if (basis === "footprint") return `¢/${dimensionUnit}²`;
    if (basis === "weight")    return `$/${weightUnit}`;
    return "$";
};


/* ── Locale Detection ──
   US users default to inches and pounds. Liberia and Myanmar are the other
   imperial-leaning regions (per the React prototype's lookup), included for
   correctness even though their en-locale presence is small. */

const detectDefaultDimensionUnit = (): DimensionUnit => {
    try {
        const region = new Intl.Locale(navigator?.language ?? "").region ?? "";
        if (["US", "LR", "MM"].includes(region)) return "in";
    } catch (_) { /* Intl.Locale unavailable */ }
    return "cm";
};

const detectDefaultWeightUnit = (): WeightUnit => {
    try {
        const region = new Intl.Locale(navigator?.language ?? "").region ?? "";
        if (["US", "LR", "MM"].includes(region)) return "lb";
    } catch (_) { /* Intl.Locale unavailable */ }
    return "kg";
};


/* ── State ──
   Default load is Bisque-only with one empty piece. Pedagogical: tapping
   Glaze teaches studio→piece propagation; tapping the chain icon teaches
   Bundled. Don't pre-populate with example pieces. */

interface StateShape {
    basis: Basis;
    dimensionUnit: DimensionUnit;
    weightUnit: WeightUnit;
    firingToggles: FiringFlags;
    firingRates: FiringRates;
    bundled: boolean;
    bundledRate: number;
    minHeight: number;
    rounding: Rounding;
    pieces: Piece[];
    nextPieceId: number;
    unitHintVisible: boolean;
}

export const INITIAL_STATE: StateShape = {
    basis: "volume",
    dimensionUnit: detectDefaultDimensionUnit(),
    weightUnit: detectDefaultWeightUnit(),
    firingToggles: { bisque: true, glaze: false, luster: false },
    firingRates: { ...BASIS_META.volume.defaults },
    bundled: false,
    bundledRate: BASIS_META.volume.defaults.bisque,
    minHeight: 2,
    rounding: "dim-ceil",
    pieces: [
        { id: 1, name: "", L: "", W: "", H: "", weight: "",
          firings: { bisque: true, glaze: false, luster: false } },
    ],
    nextPieceId: 2,
    unitHintVisible: false,
};

export const state: StateShape = cloneInitialState();

// Tests reset state through this; a deep clone prevents shared-reference
// mutation across tests.
export function cloneInitialState(): StateShape {
    return {
        ...INITIAL_STATE,
        firingToggles: { ...INITIAL_STATE.firingToggles },
        firingRates: { ...INITIAL_STATE.firingRates },
        pieces: INITIAL_STATE.pieces.map((piece) => ({ ...piece, firings: { ...piece.firings } })),
    };
}

// Constructs a Studio bundle from the flat state shape. Used by
// calculatePrice and the comparison lookup.
export const studioSnapshot = (): Studio => ({
    basis: state.basis,
    dimensionUnit: state.dimensionUnit,
    weightUnit: state.weightUnit,
    firingToggles: state.firingToggles,
    firingRates: state.firingRates,
    bundled: state.bundled,
    bundledRate: state.bundledRate,
    minHeight: state.minHeight,
    rounding: state.rounding,
});


/* ── Propagation Primitive ──
   Writing to studio firing toggles propagates the new value to every piece's
   matching chip. This is THE rule for studio firing state. Both individual
   toggles and bundled pair-toggles call into this helper, so propagation is
   uniform across all studio-level firing mutations. Bundled activation uses
   a different rule (OR-migration) and is implemented inline in toggleBundled. */

const setStudioFirings = (next: Partial<FiringFlags>) => {
    state.firingToggles = { ...state.firingToggles, ...next };
    state.pieces = state.pieces.map((piece) => ({
        ...piece,
        firings: { ...piece.firings, ...next },
    }));
};


/* ── Studio-Level Event Handlers ── */

export const handleBasisChange = (event: Event) => {
    const next = (event.currentTarget as HTMLSelectElement).value as Basis;
    if (next === state.basis) return;
    state.basis = next;
    // Rates carry semantic meaning per basis (cents/in³ vs $/lb) so a basis
    // change must reset to that basis's defaults rather than reinterpret old
    // values. Bundled rate is reseeded from the new basis's bisque default.
    state.firingRates = { ...BASIS_META[next].defaults };
    state.bundledRate = BASIS_META[next].defaults.bisque;
};

export const handleDimensionUnitChange = (next: DimensionUnit) => {
    if (next === state.dimensionUnit) return;
    state.dimensionUnit = next;
    flashUnitHint();
};

export const handleWeightUnitChange = (next: WeightUnit) => {
    if (next === state.weightUnit) return;
    state.weightUnit = next;
    flashUnitHint();
};

export const handleRoundingChange = (event: Event) => {
    state.rounding = (event.currentTarget as HTMLSelectElement).value as Rounding;
};

export const handleMinHeightInput = (event: Event) => {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    state.minHeight = Number.isFinite(value) && value >= 0 ? value : 0;
};

// Tap a studio firing pill. When bundled is on, bisque and glaze flip
// together (Rule 2); otherwise the tapped firing flips alone. Both paths
// route through setStudioFirings so propagation is consistent.
export const toggleFiring = (key: FiringKey) => {
    const nextValue = !state.firingToggles[key];
    if (state.bundled && (key === "bisque" || key === "glaze")) {
        setStudioFirings({ bisque: nextValue, glaze: nextValue });
        return;
    }
    setStudioFirings({ [key]: nextValue });
};

// Bundled is a rate-structure change, not a firing-state change. It uses
// OR-migration on activation: pieces already paying for bisque or glaze are
// forced into both (now sharing the bundled rate); pieces with neither (e.g.
// a luster-only piece) stay untouched. Deactivation only spreads the bundled
// rate back into individual rates so the user can diverge them — pieces are
// not touched.
export const toggleBundled = () => {
    if (state.bundled) {
        state.firingRates = {
            ...state.firingRates,
            bisque: state.bundledRate,
            glaze: state.bundledRate,
        };
        state.bundled = false;
        return;
    }
    const bisqueRate = toPositive(state.firingRates.bisque);
    const glazeRate = toPositive(state.firingRates.glaze);
    const seed = bisqueRate > 0 ? bisqueRate
        : glazeRate > 0 ? glazeRate
        : BASIS_META[state.basis].defaults.bisque;
    state.bundledRate = seed;
    state.firingToggles = { ...state.firingToggles, bisque: true, glaze: true };
    state.bundled = true;
    state.pieces = state.pieces.map((piece) => {
        const inRelationship = piece.firings.bisque || piece.firings.glaze;
        if (!inRelationship) return piece;
        return {
            ...piece,
            firings: { ...piece.firings, bisque: true, glaze: true },
        };
    });
};

export const handleFiringRateInput = (key: FiringKey, event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    state.firingRates = { ...state.firingRates, [key]: toStoredRate(value, state.basis) };
};

export const handleBundledRateInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    state.bundledRate = toStoredRate(value, state.basis);
};


/* ── Piece-Level Event Handlers ── */

// Generic per-field updater. Components call this with the piece id and the
// field they're editing. Spreads the existing piece so unrelated fields
// stay intact.
export const updatePiece = (id: number, fields: Partial<Piece>) => {
    state.pieces = state.pieces.map((piece) =>
        piece.id === id ? { ...piece, ...fields } : piece,
    );
};

// Per-piece chip toggle. Does NOT propagate up to studio (Rule 5 — studio is
// the source of truth, pieces follow studio).
export const togglePieceFiring = (id: number, key: FiringKey) => {
    state.pieces = state.pieces.map((piece) => {
        if (piece.id !== id) return piece;
        return { ...piece, firings: { ...piece.firings, [key]: !piece.firings[key] } };
    });
};

// Pair-toggle for piece-row Bisque|Glaze when the studio is bundled. Driven
// off the tapped chip's current state so the result is intuitive: tap a lit
// chip → both go off; tap an unlit chip → both go on.
export const togglePiecePair = (id: number, tappedKey: "bisque" | "glaze") => {
    state.pieces = state.pieces.map((piece) => {
        if (piece.id !== id) return piece;
        const nextValue = !piece.firings[tappedKey];
        return {
            ...piece,
            firings: { ...piece.firings, bisque: nextValue, glaze: nextValue },
        };
    });
};

export const addPiece = () => {
    const id = state.nextPieceId;
    state.nextPieceId += 1;
    state.pieces = [
        ...state.pieces,
        {
            id,
            name: "", L: "", W: "", H: "", weight: "",
            firings: { ...state.firingToggles },
        },
    ];
};

export const removePiece = (id: number) => {
    state.pieces = state.pieces.filter((piece) => piece.id !== id);
};


/* ── Unit-Change Hint ──
   When a user changes units while pieces have data, flash a brief banner
   reminding them values aren't auto-converted. The 4-second decay is enough
   to read but short enough to be unobtrusive. Module-level timer prevents
   stacking flashes when the user clicks multiple unit pills in succession. */

let hintTimer: ReturnType<typeof setTimeout> | null = null;

const flashUnitHint = () => {
    const hasData = state.pieces.some(
        (piece) =>
            toPositive(piece.L) > 0 || toPositive(piece.W) > 0
            || toPositive(piece.H) > 0 || toPositive(piece.weight) > 0,
    );
    if (!hasData) return;
    state.unitHintVisible = true;
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
        state.unitHintVisible = false;
        hintTimer = null;
        m.redraw();
    }, UNIT_HINT_MS);
};


/* ── Derived View Data ──
   Computed once per render. Bundles per-piece pricing, comparison lookup,
   warning state, and the controls-card affordances (which fields to show,
   what step value, what unit suffix) so view code stays declarative. */

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
    activeUnitSet: readonly string[];
    activeUnit: string;
    setActiveUnit: (unit: string) => void;
    hasAnyActiveFiring: boolean;
    activeFiringCount: number;
    ghostSampleDisplay: string;
    totalQuantityUnit: string;
}

const formatGhostSample = (basis: Basis): string => {
    const sample = toDisplayRate(BASIS_META[basis].defaults.bisque, basis);
    return rateIsCents(basis) ? sample.toString() : sample.toFixed(2);
};

const computePieceComparison = (piece: Piece, studio: Studio): ComparisonEntry | null => {
    if (studio.basis === "weight") return null;
    const inchesPerUnit = INCHES_PER_UNIT[studio.dimensionUnit];
    const lengthIn = toPositive(piece.L) * inchesPerUnit;
    const widthIn = toPositive(piece.W) * inchesPerUnit;
    if (studio.basis === "footprint") {
        // Footprint mode falls back to the flat-aspect table by area. The L/W
        // sort handles non-square footprints; bucket selection is moot since
        // we're directly indexing the flat table.
        const sorted = [lengthIn, widthIn].sort((a, b) => b - a);
        if (sorted[1] === 0) return null;
        const area = sorted[0] * sorted[1];
        return COMPARISONS.flat.find((entry) => area <= entry.max) ?? null;
    }
    const heightIn = toPositive(piece.H) * inchesPerUnit;
    if (lengthIn * widthIn * heightIn <= 0) return null;
    return findComparison(lengthIn * widthIn * heightIn, bucketOf(lengthIn, widthIn, heightIn));
};

const computeQuantityUnit = (basis: Basis, dimensionUnit: DimensionUnit, weightUnit: WeightUnit): string =>
    basis === "volume"    ? `${dimensionUnit}³`
  : basis === "footprint" ? `${dimensionUnit}²`
  : weightUnit;

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

    // Aggregate. Total volume is computed in cubic inches across all pieces
    // for the cubeish silhouette lookup, which always uses inches regardless
    // of the user's display unit.
    let total = 0, totalQuantity = 0, totalVolumeIn3 = 0;
    for (const computed of pieces) {
        total += computed.result.price;
        totalQuantity += computed.result.quantity;
        if (studio.basis === "volume" || studio.basis === "footprint") {
            const inchesPerUnit = INCHES_PER_UNIT[studio.dimensionUnit];
            const lengthIn = toPositive(computed.piece.L) * inchesPerUnit;
            const widthIn = toPositive(computed.piece.W) * inchesPerUnit;
            const heightIn = studio.basis === "volume"
                ? toPositive(computed.piece.H) * inchesPerUnit
                : 1;
            totalVolumeIn3 += lengthIn * widthIn * heightIn;
        }
    }
    const aggregateComparison = totalVolumeIn3 > 0
        ? findComparison(totalVolumeIn3, "cubeish")
        : null;

    const activeFiringCount = (studio.firingToggles.bisque ? 1 : 0)
        + (studio.firingToggles.glaze ? 1 : 0)
        + (studio.firingToggles.luster ? 1 : 0);

    return {
        studio,
        pieces,
        aggregate: { total, totalQuantity, comparison: aggregateComparison },
        rateUnit: rateUnitFor(studio.basis, studio.dimensionUnit, studio.weightUnit),
        rateStep: rateIsCents(studio.basis) ? 0.1 : 0.05,
        showRounding: studio.basis === "volume" || studio.basis === "footprint",
        showMinHeight: studio.basis === "volume",
        activeUnitSet: studio.basis === "weight" ? WEIGHT_UNITS : DIMENSION_UNITS,
        activeUnit: studio.basis === "weight" ? studio.weightUnit : studio.dimensionUnit,
        setActiveUnit: studio.basis === "weight"
            ? (unit: string) => handleWeightUnitChange(unit as WeightUnit)
            : (unit: string) => handleDimensionUnitChange(unit as DimensionUnit),
        hasAnyActiveFiring: activeFiringCount > 0,
        activeFiringCount,
        ghostSampleDisplay: formatGhostSample(studio.basis),
        totalQuantityUnit: computeQuantityUnit(studio.basis, studio.dimensionUnit, studio.weightUnit),
    };
};
