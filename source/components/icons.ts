import m from "mithril";


/* ── Icon Factory ──
   Builds stroke-style icon functions from SVG path data. All icons share
   the same 24x24 viewBox and stroke attributes; only the paths differ. */

const icon = (...paths: string[]) =>
    (size: number): m.Vnode =>
        m("svg", {
            width: size, height: size, viewBox: "0 0 24 24",
            fill: "none", stroke: "currentColor", "stroke-width": 2,
            "stroke-linecap": "round", "stroke-linejoin": "round",
            "aria-hidden": "true",
        }, ...paths.map((d) => m("path", { d })));

export const xIcon = icon("M18 6 6 18", "m6 6 12 12");
export const plusIcon = icon("M5 12h14", "M12 5v14");
export const chainLinkIcon = icon(
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
);
