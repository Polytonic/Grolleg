import { parseLocaleNumber, detectDefaultDimensionUnit, detectDefaultWeightUnit } from "../../components/locale";
import { BASIS_META } from "./types";
import type { Basis, DimensionUnit, WeightUnit, FiringKey, Rounding, FiringFlags, FiringRates, Piece, Studio } from "./types";
import { toPositive, toStoredRate } from "./pricing";

export * from "./types";
export * from "./pricing";


/* ── Unit-Aware Defaults ── */

const DEFAULT_MIN_HEIGHTS: Record<DimensionUnit, number> = { in: 2, cm: 5, mm: 50 };


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
    minHeight: number;
    rounding: Rounding;
    pieces: Piece[];
    nextPieceId: number;
    // Monotonic counter that ticks every time the bundled toggle is
    // flipped. Threaded through the bisque/glaze/bundled rate inputs
    // (not luster) so the inputs replay their CSS pulse on each
    // toggle, signalling that those rates likely need refreshing.
    bundlePulseKey: number;
    // Per-basis cache of the user's last-entered rates, so switching
    // measurement methods preserves prior edits instead of silently
    // discarding them. Updated on basis change and on every rate-input
    // event for the active basis.
    firingRatesByBasis: Record<Basis, FiringRates>;
}

export const INITIAL_STATE: StateShape = {
    basis: "volume",
    dimensionUnit: detectDefaultDimensionUnit(),
    weightUnit: detectDefaultWeightUnit(),
    firingToggles: { bisque: true, glaze: false, luster: false },
    firingRates: { ...BASIS_META.volume.defaults },
    bundled: false,
    minHeight: DEFAULT_MIN_HEIGHTS[detectDefaultDimensionUnit()],
    rounding: "dimension-ceil",
    pieces: [
        { id: 1, L: "", W: "", H: "", weight: "",
          firings: { bisque: true, glaze: false, luster: false } },
    ],
    nextPieceId: 2,
    bundlePulseKey: 0,
    firingRatesByBasis: {
        volume:    { ...BASIS_META.volume.defaults },
        footprint: { ...BASIS_META.footprint.defaults },
        weight:    { ...BASIS_META.weight.defaults },
    },
};

export const state: StateShape = cloneInitialState();

// Returns a fresh copy of INITIAL_STATE with nested objects deep-cloned,
// so callers that mutate the result don't leak changes back into the
// shared default.
export function cloneInitialState(): StateShape {
    return {
        ...INITIAL_STATE,
        firingToggles: { ...INITIAL_STATE.firingToggles },
        firingRates: { ...INITIAL_STATE.firingRates },
        pieces: INITIAL_STATE.pieces.map((piece) => ({ ...piece, firings: { ...piece.firings } })),
        firingRatesByBasis: {
            volume:    { ...INITIAL_STATE.firingRatesByBasis.volume },
            footprint: { ...INITIAL_STATE.firingRatesByBasis.footprint },
            weight:    { ...INITIAL_STATE.firingRatesByBasis.weight },
        },
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
    // Save the active basis' rates into the per-basis cache so a return
    // to this basis later restores the user's edits instead of reseeding
    // from defaults. Rates carry semantic meaning per basis (cents/in³ vs
    // $/lb), so the cache is segmented by basis rather than shared.
    state.firingRatesByBasis[state.basis] = { ...state.firingRates };
    state.basis = next;
    state.firingRates = { ...state.firingRatesByBasis[next] };
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
    const raw = (event.currentTarget as HTMLInputElement).value;
    const value = parseLocaleNumber(raw);
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
// activation, pieces already paying for bisque or glaze get both
// forced on (sharing firingRates.bundled). Pieces with neither
// (e.g. luster-only) stay untouched. Bisque/glaze rates live in
// firingRates alongside the bundled rate, so they survive the
// round-trip without explicit save/restore.
export const toggleBundled = () => {
    state.bundlePulseKey += 1;
    if (state.bundled) {
        state.bundled = false;
        return;
    }
    // Seed the bundled rate if the user hasn't edited it yet. When
    // bisque/glaze are still at their per-basis defaults, use the
    // bundled default so toggling on a fresh page visibly changes
    // the total instead of echoing the bisque rate.
    const meta = BASIS_META[state.basis];
    const ratesAtDefaults =
        state.firingRates.bisque === meta.defaults.bisque
        && state.firingRates.glaze === meta.defaults.glaze;
    if (!ratesAtDefaults && state.firingRates.bundled === meta.defaults.bundled) {
        const bisqueRate = toPositive(state.firingRates.bisque);
        const glazeRate = toPositive(state.firingRates.glaze);
        state.firingRates = {
            ...state.firingRates,
            bundled: bisqueRate > 0 ? bisqueRate
                : glazeRate > 0 ? glazeRate
                : meta.defaults.bundled,
        };
    }
    state.firingRatesByBasis[state.basis] = { ...state.firingRates };
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
    state.firingRatesByBasis[state.basis] = state.firingRates;
};

export const handleBundledRateInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    state.firingRates = { ...state.firingRates, bundled: toStoredRate(value, state.basis) };
    state.firingRatesByBasis[state.basis] = { ...state.firingRates };
};


/* ── Piece-Level Event Handlers ── */

const updatePieceById = (id: number, update: (piece: Piece) => Piece) => {
    state.pieces = state.pieces.map((piece) =>
        piece.id === id ? update(piece) : piece,
    );
};

export const updatePiece = (id: number, fields: Partial<Piece>) => {
    updatePieceById(id, (piece) => ({ ...piece, ...fields }));
};

export const togglePieceFiring = (id: number, key: FiringKey) => {
    updatePieceById(id, (piece) => ({
        ...piece, firings: { ...piece.firings, [key]: !piece.firings[key] },
    }));
};

export const togglePiecePair = (id: number, tappedKey: "bisque" | "glaze") => {
    updatePieceById(id, (piece) => {
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
    // Guard the invariant: at least one piece always exists. The UI hides
    // the X button on a single-piece view, but a programmatic call (or
    // a future keyboard shortcut) would otherwise leave the page empty.
    if (state.pieces.length <= 1) return;
    state.pieces = state.pieces.filter((piece) => piece.id !== id);
};
