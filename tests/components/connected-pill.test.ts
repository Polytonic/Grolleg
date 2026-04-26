import { describe, it, expect } from "bun:test";
import mq from "mithril-query";
import { ConnectedPill } from "../../source/components/connected-pill";


/* ── Default Render ── */

describe("ConnectedPill default render", () => {
    it("renders two button halves with the given labels", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            onToggleA: () => {}, onToggleB: () => {},
        });
        expect(output.should.contain("Bisque"));
        expect(output.should.contain("Glaze"));
        expect(output.should.have(".connected-pill"));
        expect(output.should.have(".connected-pill__half"));
    });
});


/* ── Active State ── */

describe("ConnectedPill active state", () => {
    it("applies .active to the active half only (left active)", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: true, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            onToggleA: () => {}, onToggleB: () => {},
        });
        // Exactly one half has .active.
        expect(output.should.have(".connected-pill__half.active"));
    });

    it("applies .active to both halves when both active", () => {
        const output = mq(ConnectedPill, {
            connected: true,
            aActive: true, bActive: true,
            aLabel: "Bisque", bLabel: "Glaze",
            onToggleA: () => {}, onToggleB: () => {},
        });
        // Two halves with .active.
        const html = output.rootEl.outerHTML;
        const matches = html.match(/connected-pill__half[^"]*active/g) ?? [];
        expect(matches.length).toBe(2);
    });
});


/* ── Disabled State ── */

describe("ConnectedPill disabled state", () => {
    it("applies .disabled to a half when disabled prop is true", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            aDisabled: true,
            onToggleA: () => {}, onToggleB: () => {},
        });
        expect(output.should.have(".connected-pill__half.disabled"));
    });

    it("does not invoke onToggle when half is disabled", () => {
        let aCalls = 0, bCalls = 0;
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            aDisabled: true,
            onToggleA: () => { aCalls += 1; },
            onToggleB: () => { bCalls += 1; },
        });
        // Click both halves; only the enabled one should fire.
        const halves = output.rootEl.querySelectorAll(".connected-pill__half");
        (halves[0] as HTMLElement).click();
        (halves[1] as HTMLElement).click();
        expect(aCalls).toBe(0);
        expect(bCalls).toBe(1);
    });
});


/* ── Aria ── */

describe("ConnectedPill aria attributes", () => {
    it("sets aria-pressed reflecting active prop on each half", () => {
        const output = mq(ConnectedPill, {
            connected: true,
            aActive: true, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            onToggleA: () => {}, onToggleB: () => {},
        });
        const halves = output.rootEl.querySelectorAll(".connected-pill__half");
        expect(halves[0].getAttribute("aria-pressed")).toBe("true");
        expect(halves[1].getAttribute("aria-pressed")).toBe("false");
    });

    it("sets aria-disabled when disabled prop is true", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            bDisabled: true,
            onToggleA: () => {}, onToggleB: () => {},
        });
        const halves = output.rootEl.querySelectorAll(".connected-pill__half");
        expect(halves[1].getAttribute("aria-disabled")).toBe("true");
    });

    it("custom aria-labels override the visible label for screen readers", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            aAriaLabel: "Bisque firing for piece 1",
            onToggleA: () => {}, onToggleB: () => {},
        });
        const halves = output.rootEl.querySelectorAll(".connected-pill__half");
        expect(halves[0].getAttribute("aria-label")).toBe("Bisque firing for piece 1");
    });
});


/* ── Size Variants ── */

describe("ConnectedPill size variants", () => {
    it("applies .size-pill by default", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            aLabel: "A", bLabel: "B",
            onToggleA: () => {}, onToggleB: () => {},
        });
        expect(output.should.have(".connected-pill__half.size-pill"));
    });

    it("applies .size-chip when size='chip'", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            size: "chip",
            aLabel: "A", bLabel: "B",
            onToggleA: () => {}, onToggleB: () => {},
        });
        expect(output.should.have(".connected-pill__half.size-chip"));
    });
});
