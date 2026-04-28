import { describe, it, expect } from "bun:test";
import mq from "mithril-query";
import { InputWithSuffix } from "../../source/components/input-with-suffix";


/* ── Default Render ── */

describe("InputWithSuffix default render", () => {
    it("renders an input inside a .input-with-suffix wrapper", () => {
        const output = mq(InputWithSuffix, { suffix: "cm" });
        expect(output.should.have(".input-with-suffix"));
        expect(output.should.have("input.input.with-suffix"));
    });

    it("renders the suffix text in a span", () => {
        const output = mq(InputWithSuffix, { suffix: "%" });
        expect(output.should.have(".input-suffix"));
        expect(output.should.contain("%"));
    });

    it("passes through input attributes to the inner element", () => {
        const output = mq(InputWithSuffix, {
            suffix: "in",
            type: "number",
            id: "test-input",
            min: "0",
            placeholder: "\u2014",
        });
        const input = output.rootEl.querySelector("input")!;
        expect(input.getAttribute("type")).toBe("number");
        expect(input.getAttribute("id")).toBe("test-input");
        expect(input.getAttribute("min")).toBe("0");
    });
});


/* ── Modifiers ── */

describe("InputWithSuffix modifiers", () => {
    it("applies modifier classes to the input element", () => {
        const output = mq(InputWithSuffix, {
            suffix: "in",
            modifiers: ["numeric"],
        });
        expect(output.should.have("input.input.with-suffix.numeric"));
    });

    it("applies multiple modifiers", () => {
        const output = mq(InputWithSuffix, {
            suffix: "cm",
            modifiers: ["numeric", "warn"],
        });
        expect(output.should.have("input.input.with-suffix.numeric.warn"));
    });

    it("renders without modifier classes when modifiers is empty", () => {
        const output = mq(InputWithSuffix, {
            suffix: "cm",
            modifiers: [],
        });
        expect(output.should.have("input.input.with-suffix"));
        expect(output.should.not.have("input.numeric"));
    });
});


/* ── Screen Reader Suffix ── */

describe("InputWithSuffix suffixSr", () => {
    it("renders an sr-only span when suffixSr is provided", () => {
        const output = mq(InputWithSuffix, {
            suffix: "in",
            suffixSr: "inches",
        });
        expect(output.should.have(".sr-only"));
        expect(output.should.contain("inches"));
    });

    it("links the input to the sr-only span via aria-describedby", () => {
        const output = mq(InputWithSuffix, {
            suffix: "in",
            suffixSr: "inches",
        });
        const input = output.rootEl.querySelector("input")!;
        const srSpan = output.rootEl.querySelector(".sr-only")!;
        const describedById = input.getAttribute("aria-describedby");
        expect(describedById).toBeTruthy();
        expect(srSpan.getAttribute("id")).toBe(describedById);
    });

    it("does not render an sr-only span when suffixSr is absent", () => {
        const output = mq(InputWithSuffix, { suffix: "cm" });
        expect(output.should.not.have(".sr-only"));
    });
});
