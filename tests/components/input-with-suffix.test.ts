import { describe, it, expect } from "bun:test";
import mq from "mithril-query";
import { InputWithSuffix } from "../../source/components/input-with-suffix";


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

// Auto-Warn
describe("InputWithSuffix auto-warn", () => {
    // Invalid decimal text warns unless the caller supplies an explicit state.

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
        const input = output.rootEl.querySelector("input")!;

        expect(input.classList.contains("error")).toBe(true);
        expect(input.classList.contains("warn")).toBe(false);
        expect(input.getAttribute("aria-invalid")).toBeNull();
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
        expect(input.getAttribute("aria-describedby")).toBe(srSpan.getAttribute("id"));
    });

    it("does not render an sr-only span when suffixSr is absent", () => {
        const output = mq(InputWithSuffix, { suffix: "cm" });
        expect(output.should.not.have(".sr-only"));
    });
});
