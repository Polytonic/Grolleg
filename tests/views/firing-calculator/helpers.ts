import { state, cloneInitialState } from "../../../source/views/firing-calculator/state";
import type { Piece, FiringFlags, FiringRates, Basis, DimensionUnit, WeightUnit, Rounding }
    from "../../../source/views/firing-calculator/state";

// Resets calculator state to production defaults. Each test starts
// with fresh nested objects so mutations don't leak across tests.
export function resetState() {
    Object.assign(state, cloneInitialState());
}

// Builds a piece for tests with sensible defaults; spread `overrides`
// to customize. The default firings match an added piece in the
// default studio (bisque-only).
let pieceCounter = 100;
export function makePiece(overrides: Partial<Piece> = {}): Piece {
    return {
        id: pieceCounter++,
        L: "", W: "", H: "",
        weight: "",
        firings: { bisque: true, glaze: false, luster: false },
        ...overrides,
    };
}

// Direct setters compose state mutations readably in propagation tests.
// They write to the singleton; tests should reset before and after.
export function setStudio(options: {
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
    if (options.basis !== undefined) state.basis = options.basis;
    if (options.dimensionUnit !== undefined) state.dimensionUnit = options.dimensionUnit;
    if (options.weightUnit !== undefined) state.weightUnit = options.weightUnit;
    if (options.firingToggles) state.firingToggles = { ...state.firingToggles, ...options.firingToggles };
    if (options.firingRates) state.firingRates = { ...state.firingRates, ...options.firingRates };
    if (options.bundled !== undefined) state.bundled = options.bundled;
    if (options.bundledRate !== undefined) state.bundledRate = options.bundledRate;
    if (options.minHeight !== undefined) state.minHeight = options.minHeight;
    if (options.rounding !== undefined) state.rounding = options.rounding;
}

export function setPieces(pieces: Piece[]) {
    state.pieces = pieces;
    state.nextPieceId = pieces.reduce((max, piece) => Math.max(max, piece.id), 0) + 1;
}

// Mock event factory matching the shape handlers read at the call site.
export function mockInputEvent(value: string): Event {
    return { currentTarget: { value } } as unknown as Event;
}
