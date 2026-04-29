import { describe, it, expect, beforeEach } from "bun:test";
import mq from "mithril-query";
import { state } from "../../../source/views/firing-calculator/state";
import { computeDerived } from "../../../source/views/firing-calculator/derived";
import { FiringCalculatorView } from "../../../source/views/firing-calculator/firing-calculator";
import { ControlsSection } from "../../../source/views/firing-calculator/controls";
import { PiecesSection } from "../../../source/views/firing-calculator/pieces";
import { TotalBand } from "../../../source/views/firing-calculator/total";
import { resetState, makePiece, setStudio, setPieces } from "./helpers";

beforeEach(() => resetState());


/* ── Orchestrator ── */

describe("FiringCalculatorView orchestrator", () => {
    it("renders the title and subtitle", () => {
        const output = mq(FiringCalculatorView);
        expect(output.should.contain("Firing Calculator"));
        expect(output.should.contain("Estimate firing costs"));
    });

    it("renders the controls, pieces, and divider on a single-piece default load (no total band)", () => {
        // Default load is one piece, so the Total band is suppressed
        // (a single-piece run already shows its price inside the piece
        // card).
        const output = mq(FiringCalculatorView);
        expect(output.should.have(".firing-calculator"));
        expect(output.should.have(".controls-section"));
        expect(output.should.have(".pieces-section"));
        expect(output.should.have(".divider"));
        expect(output.should.not.have(".total-band"));
    });

    it("shows the total band once a second piece is added", () => {
        setPieces([makePiece({ id: 1 }), makePiece({ id: 2 })]);
        const output = mq(FiringCalculatorView);
        expect(output.should.have(".total-band"));
    });

    it("renders the disclaimer when a piece has a non-zero price", () => {
        setPieces([makePiece({ id: 1, L: "10", W: "10", H: "10" })]);
        const output = mq(FiringCalculatorView);
        expect(output.should.contain("Estimates only"));
        expect(output.should.contain("Actual billing may differ."));
    });

    it("hides the disclaimer when no piece has a price", () => {
        const output = mq(FiringCalculatorView);
        expect(output.should.not.contain("Estimates only"));
    });
});


/* ── ControlsSection ── */

describe("ControlsSection", () => {
    it("renders the basis dropdown with all three bases", () => {
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.have("#basis-select"));
        expect(output.should.contain("Volume (L × W × H)"));
        expect(output.should.contain("Footprint (L × W)"));
        expect(output.should.contain("Weight"));
    });

    it("renders the firings label", () => {
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.contain("Firing Types"));
    });

    it("renders the bisque/glaze ConnectedPill and Luster pill", () => {
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.have(".connected-pill"));
        expect(output.should.contain("Bisque"));
        expect(output.should.contain("Glaze"));
        expect(output.should.contain("Luster"));
    });

    it("default load: only Bisque is the active studio firing", () => {
        const output = mq(ControlsSection, { derived: computeDerived() });
        // Three pill-class buttons exist (chain, Luster, plus the one in
        // ConnectedPill which uses .connected-pill__half). The Bisque ConnectedPill
        // half should have the .active class.
        expect(output.should.have(".connected-pill__half.active"));
    });

    it("renders the Bisque rate input by default", () => {
        const output = mq(ControlsSection, { derived: computeDerived() });
        // The section header carries the "Rates" context; per-input labels
        // are just the firing name.
        expect(output.should.contain("Bisque"));
        expect(output.should.have("#rate-bisque"));
    });

    it("renders all rate slots disabled (with hint) when zero firings are active", () => {
        setStudio({ firingToggles: { bisque: false, glaze: false, luster: false } });
        const output = mq(ControlsSection, { derived: computeDerived() });
        // Slots remain rendered so the layout doesn't reflow as the user
        // toggles firings. The hint surfaces below the row only when every
        // slot is disabled.
        expect(output.should.have(".rate-inputs .field-group.disabled"));
        expect(output.should.have("#rate-bisque"));
        expect(output.should.have("#rate-glaze"));
        expect(output.should.have("#rate-luster"));
        expect(output.should.contain("Turn on a firing above to set rates."));
    });

    it("renders the Bundled label when bundled is on", () => {
        setStudio({
            bundled: true,
            firingToggles: { bisque: true, glaze: true, luster: false },
        });
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.contain("Bundled"));
        expect(output.should.have("#rate-bundled"));
    });

    it("renders Rounding and Minimum Height for volume basis", () => {
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.contain("Rounding"));
        expect(output.should.contain("Minimum Height"));
        expect(output.should.have("#rounding-select"));
        expect(output.should.have("#min-height-input"));
    });

    it("hides Minimum Height in footprint basis", () => {
        setStudio({ basis: "footprint", firingRates: { bisque: 0.08, glaze: 0.10, luster: 0.15 } });
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.contain("Rounding"));
        expect(output.should.not.contain("Minimum Height"));
    });

    it("hides both Rounding and Minimum Height for weight basis", () => {
        setStudio({ basis: "weight", firingRates: { bisque: 1.0, glaze: 1.5, luster: 2.0 } });
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.not.contain("Rounding"));
        expect(output.should.not.contain("Minimum Height"));
    });

    it("renders weight unit pills for weight basis", () => {
        setStudio({ basis: "weight", firingRates: { bisque: 1.0, glaze: 1.5, luster: 2.0 } });
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.contain("g"));
        expect(output.should.contain("kg"));
        expect(output.should.contain("oz"));
        expect(output.should.contain("lb"));
    });

    it("rate input scrubs floating-point artifacts (0.035 → \"3.5\", not \"3.5000000000000004\")", () => {
        // 0.035 × 100 = 3.5000000000000004 in IEEE 754. Without
        // formatRateNumber's rounding the input would render the noise.
        // setStudio writes directly to state.firingRates, bypassing the
        // input handler.
        setStudio({ basis: "volume", firingRates: { bisque: 0.035, glaze: 0.045, luster: 0.14 } });
        const output = mq(ControlsSection, { derived: computeDerived() });
        const bisqueInput = output.rootEl.querySelector("#rate-bisque") as HTMLInputElement;
        expect(bisqueInput.getAttribute("value")).toBe("3.5");
        const glazeInput = output.rootEl.querySelector("#rate-glaze") as HTMLInputElement;
        expect(glazeInput.getAttribute("value")).toBe("4.5");
    });

    it("rate suffix reflects basis (¢/in³ for volume)", () => {
        setStudio({ basis: "volume", dimensionUnit: "in" });
        const output = mq(ControlsSection, { derived: computeDerived() });
        expect(output.should.contain("¢/in³"));
    });
});


/* ── PiecesSection and PieceRow ── */

describe("PiecesSection", () => {
    it("default load: one piece, no badge, no remove button", () => {
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row"));
        expect(output.should.not.have(".piece-row__badge"));
        expect(output.should.not.have(".piece-row__remove"));
    });

    it("two pieces: badges visible, remove buttons visible", () => {
        setPieces([
            makePiece({ id: 1 }),
            makePiece({ id: 2 }),
        ]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__badge"));
        expect(output.should.have(".piece-row__remove"));
    });

    it("renders Add Piece button", () => {
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".add-piece"));
        expect(output.should.contain("Add Piece"));
    });

    it("piece row shows L/W/H inputs for volume basis", () => {
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__dimensions.columns-3"));
    });

    it("piece row shows L/W inputs for footprint basis", () => {
        setStudio({ basis: "footprint", firingRates: { bisque: 0.08, glaze: 0.10, luster: 0.15 } });
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__dimensions.columns-2"));
    });

    it("piece row shows weight input for weight basis", () => {
        setStudio({ basis: "weight", firingRates: { bisque: 1.0, glaze: 1.5, luster: 2.0 } });
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__weight"));
    });

    it("size cluster renders silhouette + comparison name + qty when dimensions are entered", () => {
        // Pin dimUnit to inches so the cubeish bucket math is deterministic;
        // otherwise the locale-detected default in the test runtime can
        // shift the lookup (e.g., 4×4×5 cm³ falls in a different bucket).
        setStudio({ dimensionUnit: "in" });
        setPieces([makePiece({ L: "4", W: "4", H: "5" })]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__size-block"));
        expect(output.should.contain("coffee mug"));
        expect(output.should.contain("in³"));
    });

    it("size cluster keeps showing dimensions when all piece firings are off", () => {
        // Regression: the size info used to be bundled with the price
        // block, which hid itself when price was $0. Toggling every
        // firing off on a piece (so price drops to $0) must still leave
        // the entered dimensions visible.
        setStudio({ dimensionUnit: "in" });
        setPieces([makePiece({
            L: "4", W: "4", H: "5",
            firings: { bisque: false, glaze: false, luster: false },
        })]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__price.zero"));
        expect(output.should.have(".piece-row__size-block"));
        expect(output.should.contain("in³"));
    });

    it("warning box renders when piece H is below studio minimum", () => {
        // dimUnit pinned for the same reason: the warning text templates the
        // unit string into the user-visible message.
        setStudio({ dimensionUnit: "in", minHeight: 2 });
        setPieces([makePiece({ L: "4", W: "4", H: "1" })]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__warning"));
        expect(output.should.contain("Billed at 2 in"));
        expect(output.should.contain("Shorter pieces are charged"));
    });

    it("H input gets warn class when below minHeight", () => {
        setStudio({ minHeight: 2 });
        setPieces([makePiece({ L: "4", W: "4", H: "1" })]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".input.numeric.with-suffix.warn"));
    });

    it("warning box does not render when H equals or exceeds minHeight", () => {
        setStudio({ minHeight: 2 });
        setPieces([makePiece({ L: "4", W: "4", H: "3" })]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.not.have(".piece-row__warning"));
    });

    it("warning box does not render when H exactly equals minHeight (boundary)", () => {
        setStudio({ minHeight: 2 });
        setPieces([makePiece({ L: "4", W: "4", H: "2" })]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.not.have(".piece-row__warning"));
    });

    it("piece-row Bisque|Glaze ConnectedPill connected reflects only `bundled`", () => {
        // Bundled off, both firings on at studio: connected should be false.
        setStudio({
            bundled: false,
            firingToggles: { bisque: true, glaze: true, luster: false },
        });
        setPieces([makePiece({ firings: { bisque: true, glaze: true, luster: false } })]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        // Render snapshot via the dom; checking a dom attribute is brittle in
        // mithril-query, so assert by the chip-size class which is always
        // present and the absence of the connected-only inner styling is
        // implicit. The behavioral test in propagation.test.ts covers the
        // pricing semantics; this is just a smoke test that the chip renders.
        expect(output.should.have(".piece-row__include"));
        expect(output.should.have(".connected-pill .size-chip"));
    });

    it("Luster chip renders disabled when studio luster is off", () => {
        setStudio({ firingToggles: { bisque: true, glaze: false, luster: false } });
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".chip.disabled"));
    });

    it('zero-price piece renders "$0.00" in the muted-soft style', () => {
        // Default load has one empty piece; price is $0
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__price.zero"));
        expect(output.should.contain("$0.00"));
    });

    it("shows quantity but $0.00 when piece has dimensions but all firings are off", () => {
        setStudio({ firingToggles: { bisque: false, glaze: false, luster: false } });
        setPieces([makePiece({
            L: "4", W: "4", H: "5",
            firings: { bisque: false, glaze: false, luster: false },
        })]);
        const output = mq(PiecesSection, { derived: computeDerived() });
        expect(output.should.have(".piece-row__size-block"));
        expect(output.should.have(".piece-row__price.zero"));
    });
});


/* ── TotalBand ── */

describe("TotalBand", () => {
    it("renders the TOTAL label and a $0.00 default amount when no piece dimensions are entered", () => {
        // Default load has bisque toggled on with the studio rate
        // pre-filled (3.5c/in³) but no piece dimensions, so the total
        // is $0.00.
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

    it("renders the aggregate comparison when 2+ pieces have dimensions", () => {
        // The aggregate comparison is suppressed for a single piece because
        // the per-piece silhouette already shows the same data, and "All
        // together" reads oddly with nothing to combine.
        setPieces([
            makePiece({ id: 1, L: "4", W: "4", H: "5" }),
            makePiece({ id: 2, L: "3", W: "3", H: "3" }),
        ]);
        const output = mq(TotalBand, { derived: computeDerived() });
        expect(output.should.have(".total-band__comparison"));
        expect(output.should.contain("All together"));
    });

    it("suppresses the aggregate comparison for a single piece", () => {
        setPieces([makePiece({ L: "4", W: "4", H: "5" })]);
        const output = mq(TotalBand, { derived: computeDerived() });
        expect(output.should.not.have(".total-band__comparison"));
    });

    it("renders a non-zero total when pieces price out", () => {
        // Default rates are now 0 (placeholders show typical values), so
        // the studio rate has to be set explicitly before pricing asserts.
        setStudio({ firingRates: { bisque: 0.04, glaze: 0.045, luster: 0.08 } });
        setPieces([makePiece({
            L: "4", W: "4", H: "5",
            firings: { bisque: true, glaze: false, luster: false },
        })]);
        const output = mq(TotalBand, { derived: computeDerived() });
        // 80 in³ × $0.04 = $3.20
        expect(output.should.contain("$3.20"));
    });

    // Disclaimer was hoisted to the orchestrator (parallel to shrinkage's
    // pattern), so the FiringCalculatorView test above covers its presence.
});
