import { describe, it, expect, beforeEach } from "bun:test";
import {
    state, toggleFiring, toggleBundled,
    togglePieceFiring, togglePiecePair,
    addPiece, removePiece, updatePiece,
    handleBasisChange, handleDimensionUnitChange, handleWeightUnitChange,
    handleBundledRateInput,
    BASIS_META,
} from "../../../source/views/firing-calculator/state";
import { resetState, makePiece, setStudio, setPieces, mockInputEvent } from "./helpers";

beforeEach(() => resetState());


/* ── Rule 1: Studio Individual Toggle Propagates Symmetrically ── */

describe("studio individual firing toggle propagates to every piece", () => {
    it("toggle bisque ON at studio: every piece gets bisque ON", () => {
        setStudio({ firingToggles: { bisque: false, glaze: false, luster: false } });
        setPieces([
            makePiece({ firings: { bisque: false, glaze: false, luster: false } }),
            makePiece({ firings: { bisque: false, glaze: true,  luster: false } }),
        ]);
        toggleFiring("bisque");
        expect(state.firingToggles.bisque).toBe(true);
        expect(state.pieces[0].firings.bisque).toBe(true);
        expect(state.pieces[1].firings.bisque).toBe(true);
        expect(state.pieces[1].firings.glaze).toBe(true); // unchanged
    });

    it("toggle bisque OFF at studio: every piece gets bisque OFF", () => {
        setStudio({ firingToggles: { bisque: true, glaze: true, luster: true } });
        setPieces([
            makePiece({ firings: { bisque: true, glaze: true, luster: true } }),
        ]);
        toggleFiring("bisque");
        expect(state.firingToggles.bisque).toBe(false);
        expect(state.pieces[0].firings.bisque).toBe(false);
    });

    it("toggle luster propagates symmetrically (independent of bundled)", () => {
        setStudio({ firingToggles: { bisque: true, glaze: false, luster: false } });
        setPieces([
            makePiece({ firings: { bisque: true, glaze: false, luster: false } }),
        ]);
        toggleFiring("luster");
        expect(state.firingToggles.luster).toBe(true);
        expect(state.pieces[0].firings.luster).toBe(true);
    });
});


/* ── Rule 2: Bundled Pair-Toggle Propagates the Pair ── */

describe("bundled pair-toggle propagates both bisque and glaze", () => {
    it("toggle bisque under bundled flips both at studio AND on every piece", () => {
        setStudio({
            bundled: true,
            firingToggles: { bisque: true, glaze: true, luster: false },
        });
        setPieces([
            makePiece({ firings: { bisque: true, glaze: true, luster: false } }),
        ]);
        toggleFiring("bisque");
        expect(state.firingToggles.bisque).toBe(false);
        expect(state.firingToggles.glaze).toBe(false);
        expect(state.pieces[0].firings.bisque).toBe(false);
        expect(state.pieces[0].firings.glaze).toBe(false);
    });

    it("toggling glaze under bundled does the same (symmetry)", () => {
        setStudio({
            bundled: true,
            firingToggles: { bisque: false, glaze: false, luster: false },
        });
        setPieces([makePiece({ firings: { bisque: false, glaze: false, luster: false } })]);
        toggleFiring("glaze");
        expect(state.firingToggles.bisque).toBe(true);
        expect(state.firingToggles.glaze).toBe(true);
        expect(state.pieces[0].firings.bisque).toBe(true);
        expect(state.pieces[0].firings.glaze).toBe(true);
    });
});


/* ── Rule 3: Bundled Activation OR-Migrates Pieces ──
   The single most-debated decision in the prototype's iteration. The panel
   reversed an initial unified-overwrite consensus when the luster-only piece
   was raised. */

describe("bundled activation OR-migrates pieces", () => {
    it("piece with bisque OR glaze on gets both forced on", () => {
        setStudio({ bundled: false });
        setPieces([
            makePiece({ firings: { bisque: true,  glaze: false, luster: false } }),
            makePiece({ firings: { bisque: false, glaze: true,  luster: false } }),
            makePiece({ firings: { bisque: true,  glaze: true,  luster: false } }),
        ]);
        toggleBundled();
        expect(state.pieces[0].firings).toEqual({ bisque: true, glaze: true, luster: false });
        expect(state.pieces[1].firings).toEqual({ bisque: true, glaze: true, luster: false });
        expect(state.pieces[2].firings).toEqual({ bisque: true, glaze: true, luster: false });
    });

    it("luster-only piece is preserved (not enrolled into bisque/glaze)", () => {
        setStudio({ bundled: false });
        setPieces([
            makePiece({ firings: { bisque: false, glaze: false, luster: true } }),
        ]);
        toggleBundled();
        // The piece stays luster-only; bundling doesn't auto-enroll it.
        expect(state.pieces[0].firings).toEqual({ bisque: false, glaze: false, luster: true });
    });

    it("piece with no firings stays empty (not enrolled by bundling)", () => {
        setStudio({ bundled: false });
        setPieces([
            makePiece({ firings: { bisque: false, glaze: false, luster: false } }),
        ]);
        toggleBundled();
        expect(state.pieces[0].firings).toEqual({ bisque: false, glaze: false, luster: false });
    });

    it("bundled activation forces studio bisque AND glaze on", () => {
        setStudio({ bundled: false, firingToggles: { bisque: false, glaze: false, luster: false } });
        toggleBundled();
        expect(state.bundled).toBe(true);
        expect(state.firingToggles.bisque).toBe(true);
        expect(state.firingToggles.glaze).toBe(true);
    });

    it("toggleBundled bumps bundlePulseKey on every flip (drives the rate-input pulse animation)", () => {
        const before = state.bundlePulseKey;
        toggleBundled();
        expect(state.bundlePulseKey).toBe(before + 1);
        toggleBundled();
        expect(state.bundlePulseKey).toBe(before + 2);
    });

    it("bundled activation seeds firingRates.bundled from first non-zero individual rate", () => {
        setStudio({
            bundled: false,
            firingRates: { bisque: 0.05, glaze: 0.06, luster: 0.10, bundled: BASIS_META.volume.defaults.bundled },
        });
        toggleBundled();
        expect(state.firingRates.bundled).toBeCloseTo(0.05);
    });

    it("bundled activation falls back to the default when both individual rates are zero", () => {
        setStudio({
            bundled: false,
            firingRates: { bisque: 0, glaze: 0, luster: 0.10, bundled: BASIS_META.volume.defaults.bundled },
        });
        toggleBundled();
        expect(state.firingRates.bundled).toBeCloseTo(BASIS_META.volume.defaults.bundled);
    });

    it("bundled activation keeps the default when bisque/glaze are at their defaults", () => {
        setStudio({ basis: "volume", bundled: false });
        toggleBundled();
        expect(state.firingRates.bundled).toBeCloseTo(BASIS_META.volume.defaults.bundled);
        expect(state.firingRates.bundled).not.toBeCloseTo(BASIS_META.volume.defaults.bisque);
    });
});


/* ── Rule 4: Bundled Deactivation Does Not Propagate to Pieces ── */

describe("bundled deactivation leaves pieces unchanged", () => {
    it("pieces unchanged on deactivation", () => {
        setStudio({
            bundled: true,
            firingToggles: { bisque: true, glaze: true, luster: true },
        });
        setPieces([
            makePiece({ firings: { bisque: true,  glaze: true, luster: true } }),
            makePiece({ firings: { bisque: false, glaze: false, luster: true } }),
        ]);
        toggleBundled();
        expect(state.bundled).toBe(false);
        expect(state.pieces[0].firings).toEqual({ bisque: true, glaze: true, luster: true });
        expect(state.pieces[1].firings).toEqual({ bisque: false, glaze: false, luster: true });
    });

    it("deactivation restores the bisque/glaze rates saved on activation", () => {
        setStudio({
            bundled: false,
            firingRates: { bisque: 0.04, glaze: 0.045, luster: 0.08 },
        });
        toggleBundled();
        expect(state.bundled).toBe(true);
        toggleBundled();
        expect(state.bundled).toBe(false);
        expect(state.firingRates.bisque).toBeCloseTo(0.04);
        expect(state.firingRates.glaze).toBeCloseTo(0.045);
        expect(state.firingRates.luster).toBeCloseTo(0.08);
    });

    it("round-trip preserves rates even when the bundled rate was edited", () => {
        setStudio({
            bundled: false,
            firingRates: { bisque: 0.03, glaze: 0.05, luster: 0.10 },
        });
        toggleBundled();
        handleBundledRateInput(mockInputEvent("9"));
        toggleBundled();
        expect(state.firingRates.bisque).toBeCloseTo(0.03);
        expect(state.firingRates.glaze).toBeCloseTo(0.05);
    });
});


/* ── Rule 5: Per-Piece Chip Toggle Does Not Propagate Up ── */

describe("piece-level chip toggle leaves studio unchanged", () => {
    it("toggling a piece chip doesn't touch studio toggles", () => {
        setStudio({ firingToggles: { bisque: true, glaze: true, luster: false } });
        setPieces([makePiece({ firings: { bisque: true, glaze: true, luster: false } })]);
        const id = state.pieces[0].id;
        togglePieceFiring(id, "bisque");
        expect(state.pieces[0].firings.bisque).toBe(false);
        expect(state.firingToggles.bisque).toBe(true);
    });

    it("piece pair-toggle (under bundled) flips both chips for that piece only", () => {
        setStudio({
            bundled: true,
            firingToggles: { bisque: true, glaze: true, luster: false },
        });
        setPieces([
            makePiece({ firings: { bisque: true, glaze: true, luster: false } }),
            makePiece({ firings: { bisque: true, glaze: true, luster: false } }),
        ]);
        const firstId = state.pieces[0].id;
        togglePiecePair(firstId, "bisque");
        // First piece: both off (the tapped chip was on, so both go off)
        expect(state.pieces[0].firings.bisque).toBe(false);
        expect(state.pieces[0].firings.glaze).toBe(false);
        // Second piece: untouched
        expect(state.pieces[1].firings.bisque).toBe(true);
        expect(state.pieces[1].firings.glaze).toBe(true);
        // Studio: untouched
        expect(state.firingToggles.bisque).toBe(true);
        expect(state.firingToggles.glaze).toBe(true);
    });
});


/* ── Basis Change Resets Rates; Unit Change Preserves Them ── */

describe("basis change reseeds rates; unit change does not", () => {
    it("changing basis reseeds rates from the new basis' defaults", () => {
        setStudio({ firingRates: { bisque: 0.05, glaze: 0.06, luster: 0.10 } });
        const event = { currentTarget: { value: "weight" } } as unknown as Event;
        handleBasisChange(event);
        expect(state.firingRates).toEqual(BASIS_META.weight.defaults);
    });

    it("changing basis reseeds bundled rate from the new basis' default", () => {
        setStudio({ firingRates: { bisque: 0.04, glaze: 0.04, luster: 0.08, bundled: 0.06 } });
        const event = { currentTarget: { value: "footprint" } } as unknown as Event;
        handleBasisChange(event);
        expect(state.firingRates.bundled).toBeCloseTo(BASIS_META.footprint.defaults.bundled);
    });

    it("re-selecting current basis is a no-op", () => {
        setStudio({ basis: "volume", firingRates: { bisque: 0.07, glaze: 0.07, luster: 0.07, bundled: 0.07 } });
        const event = { currentTarget: { value: "volume" } } as unknown as Event;
        handleBasisChange(event);
        expect(state.firingRates.bisque).toBeCloseTo(0.07);
    });

    it("changing dim unit does not reset rates", () => {
        setStudio({ basis: "volume", firingRates: { bisque: 0.05, glaze: 0.05, luster: 0.10 } });
        handleDimensionUnitChange("cm");
        expect(state.dimensionUnit).toBe("cm");
        expect(state.firingRates.bisque).toBeCloseTo(0.05);
    });

    it("round-tripping basis preserves user-edited rates via the per-basis cache", () => {
        setStudio({ basis: "volume", firingRates: { bisque: 0.05, glaze: 0.06, luster: 0.10, bundled: 0.09 } });
        const toWeight = { currentTarget: { value: "weight" } } as unknown as Event;
        handleBasisChange(toWeight);
        expect(state.firingRates).toEqual(BASIS_META.weight.defaults);
        const backToVolume = { currentTarget: { value: "volume" } } as unknown as Event;
        handleBasisChange(backToVolume);
        expect(state.firingRates).toEqual({ bisque: 0.05, glaze: 0.06, luster: 0.10, bundled: 0.09 });
    });

    it("changing weight unit does not reset rates", () => {
        setStudio({ basis: "weight", firingRates: { bisque: 1.5, glaze: 1.5, luster: 2.0 } });
        handleWeightUnitChange("kg");
        expect(state.weightUnit).toBe("kg");
        expect(state.firingRates.bisque).toBeCloseTo(1.5);
    });
});


/* ── updatePiece ── */

describe("updatePiece", () => {
    it("updates the targeted piece and leaves others intact", () => {
        setPieces([makePiece({ id: 1, L: "4" }), makePiece({ id: 2, L: "5" })]);
        updatePiece(1, { L: "10" });
        expect(state.pieces[0].L).toBe("10");
        expect(state.pieces[1].L).toBe("5");
    });

    it("spreads fields without clobbering unrelated keys", () => {
        setPieces([makePiece({ id: 1, L: "4", W: "3", H: "2" })]);
        updatePiece(1, { H: "8" });
        expect(state.pieces[0].L).toBe("4");
        expect(state.pieces[0].W).toBe("3");
        expect(state.pieces[0].H).toBe("8");
    });

    it("no-op for a non-existent id", () => {
        setPieces([makePiece({ id: 1, L: "4" })]);
        updatePiece(999, { L: "10" });
        expect(state.pieces[0].L).toBe("4");
    });
});


/* ── Bundled Rate Basis Round-Trip ── */

describe("bundled rate survives basis round-trip via the per-basis cache", () => {
    it("edited bundled rate is restored after switching basis and back", () => {
        setStudio({ basis: "volume", bundled: true });
        handleBundledRateInput(mockInputEvent("9"));
        const editedRate = state.firingRates.bundled;
        const toWeight = { currentTarget: { value: "weight" } } as unknown as Event;
        handleBasisChange(toWeight);
        expect(state.firingRates.bundled).toBeCloseTo(BASIS_META.weight.defaults.bundled);
        const backToVolume = { currentTarget: { value: "volume" } } as unknown as Event;
        handleBasisChange(backToVolume);
        expect(state.firingRates.bundled).toBeCloseTo(editedRate);
    });
});


/* ── addPiece and removePiece Handlers ── */

describe("addPiece and removePiece", () => {
    it("addPiece appends with current studio firings as the chip default", () => {
        setStudio({ firingToggles: { bisque: true, glaze: true, luster: false } });
        const before = state.pieces.length;
        addPiece();
        expect(state.pieces.length).toBe(before + 1);
        const last = state.pieces[state.pieces.length - 1];
        expect(last.firings).toEqual({ bisque: true, glaze: true, luster: false });
        expect(last.L).toBe("");
    });

    it("addPiece assigns unique ids", () => {
        addPiece(); addPiece(); addPiece();
        const ids = state.pieces.map((piece) => piece.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("removePiece removes by id", () => {
        setPieces([
            makePiece({ id: 1 }),
            makePiece({ id: 2 }),
            makePiece({ id: 3 }),
        ]);
        removePiece(2);
        expect(state.pieces.map((piece) => piece.id)).toEqual([1, 3]);
    });

    it("removePiece is a no-op on the last remaining piece (invariant: at least one piece)", () => {
        setPieces([makePiece({ id: 1 })]);
        removePiece(1);
        expect(state.pieces.length).toBe(1);
        expect(state.pieces[0].id).toBe(1);
    });
});
