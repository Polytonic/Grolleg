import { parseLocaleNumber, detectDefaultDimensionUnit, detectDefaultWeightUnit } from "../../components/locale";
import { focusLater } from "../../components/interaction";
import { BASIS_META, ROUNDING_OPTIONS } from "./types";
import type { Basis, DimensionUnit, WeightUnit, FiringKey, Rounding, FiringFlags, FiringRates, Piece, Studio } from "./types";
import { toPositive, toStoredRate } from "./pricing";


// Type Guards
const BASES = new Set<string>(Object.keys(BASIS_META));
const isBasis = (value: string): value is Basis => BASES.has(value);

const ROUNDINGS = new Set<string>(ROUNDING_OPTIONS.map((option) => option.key));
const isRounding = (value: string): value is Rounding => ROUNDINGS.has(value);


// Unit-Aware Defaults
const DEFAULT_MIN_HEIGHTS: Record<DimensionUnit, number> = { in: 2, cm: 5, mm: 50 };
const defaultDimensionUnit: DimensionUnit = detectDefaultDimensionUnit();
const defaultWeightUnit: WeightUnit = detectDefaultWeightUnit();


// State
// The default load should be bisque-only with one empty piece. Tapping Glaze
// teaches studio-to-piece propagation. Tapping the chain icon teaches Bundled.
// Do not pre-populate with example pieces.

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
    // bundlePulseKey should tick every time the bundled toggle flips, so
    // bisque, glaze, and bundled rate inputs replay their CSS pulse.
    bundlePulseKey: number;
    // firingRatesByBasis should preserve each measurement method's last
    // edited rates instead of sharing incompatible display units.
    firingRatesByBasis: Record<Basis, FiringRates>;
}

const INITIAL_STATE: StateShape = {
    basis: "volume",
    dimensionUnit: defaultDimensionUnit,
    weightUnit: defaultWeightUnit,
    firingToggles: { bisque: true, glaze: false, luster: false },
    firingRates: { ...BASIS_META.volume.defaults },
    bundled: false,
    minHeight: DEFAULT_MIN_HEIGHTS[defaultDimensionUnit],
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

// cloneInitialState should return a fresh copy with nested objects cloned, so
// callers that mutate the result do not leak changes into the shared default.
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

// studioSnapshot should give pricing and comparison code a stable studio bundle
// whose nested objects cannot alias event-handler mutations mid-render.
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


// Propagation Primitive
// setStudioFirings should write studio firing toggles and each piece's matching
// chip together. Bundled activation preserves luster-only pieces, so it stays
// inline in toggleBundled.

const setStudioFirings = (next: Partial<FiringFlags>) => {
    state.firingToggles = { ...state.firingToggles, ...next };
    state.pieces = state.pieces.map((piece) => ({
        ...piece,
        firings: { ...piece.firings, ...next },
    }));
};


// Studio-Level Event Handlers
export const handleBasisChange = (event: Event) => {
    const next = (event.currentTarget as HTMLSelectElement).value;
    if (!isBasis(next)) return;
    if (next === state.basis) return;
    // The active basis should save a spread copy before switching, so returning
    // to this basis restores edits in the same display units.
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
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (!isRounding(value)) return;
    state.rounding = value;
};

// Realistic kiln-shelf intervals are 1 to 4 inches. The cap rejects
// pasted exponents and fat-fingered values that would otherwise scale
// every billed quantity to nonsense.
const MIN_HEIGHT_MAX = 100;
// parseDecimalDraft should preserve editable field semantics: blank becomes
// zero, invalid locale text becomes null, and valid locale decimals parse.
const parseDecimalDraft = (raw: string): number | null => {
    if (raw.trim() === "") return 0;
    const value = parseLocaleNumber(raw);
    return Number.isFinite(value) ? value : null;
};

export const handleMinHeightInput = (event: Event) => {
    const raw = (event.currentTarget as HTMLInputElement).value;
    const value = parseDecimalDraft(raw);
    if (value === null) return;
    if (value < 0) {
        state.minHeight = 0;
        return;
    }
    state.minHeight = Math.min(value, MIN_HEIGHT_MAX);
};

// toggleFiring should treat bisque and glaze as one logical control while
// bundled mode is on.
export const toggleFiring = (key: FiringKey) => {
    const nextValue = !state.firingToggles[key];
    if (state.bundled && (key === "bisque" || key === "glaze")) {
        setStudioFirings({ bisque: nextValue, glaze: nextValue });
        return;
    }
    setStudioFirings({ [key]: nextValue });
};

// toggleBundled should change rate structure, not luster-only pieces. Pieces
// already paying for bisque or glaze get both because the bundled rate covers
// that pair.
export const toggleBundled = () => {
    state.bundlePulseKey += 1;
    if (state.bundled) {
        state.bundled = false;
        return;
    }
    // The bundled rate should start from edited bisque plus glaze rates when
    // those rates differ from defaults.
    const meta = BASIS_META[state.basis];
    const ratesAtDefaults =
        state.firingRates.bisque === meta.defaults.bisque
        && state.firingRates.glaze === meta.defaults.glaze;
    if (!ratesAtDefaults && state.firingRates.bundled === meta.defaults.bundled) {
        const bisqueRate = toPositive(state.firingRates.bisque);
        const glazeRate = toPositive(state.firingRates.glaze);
        const sum = bisqueRate + glazeRate;
        state.firingRates = {
            ...state.firingRates,
            bundled: sum > 0 ? sum : meta.defaults.bundled,
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
    const raw = (event.currentTarget as HTMLInputElement).value;
    const value = parseDecimalDraft(raw);
    if (value === null) return;
    state.firingRates = { ...state.firingRates, [key]: toStoredRate(value, state.basis) };
    state.firingRatesByBasis[state.basis] = { ...state.firingRates };
};

export const handleBundledRateInput = (event: Event) => {
    const raw = (event.currentTarget as HTMLInputElement).value;
    const value = parseDecimalDraft(raw);
    if (value === null) return;
    state.firingRates = { ...state.firingRates, bundled: toStoredRate(value, state.basis) };
    state.firingRatesByBasis[state.basis] = { ...state.firingRates };
};


// Piece-Level Event Handlers
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
    const firstInputId = state.basis === "weight" ? `piece-${id}-weight` : `piece-${id}-L`;
    focusLater(firstInputId);
};

export const removePiece = (id: number) => {
    // removePiece should keep at least one piece. The UI hides the remove
    // button on a single-piece view, but programmatic calls need the same guard.
    if (state.pieces.length <= 1) return;
    const removedIndex = state.pieces.findIndex((piece) => piece.id === id);
    state.pieces = state.pieces.filter((piece) => piece.id !== id);
    // Focus should land on the piece before the removed one, or on the new last
    // piece when the removed piece was last.
    const targetIndex = Math.min(Math.max(removedIndex - 1, 0), state.pieces.length - 1);
    const target = state.pieces[targetIndex];
    const firstInputId = state.basis === "weight" ? `piece-${target.id}-weight` : `piece-${target.id}-L`;
    focusLater(firstInputId);
};
