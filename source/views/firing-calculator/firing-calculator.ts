import m from "mithril";
import "@css/views/firing-calculator.css";
import { computeDerived } from "./state";
import { ControlsCard } from "./controls";
import { PiecesCard } from "./pieces";
import { TotalBand } from "./total";


// The orchestrator. Sets the per-tool document.title once on mount, then
// composes the three cards plus the total band. computeDerived is called
// once per render and threaded through to children so derived data stays
// consistent within a single draw cycle.
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
                m("p.subtitle",
                    "Estimate firing costs for one or more pieces."),
                m(ControlsCard, { derived }),
                m(PiecesCard, { derived }),
                m(TotalBand, { derived }),
            ),
        );
    },
};
