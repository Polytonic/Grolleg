import { state, cloneInitialState } from "../../../source/views/firing-calculator/state";
import type { Piece, FiringFlags, FiringRates, Basis, DimensionUnit, WeightUnit, Rounding }
    from "../../../source/views/firing-calculator/state";

// Resets calculator state to production defaults. Uses cloneInitialState so
// each test starts with fresh nested objects (no shared-reference mutation).
export function resetState() {
    Object.assign(state, cloneInitialState());
}

// Builds a piece for tests with sensible defaults; spread `overrides` to
// customize. firings defaults to bisque-only (matches the production default
// for an added piece when only bisque is the studio's active firing).
let pieceCounter = 100;
export function makePiece(overrides: Partial<Piece> = {}): Piece {
    return {
        id: pieceCounter++,
        name: "",
        L: "", W: "", H: "",
        weight: "",
        firings: { bisque: true, glaze: false, luster: false },
        ...overrides,
    };
}

// Direct setters to compose state-mutation in a readable way for propagation
// tests. They write to the singleton; tests should reset before/after.
export function setStudio(opts: {
    basis?: Basis;
    dimensionUnit?: DimensionUnit;
    weightUnit?: WeightUnit;
    firingToggles?: Partial<FiringFlags>;
    firingRates?: Partial<FiringRates>;
    bundled?: boolean;
    bundledRate?: number;
    minHeight?: number;
    rounding?: Rounding;
}) {
    if (opts.basis !== undefined) state.basis = opts.basis;
    if (opts.dimensionUnit !== undefined) state.dimensionUnit = opts.dimensionUnit;
    if (opts.weightUnit !== undefined) state.weightUnit = opts.weightUnit;
    if (opts.firingToggles) state.firingToggles = { ...state.firingToggles, ...opts.firingToggles };
    if (opts.firingRates) state.firingRates = { ...state.firingRates, ...opts.firingRates };
    if (opts.bundled !== undefined) state.bundled = opts.bundled;
    if (opts.bundledRate !== undefined) state.bundledRate = opts.bundledRate;
    if (opts.minHeight !== undefined) state.minHeight = opts.minHeight;
    if (opts.rounding !== undefined) state.rounding = opts.rounding;
}

export function setPieces(pieces: Piece[]) {
    state.pieces = pieces;
    state.nextPieceId = pieces.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

// Mock event factory matching the shape handlers read at the call site.
export function mockInputEvent(value: string): Event {
    return { currentTarget: { value } } as unknown as Event;
}
