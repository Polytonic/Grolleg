import { describe, it, expect } from "bun:test";
import { detectBase } from "../source/routing";

describe("detectBase", () => {
    it("GitHub Pages project site", () => {
        expect(detectBase("user.github.io", "/Grolleg/t/shrinkage")).toBe("/Grolleg");
    });

    it("GitHub Pages root", () => {
        expect(detectBase("user.github.io", "/")).toBe("");
    });

    it("local dev", () => {
        expect(detectBase("localhost", "/t/shrinkage")).toBe("");
    });

    it("custom domain", () => {
        expect(detectBase("grolleg.com", "/t/firing")).toBe("");
    });

    it("GitHub Pages with only repo segment", () => {
        expect(detectBase("user.github.io", "/Grolleg")).toBe("/Grolleg");
    });

    it("empty pathname on GitHub Pages", () => {
        expect(detectBase("user.github.io", "")).toBe("");
    });

    it("trailing slash on GitHub Pages pathname", () => {
        expect(detectBase("user.github.io", "/Grolleg/")).toBe("/Grolleg");
    });

    it("non-github.io host ignores pathname", () => {
        expect(detectBase("localhost", "/Grolleg/t/shrinkage")).toBe("");
    });

    it("bare github.io without subdomain is not treated as GitHub Pages", () => {
        expect(detectBase("github.io", "/something")).toBe("");
    });
});
