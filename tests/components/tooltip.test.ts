import { describe, it, expect } from "bun:test";
import mq from "mithril-query";
import { Tooltip } from "../../source/components/tooltip";


/* ── Default Render ── */

describe("Tooltip default render", () => {
    it("wraps content in a span.tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "How pieces are measured." });
        expect(output.should.have("span.tooltip"));
    });

    it("renders a '?' button", () => {
        const output = mq(Tooltip, { label: "Basis", text: "How pieces are measured." });
        expect(output.should.have("button.tooltip-button"));
        expect(output.should.contain("?"));
    });

    it("button has type='button'", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        const button = output.rootEl.querySelector("button.tooltip-button")!;
        expect(button.getAttribute("type")).toBe("button");
    });

    it("starts closed (no .open class)", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        expect(output.should.not.have("button.tooltip-button.open"));
    });
});


/* ── Aria Attributes ── */

describe("Tooltip aria attributes", () => {
    it("button aria-label references the tooltip label", () => {
        const output = mq(Tooltip, { label: "Rounding", text: "How to round." });
        const button = output.rootEl.querySelector("button.tooltip-button")!;
        expect(button.getAttribute("aria-label")).toBe("More info about Rounding");
    });

    it("no aria-describedby when closed", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Description." });
        const button = output.rootEl.querySelector("button.tooltip-button")!;
        expect(button.hasAttribute("aria-describedby")).toBe(false);
    });
});


/* ── Click Interaction ── */

describe("Tooltip click interaction", () => {
    it("clicking the trigger opens the tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        const trigger = output.rootEl.querySelector("button.tooltip-button")!.parentElement!;
        trigger.click();
        output.redraw();
        expect(output.should.have("button.tooltip-button.open"));
    });

    it("clicking again closes the tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        const trigger = output.rootEl.querySelector("button.tooltip-button")!.parentElement!;
        trigger.click();
        output.redraw();
        trigger.click();
        output.redraw();
        expect(output.should.not.have("button.tooltip-button.open"));
    });

    it("open tooltip sets aria-describedby on the button", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        const trigger = output.rootEl.querySelector("button.tooltip-button")!.parentElement!;
        trigger.click();
        output.redraw();
        const button = output.rootEl.querySelector("button.tooltip-button")!;
        expect(button.hasAttribute("aria-describedby")).toBe(true);
        expect(button.getAttribute("aria-describedby")).toMatch(/^tooltip-\d+$/);
    });
});


/* ── Keyboard Interaction ── */

describe("Tooltip keyboard interaction", () => {
    it("Escape closes an open tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        const trigger = output.rootEl.querySelector("button.tooltip-button")!.parentElement!;
        trigger.click();
        output.redraw();
        expect(output.should.have("button.tooltip-button.open"));

        output.trigger("span.tooltip > span", "keydown", { key: "Escape" });
        expect(output.should.not.have("button.tooltip-button.open"));
    });

    it("non-Escape keys do not close the tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        const trigger = output.rootEl.querySelector("button.tooltip-button")!.parentElement!;
        trigger.click();
        output.redraw();

        output.trigger("span.tooltip > span", "keydown", { key: "Tab" });
        expect(output.should.have("button.tooltip-button.open"));
    });
});


/* ── Focus Interaction ── */

describe("Tooltip focus interaction", () => {
    it("losing focus closes an open tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        const trigger = output.rootEl.querySelector("button.tooltip-button")!.parentElement!;
        trigger.click();
        output.redraw();
        expect(output.should.have("button.tooltip-button.open"));

        output.trigger("span.tooltip > span", "focusout", { relatedTarget: null });
        expect(output.should.not.have("button.tooltip-button.open"));
    });
});
