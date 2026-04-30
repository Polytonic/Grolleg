import { describe, it, expect, beforeAll, afterAll } from "bun:test";

let detectBase: (hostname: string, pathname: string) => string;

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

beforeAll(async () => {
    const noop = () => {};
    globalThis.window = {
        location: { hostname: "localhost", pathname: "/", search: "", hash: "" },
        addEventListener: noop,
        removeEventListener: noop,
        history: { pushState: noop, replaceState: noop },
    } as any;
    globalThis.document = { body: {}, title: "" } as any;
    const mod = await import("../source/index");
    detectBase = mod.detectBase;
});

afterAll(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
});

describe("detectBase", () => {
    it("GitHub Pages project site", () => {
        expect(detectBase("user.github.io", "/Grolleg/shrinkage")).toBe("/Grolleg");
    });

    it("GitHub Pages root", () => {
        expect(detectBase("user.github.io", "/")).toBe("");
    });

    it("local dev", () => {
        expect(detectBase("localhost", "/shrinkage")).toBe("");
    });

    it("custom domain", () => {
        expect(detectBase("grolleg.com", "/firing")).toBe("");
    });

    it("GitHub Pages with only repo segment", () => {
        expect(detectBase("user.github.io", "/Grolleg")).toBe("/Grolleg");
    });
});
