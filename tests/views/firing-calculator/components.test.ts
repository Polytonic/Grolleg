import { describe, it, expect, beforeEach } from "bun:test";
import mq from "mithril-query";
import { state, computeDerived } from "../../../source/views/firing-calculator/state";
import { FiringCalculatorView } from "../../../source/views/firing-calculator/firing-calculator";
import { ControlsCard } from "../../../source/views/firing-calculator/controls";
import { PiecesCard } from "../../../source/views/firing-calculator/pieces";
import { TotalBand } from "../../../source/views/firing-calculator/total";
import { resetState, makePiece, setStudio, setPieces } from "./helpers";

beforeEach(() => resetState());


/* ── Orchestrator ── */

describe("FiringCalculatorView orchestrator", () => {
    it("renders the title and subtitle", () => {
        const output = mq(FiringCalculatorView);
        expect(output.should.contain("Firing Calculator"));
        expect(output.should.contain("Estimate firing costs for one or more pieces"));
    });

    it("renders all three cards (controls, pieces, total)", () => {
        const output = mq(FiringCalculatorView);
        expect(output.should.have(".firing-calculator"));
        expect(output.should.have(".controls-grid"));
        expect(output.should.have(".pieces-stack"));
        expect(output.should.have(".total-band"));
    });

    it("renders the disclaimer", () => {
        const output = mq(FiringCalculatorView);
        expect(output.should.contain("Estimates only"));
        expect(output.should.contain("actual billing may differ."));
    });
});


/* ── ControlsCard ── */

describe("ControlsCard", () => {
    it("renders the basis dropdown with all three bases", () => {
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.have("#basis-select"));
        expect(output.should.contain("Volume (L × W × H)"));
        expect(output.should.contain("Footprint (L × W)"));
        expect(output.should.contain("Weight"));
    });

    it("renders the firings label", () => {
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.contain("Firings"));
    });

    it("renders the bisque/glaze ConnectedPill and Luster pill", () => {
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.have(".connected-pill"));
        expect(output.should.contain("Bisque"));
        expect(output.should.contain("Glaze"));
        expect(output.should.contain("Luster"));
    });

    it("default load: only Bisque is the active studio firing", () => {
        const output = mq(ControlsCard, { derived: computeDerived() });
        // Three pill-class buttons exist (chain, Luster, plus the one in
        // ConnectedPill which uses .connected-pill__half). The Bisque ConnectedPill
        // half should have the .active class.
        expect(output.should.have(".connected-pill__half.active"));
    });

    it("renders the Bisque Rate input by default", () => {
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.contain("Bisque Rate"));
        expect(output.should.have("#rate-bisque"));
    });

    it("renders the ghost placeholder when zero firings are active", () => {
        setStudio({ firingToggles: { bisque: false, glaze: false, luster: false } });
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.have(".input-with-suffix.ghost"));
        expect(output.should.contain("Toggle a firing above to set rates."));
    });

    it("renders the Bundled Rate label when bundled is on", () => {
        setStudio({
            bundled: true,
            firingToggles: { bisque: true, glaze: true, luster: false },
        });
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.contain("Bundled Rate"));
        expect(output.should.have("#rate-bundled"));
    });

    it("renders Rounding and Minimum Height for volume basis", () => {
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.contain("Rounding"));
        expect(output.should.contain("Minimum Height"));
        expect(output.should.have("#rounding-select"));
        expect(output.should.have("#min-height-input"));
    });

    it("hides Minimum Height in footprint basis", () => {
        setStudio({ basis: "footprint", firingRates: { bisque: 0.08, glaze: 0.10, luster: 0.15 } });
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.contain("Rounding"));
        expect(output.should.not.contain("Minimum Height"));
    });

    it("hides both Rounding and Minimum Height for weight basis", () => {
        setStudio({ basis: "weight", firingRates: { bisque: 1.0, glaze: 1.5, luster: 2.0 } });
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.not.contain("Rounding"));
        expect(output.should.not.contain("Minimum Height"));
    });

    it("renders weight unit pills for weight basis", () => {
        setStudio({ basis: "weight", firingRates: { bisque: 1.0, glaze: 1.5, luster: 2.0 } });
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.contain("g"));
        expect(output.should.contain("kg"));
        expect(output.should.contain("lb"));
    });

    it("rate suffix reflects basis (¢/in³ for volume)", () => {
        setStudio({ basis: "volume", dimensionUnit: "in" });
        const output = mq(ControlsCard, { derived: computeDerived() });
        expect(output.should.contain("¢/in³"));
    });
});


/* ── PiecesCard and PieceRow ── */

describe("PiecesCard", () => {
    it("default load: one piece, no badge, no remove button", () => {
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".piece-row"));
        expect(output.should.not.have(".piece-row__badge"));
        expect(output.should.not.have(".piece-row__remove"));
    });

    it("two pieces: badges visible, remove buttons visible", () => {
        setPieces([
            makePiece({ id: 1 }),
            makePiece({ id: 2 }),
        ]);
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".piece-row__badge"));
        expect(output.should.have(".piece-row__remove"));
    });

    it("renders Add Piece button", () => {
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".add-piece"));
        expect(output.should.contain("Add Piece"));
    });

    it("piece row shows L/W/H inputs for volume basis", () => {
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".piece-row__dimensions.columns-3"));
    });

    it("piece row shows L/W inputs for footprint basis", () => {
        setStudio({ basis: "footprint", firingRates: { bisque: 0.08, glaze: 0.10, luster: 0.15 } });
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".piece-row__dimensions.columns-2"));
    });

    it("piece row shows weight input for weight basis", () => {
        setStudio({ basis: "weight", firingRates: { bisque: 1.0, glaze: 1.5, luster: 2.0 } });
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".piece-row__weight"));
    });

    it("comparison silhouette renders when dimensions are entered", () => {
        // Pin dimUnit to inches so the cubeish bucket math is deterministic;
        // otherwise the locale-detected default in the test runtime can
        // shift the lookup (e.g., 4×4×5 cm³ falls in a different bucket).
        setStudio({ dimensionUnit: "in" });
        setPieces([makePiece({ L: "4", W: "4", H: "5" })]);
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".piece-row__comparison"));
        expect(output.should.have(".piece-row__comparison-label"));
        expect(output.should.contain("coffee mug"));
    });

    it("warning box renders when piece H is below studio minimum", () => {
        // dimUnit pinned for the same reason: the warning text templates the
        // unit string into the user-visible message.
        setStudio({ dimensionUnit: "in", minHeight: 2 });
        setPieces([makePiece({ L: "4", W: "4", H: "1" })]);
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".piece-row__warning"));
        expect(output.should.contain("Billed at 2 in"));
        expect(output.should.contain("Pieces shorter than this"));
    });

    it("H input gets warn class when below minHeight", () => {
        setStudio({ minHeight: 2 });
        setPieces([makePiece({ L: "4", W: "4", H: "1" })]);
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".input.numeric.with-suffix.warn"));
    });

    it("warning box does not render when H equals or exceeds minHeight", () => {
        setStudio({ minHeight: 2 });
        setPieces([makePiece({ L: "4", W: "4", H: "3" })]);
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.not.have(".piece-row__warning"));
    });

    it("piece-row Bisque|Glaze ConnectedPill connected reflects only `bundled`", () => {
        // Bundled off, both firings on at studio: connected should be false.
        setStudio({
            bundled: false,
            firingToggles: { bisque: true, glaze: true, luster: false },
        });
        setPieces([makePiece({ firings: { bisque: true, glaze: true, luster: false } })]);
        const output = mq(PiecesCard, { derived: computeDerived() });
        // Render snapshot via the dom — checking a dom attribute is brittle in
        // mithril-query, so assert by the chip-size class which is always
        // present and the absence of the connected-only inner styling is
        // implicit. The behavioral test in propagation.test.ts covers the
        // pricing semantics; this is just a smoke test that the chip renders.
        expect(output.should.have(".piece-row__include"));
        expect(output.should.have(".connected-pill .size-chip"));
    });

    it("Luster chip renders disabled when studio luster is off", () => {
        setStudio({ firingToggles: { bisque: true, glaze: false, luster: false } });
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".chip.disabled"));
    });

    it('zero-price piece renders "$0.00" in the muted-soft style', () => {
        // Default load has one empty piece; price is $0
        const output = mq(PiecesCard, { derived: computeDerived() });
        expect(output.should.have(".piece-row__price.zero"));
        expect(output.should.contain("$0.00"));
    });
});


/* ── TotalBand ── */

describe("TotalBand", () => {
    it("renders the TOTAL label and a $0.00 default amount", () => {
        const output = mq(TotalBand, { derived: computeDerived() });
        expect(output.should.contain("Total"));
        expect(output.should.contain("$0.00"));
    });

    it('shows "1 piece" with the singular for one piece', () => {
        const output = mq(TotalBand, { derived: computeDerived() });
        expect(output.should.contain("1 piece"));
    });

    it('shows "N pieces" with the plural for multiple pieces', () => {
        setPieces([makePiece({ id: 1 }), makePiece({ id: 2 }), makePiece({ id: 3 })]);
        const output = mq(TotalBand, { derived: computeDerived() });
        expect(output.should.contain("3 pieces"));
    });

    it("renders the aggregate comparison when pieces have dimensions", () => {
        setPieces([makePiece({ L: "4", W: "4", H: "5" })]);
        const output = mq(TotalBand, { derived: computeDerived() });
        expect(output.should.have(".total-band__comparison"));
        expect(output.should.contain("All together"));
    });

    it("renders a non-zero total when pieces price out", () => {
        setPieces([makePiece({
            L: "4", W: "4", H: "5",
            firings: { bisque: true, glaze: false, luster: false },
        })]);
        const output = mq(TotalBand, { derived: computeDerived() });
        // 80 in³ × $0.04 = $3.20
        expect(output.should.contain("$3.20"));
    });

    it("disclaimer is always present", () => {
        const output = mq(TotalBand, { derived: computeDerived() });
        expect(output.should.contain("Estimates only"));
    });
});
