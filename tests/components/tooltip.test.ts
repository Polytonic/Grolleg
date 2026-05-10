import { describe, it, expect } from "bun:test";
import m from "mithril";
import mq from "mithril-query";
import { Tooltip } from "../../source/components/tooltip";

type TooltipOutput = ReturnType<typeof mq> & { onremove: () => void };

const tooltipButton = (output: ReturnType<typeof mq>) =>
    output.rootEl.querySelector("button.tooltip-button") as HTMLElement;

const triggerWrapper = (output: ReturnType<typeof mq>) =>
    output.rootEl.querySelector(".tooltip-trigger") as HTMLElement;

const clickTooltipButton = (output: ReturnType<typeof mq>) => {
    tooltipButton(output).click();
    output.redraw();
};

const renderTooltip = (): TooltipOutput =>
    mq(Tooltip, { label: "Basis", text: "Info." }) as TooltipOutput;

const withBrowserGlobals = (run: (browser: { window: Window; document: Document }) => void) => {
    const environment = mq({ view: () => null }) as TooltipOutput;
    const testWindow = environment.rootEl.ownerDocument.defaultView;
    if (!testWindow) throw new Error("Missing test window");

    const hadWindow = "window" in globalThis;
    const hadDocument = "document" in globalThis;
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const previousRedraw = m.redraw;
    const redraw = (() => {}) as typeof m.redraw;
    redraw.sync = () => {};

    globalThis.window = testWindow as Window & typeof globalThis;
    globalThis.document = environment.rootEl.ownerDocument;
    m.redraw = redraw;

    try {
        run({ window: testWindow as Window, document: environment.rootEl.ownerDocument });
    } finally {
        m.redraw = previousRedraw;
        if (hadWindow) globalThis.window = previousWindow;
        else {
            // @ts-expect-error -- remove the stub so it does not leak to other tests
            delete globalThis.window;
        }
        if (hadDocument) globalThis.document = previousDocument;
        else {
            // @ts-expect-error -- remove the stub so it does not leak to other tests
            delete globalThis.document;
        }
        environment.onremove();
    }
};

const dispatchTriggerEvent = (
    output: ReturnType<typeof mq>,
    eventName: string,
    properties: Record<string, unknown>,
) => {
    const event = output.rootEl.ownerDocument.createEvent("Event");
    event.initEvent(eventName, true, true);
    Object.entries(properties).forEach(([name, value]) => {
        Object.defineProperty(event, name, { value });
    });
    triggerWrapper(output).dispatchEvent(event);
    output.redraw();
};

const createScrollEvent = (document: Document) => {
    const event = document.createEvent("Event");
    event.initEvent("scroll", true, true);
    return event;
};


// Default Render
describe("Tooltip default render", () => {
    it("renders the closed tooltip contract", () => {
        const output = mq(Tooltip, { label: "Basis", text: "How pieces are measured." });
        const button = tooltipButton(output);

        expect(output.should.have("span.tooltip"));
        expect(output.should.have("button.tooltip-button"));
        expect(output.should.contain("?"));
        expect(button.getAttribute("type")).toBe("button");
        expect(button.hasAttribute("aria-describedby")).toBe(false);
        expect(output.should.not.have("button.tooltip-button.open"));
    });
});


// Aria Attributes
describe("Tooltip aria attributes", () => {
    it("button aria-label references the tooltip label", () => {
        const output = mq(Tooltip, { label: "Rounding", text: "How to round." });
        expect(tooltipButton(output).getAttribute("aria-label")).toBe("More info about Rounding");
    });
});


// Click Interaction
describe("Tooltip click interaction", () => {
    it("clicking the trigger opens the tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        clickTooltipButton(output);
        expect(output.should.have("button.tooltip-button.open"));
    });

    it("clicking again closes the tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        clickTooltipButton(output);
        clickTooltipButton(output);
        expect(output.should.not.have("button.tooltip-button.open"));
    });

    it("open tooltip sets aria-describedby on the button", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        clickTooltipButton(output);
        const button = tooltipButton(output);
        expect(button.hasAttribute("aria-describedby")).toBe(true);
        const describedBy = button.getAttribute("aria-describedby")!;
        expect(describedBy.startsWith("tooltip-")).toBe(true);
        expect(Number.isInteger(Number(describedBy.slice("tooltip-".length)))).toBe(true);
    });
});


// Keyboard Interaction
describe("Tooltip keyboard interaction", () => {
    it("Escape closes an open tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        clickTooltipButton(output);
        expect(output.should.have("button.tooltip-button.open"));

        dispatchTriggerEvent(output, "keydown", { key: "Escape" });
        expect(output.should.not.have("button.tooltip-button.open"));
    });

    it("non-Escape keys do not close the tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        clickTooltipButton(output);

        dispatchTriggerEvent(output, "keydown", { key: "Tab" });
        expect(output.should.have("button.tooltip-button.open"));
    });
});


// Focus Interaction
describe("Tooltip focus interaction", () => {
    it("losing focus closes an open tooltip", () => {
        const output = mq(Tooltip, { label: "Basis", text: "Info." });
        clickTooltipButton(output);
        expect(output.should.have("button.tooltip-button.open"));

        dispatchTriggerEvent(output, "focusout", { relatedTarget: null });
        expect(output.should.not.have("button.tooltip-button.open"));
    });
});


// Scroll Interaction
describe("Tooltip scroll interaction", () => {
    it("scrolling the window closes an open tooltip", () => {
        withBrowserGlobals(({ window, document }) => {
            const output = renderTooltip();
            try {
                clickTooltipButton(output);
                expect(output.should.have("button.tooltip-button.open"));

                window.dispatchEvent(createScrollEvent(document));
                output.redraw();
                expect(output.should.not.have("button.tooltip-button.open"));
            } finally {
                output.onremove();
            }
        });
    });

    it("scrolling app content closes an open tooltip", () => {
        withBrowserGlobals(({ document }) => {
            const content = document.createElement("main");
            content.className = "app__content";
            document.body.appendChild(content);

            const output = renderTooltip();
            try {
                clickTooltipButton(output);
                expect(output.should.have("button.tooltip-button.open"));

                content.dispatchEvent(createScrollEvent(document));
                output.redraw();
                expect(output.should.not.have("button.tooltip-button.open"));
            } finally {
                output.onremove();
                content.remove();
            }
        });
    });
});
