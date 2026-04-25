import m from "mithril";
import "@css/views/shrinkage-calculator.css";
import { state, computeDerived, handleStageToggle } from "./state";
import type { Derived } from "./state";
import { ClayBodyField, ShrinkageField } from "./clay-selection";
import { StageInputs, StagesCard } from "./shrinkage-stages";
import { ClayControls } from "./controls";
import { ResultsCard } from "./results";


export const ShrinkageCalculatorView: m.Component = {
    oncreate: () => {
        if (typeof document !== "undefined") {
            document.title = "Grolleg • Shrinkage Calculator";
        }
    },
    view: () => {
        const derived = computeDerived();
        return m(".shrinkage-calculator",
            m(".container",
                m("h1.title", "Shrinkage Calculator"),
                m("p.subtitle",
                    "Convert between wet and fired dimensions based on your clay's shrinkage rate."),
                m(".controls-row",
                    m(ClayBodyField),
                    m(ShrinkageField, { derived }),
                ),
                m(`label.option-toggle${state.showStages ? ".collapsed" : ""}`,
                    m("input.checkbox", {
                        type: "checkbox",
                        checked: state.showStages,
                        onchange: handleStageToggle,
                    }),
                    m("span", "Show shrinkage rate by stage"),
                ),
                state.showStages && m(StageInputs, { derived }),
                m(ClayControls, { derived }),
                m(".divider", { role: "separator" }),
                !derived.anyResults && m(".hint-box",
                    { role: "status", "aria-live": "polite" },
                    hintMessage(derived),
                ),
                derived.anyResults && m(ResultsCard, { derived }),
                derived.showStagesCard && m(StagesCard, { derived }),
                derived.anyResults && m("p.disclaimer",
                    "Actual shrinkage depends on your specific clay, firing temperature, and kiln conditions."),
            ),
        );
    },
};

const hintMessage = (derived: Derived): string => {
    if (derived.totalValid) return "Enter dimensions to see results";
    if (derived.anyDimensionsEntered) return "Enter a shrinkage rate to see results";
    return "Enter a shrinkage rate and dimensions to see results";
};
