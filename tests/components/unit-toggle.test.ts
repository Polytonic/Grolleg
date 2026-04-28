import { describe, it, expect } from "bun:test";
import mq from "mithril-query";
import { UnitToggle } from "../../source/components/unit-toggle";


/* ── Default Render ── */

describe("UnitToggle default render", () => {
    it("renders all unit buttons inside a .unit-text-toggle wrapper", () => {
        const output = mq(UnitToggle, {
            units: ["mm", "cm", "in"],
            active: "cm",
            onSelect: () => {},
        });
        expect(output.should.have(".unit-text-toggle"));
        expect(output.should.contain("mm"));
        expect(output.should.contain("cm"));
        expect(output.should.contain("in"));
    });

    it("renders separator spans between units", () => {
        const output = mq(UnitToggle, {
            units: ["mm", "cm", "in"],
            active: "cm",
            onSelect: () => {},
        });
        const separators = output.rootEl.querySelectorAll(".unit-separator");
        expect(separators.length).toBe(2);
    });

    it("renders no separator for a single unit", () => {
        const output = mq(UnitToggle, {
            units: ["cm"],
            active: "cm",
            onSelect: () => {},
        });
        expect(output.should.not.have(".unit-separator"));
    });
});


/* ── Active State ── */

describe("UnitToggle active state", () => {
    it("applies .active to the currently selected unit", () => {
        const output = mq(UnitToggle, {
            units: ["mm", "cm", "in"],
            active: "in",
            onSelect: () => {},
        });
        expect(output.should.have("button.unit-text.active"));
    });

    it("sets aria-pressed='true' on the active unit", () => {
        const output = mq(UnitToggle, {
            units: ["mm", "cm", "in"],
            active: "cm",
            onSelect: () => {},
        });
        const buttons = output.rootEl.querySelectorAll("button.unit-text");
        const cmButton = Array.from(buttons).find((button) =>
            button.textContent === "cm")!;
        expect(cmButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("sets aria-pressed='false' on inactive units", () => {
        const output = mq(UnitToggle, {
            units: ["mm", "cm", "in"],
            active: "cm",
            onSelect: () => {},
        });
        const buttons = output.rootEl.querySelectorAll("button.unit-text");
        const mmButton = Array.from(buttons).find((button) =>
            button.textContent === "mm")!;
        expect(mmButton.getAttribute("aria-pressed")).toBe("false");
    });
});


/* ── Interaction ── */

describe("UnitToggle interaction", () => {
    it("calls onSelect with the clicked unit", () => {
        let selected = "";
        const output = mq(UnitToggle, {
            units: ["mm", "cm", "in"],
            active: "cm",
            onSelect: (unit: string) => { selected = unit; },
        });
        const buttons = output.rootEl.querySelectorAll("button.unit-text");
        const inButton = Array.from(buttons).find((button) =>
            button.textContent === "in") as HTMLElement;
        inButton.click();
        expect(selected).toBe("in");
    });
});


/* ── ARIA Labels ── */

describe("UnitToggle ARIA labels", () => {
    it("applies custom aria-labels when provided", () => {
        const output = mq(UnitToggle, {
            units: ["mm", "cm", "in"],
            active: "cm",
            onSelect: () => {},
            ariaLabels: { mm: "millimeters", cm: "centimeters", in: "inches" },
        });
        const buttons = output.rootEl.querySelectorAll("button.unit-text");
        const cmButton = Array.from(buttons).find((button) =>
            button.textContent === "cm")!;
        expect(cmButton.getAttribute("aria-label")).toBe("centimeters");
    });

    it("falls back to the unit string when ariaLabels is absent", () => {
        const output = mq(UnitToggle, {
            units: ["cm"],
            active: "cm",
            onSelect: () => {},
        });
        const button = output.rootEl.querySelector("button.unit-text")!;
        expect(button.getAttribute("aria-label")).toBe("cm");
    });
});
