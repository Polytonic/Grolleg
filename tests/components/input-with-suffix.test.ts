import { describe, it, expect } from "bun:test";
import mq from "mithril-query";
import { InputWithSuffix } from "../../source/components/input-with-suffix";
import { parseLocaleNumber } from "../../source/components/locale";


// Default Render
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


// Modifiers
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


// Auto-Warn: inputmode="decimal" with non-finite parse result
describe("InputWithSuffix auto-warn", () => {
    // The component adds .warn + aria-invalid when inputmode="decimal",
    // value is non-empty, and parseLocaleNumber(value) returns non-finite.

    it("non-numeric string triggers warn class and aria-invalid", () => {
        const output = mq(InputWithSuffix, {
            suffix: "%",
            inputmode: "decimal",
            value: "abc",
        });
        const input = output.rootEl.querySelector("input")!;
        expect(output.should.have("input.warn"));
        expect(input.getAttribute("aria-invalid")).toBe("true");
    });

    it("trailing non-numeric text triggers warn class and aria-invalid", () => {
        const output = mq(InputWithSuffix, {
            suffix: "cm",
            inputmode: "decimal",
            value: "12.5cm",
        });
        const input = output.rootEl.querySelector("input")!;
        expect(output.should.have("input.warn"));
        expect(input.getAttribute("aria-invalid")).toBe("true");
    });

    it("empty string does not trigger warn", () => {
        const output = mq(InputWithSuffix, {
            suffix: "%",
            inputmode: "decimal",
            value: "",
        });
        expect(output.should.not.have("input.warn"));
        const input = output.rootEl.querySelector("input")!;
        expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("valid number string does not trigger warn", () => {
        const output = mq(InputWithSuffix, {
            suffix: "%",
            inputmode: "decimal",
            value: "12.5",
        });
        expect(output.should.not.have("input.warn"));
        const input = output.rootEl.querySelector("input")!;
        expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("caller-supplied error modifier suppresses auto-warn", () => {
        const output = mq(InputWithSuffix, {
            suffix: "%",
            inputmode: "decimal",
            value: "abc",
            modifiers: ["error"] as readonly ("numeric" | "warn" | "error")[],
        });
        // The explicit modifier must appear, but auto-warn should not add a second .warn
        expect(output.should.have("input.error"));
        const input = output.rootEl.querySelector("input")!;
        // aria-invalid is not set by auto-warn when an explicit state modifier is present
        expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("parseLocaleNumber('abc') returns NaN (condition unit test)", () => {
        expect(Number.isFinite(parseLocaleNumber("abc"))).toBe(false);
    });

    it("parseLocaleNumber('') returns NaN (condition unit test)", () => {
        expect(Number.isFinite(parseLocaleNumber(""))).toBe(false);
    });

    it("parseLocaleNumber('12.5') returns finite (condition unit test)", () => {
        expect(Number.isFinite(parseLocaleNumber("12.5"))).toBe(true);
    });

    it("parseLocaleNumber('12abc') returns NaN (condition unit test)", () => {
        expect(Number.isFinite(parseLocaleNumber("12abc"))).toBe(false);
    });
});


// Screen Reader Suffix
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
