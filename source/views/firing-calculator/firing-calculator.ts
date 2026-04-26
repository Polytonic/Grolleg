import m from "mithril";
import "@css/views/firing-calculator.css";
import { computeDerived } from "./state";
import { ControlsSection } from "./controls";
import { PiecesSection } from "./pieces";
import { TotalBand } from "./total";


// Composes the input sections, divider, total band, and disclaimer.
// computeDerived runs once per render and threads through to children so
// derived data stays consistent within a single draw cycle. The
// document.title for this route is set by the route resolver in
// `index.ts`, not in this component, so back/forward navigation across
// tools updates the title every time.
export const FiringCalculatorView: m.Component = {
    view: () => {
        const derived = computeDerived();
        return m(".firing-calculator",
            m(".container",
                m("h1.title", "Firing Calculator"),
                m("p.subtitle", "Estimate firing costs."),
                m(ControlsSection, { derived }),
                m(".divider", { role: "separator" }),
                m(PiecesSection, { derived }),
                m(".divider", { role: "separator" }),
                m(TotalBand, { derived }),
                m("p.disclaimer", "Estimates only. Actual billing may differ."),
            ),
        );
    },
};
