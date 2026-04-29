import { state, cloneInitialState } from "../../../source/views/firing-calculator/state";
import type { Piece, FiringFlags, FiringRates, Basis, DimensionUnit, WeightUnit, Rounding }
    from "../../../source/views/firing-calculator/state";
export { mockInputEvent } from "../../helpers";

export function resetState() {
    Object.assign(state, cloneInitialState());
}

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

export function setStudio(options: {
    basis?: Basis;
    dimensionUnit?: DimensionUnit;
    weightUnit?: WeightUnit;
    firingToggles?: Partial<FiringFlags>;
    firingRates?: Partial<FiringRates>;
    bundled?: boolean;
    minHeight?: number;
    rounding?: Rounding;
}) {
    if (options.basis !== undefined) state.basis = options.basis;
    if (options.dimensionUnit !== undefined) state.dimensionUnit = options.dimensionUnit;
    if (options.weightUnit !== undefined) state.weightUnit = options.weightUnit;
    if (options.firingToggles) state.firingToggles = { ...state.firingToggles, ...options.firingToggles };
    if (options.firingRates) state.firingRates = { ...state.firingRates, ...options.firingRates };
    if (options.bundled !== undefined) state.bundled = options.bundled;
    if (options.minHeight !== undefined) state.minHeight = options.minHeight;
    if (options.rounding !== undefined) state.rounding = options.rounding;
}

export function setPieces(pieces: Piece[]) {
    state.pieces = pieces;
    state.nextPieceId = pieces.reduce((max, piece) => Math.max(max, piece.id), 0) + 1;
}
