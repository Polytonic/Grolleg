import {
    bucketOf, findComparison, COMPARISONS,
    INCHES_PER_UNIT,
} from "./comparison";
import type { ComparisonEntry } from "./comparison";


/* ── Types ── */

export type Basis = "volume" | "footprint" | "weight";
export type DimensionUnit = "mm" | "cm" | "in";
export type WeightUnit = "g" | "kg" | "oz" | "lb";
export type FiringKey = "bisque" | "glaze" | "luster";
export type Rounding = "dim-ceil" | "total-ceil" | "total-round" | "none";

export type FiringFlags = Record<FiringKey, boolean>;
export type FiringRates = Record<FiringKey, number>;

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

// Defaults grounded in typical community-studio rates. Stored in
// dollars. Volume and footprint display as cents (× 100), weight
// displays as dollars 1:1.
export const BASIS_META: Record<Basis, { label: string; defaults: FiringRates }> = {
    volume: {
        label: "Volume (L × W × H)",
        defaults: { bisque: 0.035, glaze: 0.035, luster: 0.08 },
    },
    footprint: {
        label: "Footprint (L × W)",
        defaults: { bisque: 0.07, glaze: 0.07, luster: 0.15 },
    },
    weight: {
        label: "Weight",
        defaults: { bisque: 1.0, glaze: 1.0, luster: 2.0 },
    },
};

export const ROUNDING_OPTIONS: { key: Rounding; label: string }[] = [
    { key: "dim-ceil",    label: "Each Dimension" },
    { key: "total-ceil",  label: "Total" },
    { key: "total-round", label: "Nearest Whole" },
    { key: "none",        label: "Don't Round" },
];

export const DIMENSION_UNITS: readonly DimensionUnit[] = ["mm", "cm", "in"];
export const WEIGHT_UNITS: readonly WeightUnit[] = ["g", "kg", "oz", "lb"];


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

// Quantity in display units (cm³, in³, lb, etc.). Volume applies the
// height floor before per-dim ceiling so the floor reflects the studio's
// true billable height. Rounding is a measurement convention layered
// on top.
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

// Bundled bisque/glaze share a single rate. Luster always prices independently.
export const getEffectiveRate = (firingKey: FiringKey, studio: Studio): number => {
    if (studio.bundled && (firingKey === "bisque" || firingKey === "glaze")) {
        return toPositive(studio.bundledRate);
    }
    return toPositive(studio.firingRates[firingKey]);
};

// A piece pays for a firing only when both the studio toggle and the
// piece chip are on. Both quantity and rate must be positive for a
// non-zero price. Either being zero produces $0 honestly.
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
   US users default to inches and pounds. Liberia and Myanmar are the
   other imperial-leaning regions; included for correctness even though
   their en-locale presence is small. */

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
   Default load is bisque-only with one empty piece. Tapping Glaze
   teaches studio-to-piece propagation; tapping the chain icon teaches
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
    // Monotonic counter that ticks every time the bundled toggle is
    // flipped. Threaded through the bisque/glaze/bundled rate inputs
    // (not luster) so the inputs replay their CSS pulse on each
    // toggle, signalling that those rates likely need refreshing.
    bundlePulseKey: number;
}

// Per-input tracker carried on the vnode state so each input
// remembers the last pulseKey it ran for and only replays the
// animation when the key actually changes.
export type PulseTracker = { lastPulseKey: number };

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
        { id: 1, L: "", W: "", H: "", weight: "",
          firings: { bisque: true, glaze: false, luster: false } },
    ],
    nextPieceId: 2,
    bundlePulseKey: 0,
};

export const state: StateShape = cloneInitialState();

// Tests reset state through this. The nested objects are deep-cloned
// so mutations in one test don't leak into the next.
export function cloneInitialState(): StateShape {
    return {
        ...INITIAL_STATE,
        firingToggles: { ...INITIAL_STATE.firingToggles },
        firingRates: { ...INITIAL_STATE.firingRates },
        pieces: INITIAL_STATE.pieces.map((piece) => ({ ...piece, firings: { ...piece.firings } })),
    };
}

// A Studio bundle for calculatePrice and the comparison lookup. Nested
// objects are shallow-cloned so a snapshot survives an event-handler
// mutation mid-render without aliasing global state.
export const studioSnapshot = (): Studio => ({
    basis: state.basis,
    dimensionUnit: state.dimensionUnit,
    weightUnit: state.weightUnit,
    firingToggles: { ...state.firingToggles },
    firingRates: { ...state.firingRates },
    bundled: state.bundled,
    bundledRate: state.bundledRate,
    minHeight: state.minHeight,
    rounding: state.rounding,
});


/* ── Propagation Primitive ──
   Writing studio firing toggles also writes the new values to every
   piece's matching chip. Individual toggles and bundled pair-toggles
   both route through this helper for uniform behavior. Bundled
   activation uses a different rule (preserve luster-only pieces) and
   is implemented inline in toggleBundled. */

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
    // Rates carry semantic meaning per basis (cents/in³ vs $/lb), so
    // a basis change reseeds from that basis' defaults rather than
    // reinterpret existing numbers in a different unit.
    state.firingRates = { ...BASIS_META[next].defaults };
    state.bundledRate = BASIS_META[next].defaults.bisque;
};

export const handleDimensionUnitChange = (next: DimensionUnit) => {
    if (next === state.dimensionUnit) return;
    state.dimensionUnit = next;
};

export const handleWeightUnitChange = (next: WeightUnit) => {
    if (next === state.weightUnit) return;
    state.weightUnit = next;
};

export const handleRoundingChange = (event: Event) => {
    state.rounding = (event.currentTarget as HTMLSelectElement).value as Rounding;
};

// Realistic kiln-shelf intervals are 1 to 4 inches. The cap rejects
// pasted exponents and fat-fingered values that would otherwise scale
// every billed quantity to nonsense.
const MIN_HEIGHT_MAX = 100;
export const handleMinHeightInput = (event: Event) => {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (!Number.isFinite(value) || value < 0) {
        state.minHeight = 0;
        return;
    }
    state.minHeight = Math.min(value, MIN_HEIGHT_MAX);
};

// Tap a studio firing pill. When bundled is on, bisque and glaze flip
// together (one logical control). Otherwise the tapped firing flips
// alone. Both paths route through setStudioFirings so propagation is
// uniform.
export const toggleFiring = (key: FiringKey) => {
    const nextValue = !state.firingToggles[key];
    if (state.bundled && (key === "bisque" || key === "glaze")) {
        setStudioFirings({ bisque: nextValue, glaze: nextValue });
        return;
    }
    setStudioFirings({ [key]: nextValue });
};

// Bundled is a rate-structure change, not a firing-state change. On
// activation, pieces already paying for bisque or glaze get both forced
// on (now sharing the bundled rate). Pieces with neither (e.g. a
// luster-only piece) stay untouched. On deactivation, the bundled rate
// spreads back into both individual rates so the user can diverge
// them. Pieces are not touched.
export const toggleBundled = () => {
    // Pulse fires regardless of direction. Both transitions (OFF→ON
    // and ON→OFF) reshape which rate inputs are visible and the
    // user likely needs to refresh those values.
    state.bundlePulseKey += 1;
    if (state.bundled) {
        state.firingRates = {
            ...state.firingRates,
            bisque: state.bundledRate,
            glaze: state.bundledRate,
        };
        state.bundled = false;
        return;
    }
    // Seed the shared rate from whichever side is set. Falls back to
    // the basis' bisque default when both individual rates have been
    // cleared to zero (rare, since defaults pre-fill on load).
    const bisqueRate = toPositive(state.firingRates.bisque);
    const glazeRate = toPositive(state.firingRates.glaze);
    state.bundledRate = bisqueRate > 0 ? bisqueRate
        : glazeRate > 0 ? glazeRate
        : BASIS_META[state.basis].defaults.bisque;
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

// Per-piece chip toggle. Does not propagate up to studio. Studio is the
// source of truth. Pieces follow studio.
export const togglePieceFiring = (id: number, key: FiringKey) => {
    state.pieces = state.pieces.map((piece) => {
        if (piece.id !== id) return piece;
        return { ...piece, firings: { ...piece.firings, [key]: !piece.firings[key] } };
    });
};

// Pair-toggle for the piece-row Bisque|Glaze chip when the studio is
// bundled. Both halves follow the tapped chip's new value, so tapping a
// lit chip turns both off and tapping an unlit chip turns both on.
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
            L: "", W: "", H: "", weight: "",
            firings: { ...state.firingToggles },
        },
    ];
};

export const removePiece = (id: number) => {
    state.pieces = state.pieces.filter((piece) => piece.id !== id);
};


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
    setActiveUnit: (unit: DimensionUnit | WeightUnit) => void;
    totalQuantityUnit: string;
}

const computePieceComparison = (piece: Piece, studio: Studio): ComparisonEntry | null => {
    if (studio.basis === "weight") return null;
    const inchesPerUnit = INCHES_PER_UNIT[studio.dimensionUnit];
    const lengthIn = toPositive(piece.L) * inchesPerUnit;
    const widthIn = toPositive(piece.W) * inchesPerUnit;
    if (studio.basis === "footprint") {
        // Footprint mode falls back to the flat-aspect table by area. The L/W
        // sort handles non-square footprints. Bucket selection is moot since
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
            ? (unit) => handleWeightUnitChange(unit as WeightUnit)
            : (unit) => handleDimensionUnitChange(unit as DimensionUnit),
        totalQuantityUnit: computeQuantityUnit(studio.basis, studio.dimensionUnit, studio.weightUnit),
    };
};
