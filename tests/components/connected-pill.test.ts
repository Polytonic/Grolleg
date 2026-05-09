import { describe, it, expect } from "bun:test";
import mq from "mithril-query";
import { ConnectedPill } from "../../source/components/connected-pill";


// Default Render
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


// Active State
describe("ConnectedPill active state", () => {
    it("applies .active to the active half only (left active)", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: true, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            onToggleA: () => {}, onToggleB: () => {},
        });
        const halves = output.rootEl.querySelectorAll(".connected-pill__half");

        expect(halves.length).toBe(2);
        expect(halves[0].textContent).toBe("Bisque");
        expect(halves[0].classList.contains("active")).toBe(true);
        expect(halves[1].textContent).toBe("Glaze");
        expect(halves[1].classList.contains("active")).toBe(false);
    });

    it("applies .active to both halves when both active", () => {
        const output = mq(ConnectedPill, {
            connected: true,
            aActive: true, bActive: true,
            aLabel: "Bisque", bLabel: "Glaze",
            onToggleA: () => {}, onToggleB: () => {},
        });
        const activeStates = Array.from(output.rootEl.querySelectorAll(".connected-pill__half"))
            .map((half) => half.classList.contains("active"));

        expect(activeStates).toEqual([true, true]);
    });
});


// Disabled State
describe("ConnectedPill disabled state", () => {
    it("applies .disabled only to the disabled half", () => {
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            aDisabled: true,
            onToggleA: () => {}, onToggleB: () => {},
        });
        const halves = output.rootEl.querySelectorAll(".connected-pill__half");

        expect(halves.length).toBe(2);
        expect(halves[0].textContent).toBe("Bisque");
        expect(halves[0].classList.contains("disabled")).toBe(true);
        expect(halves[1].textContent).toBe("Glaze");
        expect(halves[1].classList.contains("disabled")).toBe(false);
    });

    it("does not invoke onToggle when half is disabled", () => {
        let aCalls = 0;
        let bCalls = 0;
        const output = mq(ConnectedPill, {
            connected: false,
            aActive: false, bActive: false,
            aLabel: "Bisque", bLabel: "Glaze",
            aDisabled: true,
            onToggleA: () => { aCalls += 1; },
            onToggleB: () => { bCalls += 1; },
        });
        // Only the enabled half should fire.
        const halves = output.rootEl.querySelectorAll(".connected-pill__half");
        (halves[0] as HTMLElement).click();
        (halves[1] as HTMLElement).click();
        expect(aCalls).toBe(0);
        expect(bCalls).toBe(1);
    });
});


// ARIA Attributes
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
