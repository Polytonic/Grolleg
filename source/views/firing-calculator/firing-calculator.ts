import m from "mithril";
import "@css/views/firing-calculator.css";
import { computeDerived } from "./state";
import { ControlsSection } from "./controls";
import { PiecesSection } from "./pieces";
import { TotalBand } from "./total";


// Composes the input sections, divider, total band, and disclaimer.
// computeDerived runs once per render and threads through to children so
// derived data stays consistent within a single draw cycle.
export const FiringCalculatorView: m.Component = {
    oncreate: () => {
        if (typeof document !== "undefined") {
            document.title = "Grolleg • Firing Calculator";
        }
    },
    view: () => {
        const derived = computeDerived();
        return m(".firing-calculator",
            m(".container",
                m("h1.title", "Firing Calculator"),
                m("p.subtitle", "Estimate firing costs for one or more pieces."),
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
