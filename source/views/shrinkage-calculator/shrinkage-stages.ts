import m from "mithril";
import { state, format, handleGreenwareInput, handleBisqueInput } from "./state";
import type { Stage, Derived } from "./state";


// Greenware, bisque, and derived firing percentage inputs with stage hints
export const StageInputs: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".stage-inputs",
        m(".stage-field",
            m("label.label", { for: "greenware-percent" }, "Greenware"),
            m(".dimension-input-wrap",
                m("input.input.with-suffix", {
                    id: "greenware-percent",
                    type: "number",
                    inputmode: "decimal",
                    step: "0.1",
                    min: "0",
                    placeholder: "e.g. 6",
                    value: state.greenwareShrinkage,
                    oninput: handleGreenwareInput,
                }),
                m("span.dimension-unit", "%"),
            ),
            m("span.stage-hint", "Wet → Bone Dry"),
        ),
        m(".stage-field",
            m("label.label", { for: "bisque-percent" }, "Bisque"),
            m(".dimension-input-wrap",
                m("input.input.with-suffix", {
                    id: "bisque-percent",
                    type: "number",
                    inputmode: "decimal",
                    step: "0.1",
                    min: "0",
                    placeholder: "e.g. 0.75",
                    value: state.bisqueShrinkage,
                    oninput: handleBisqueInput,
                }),
                m("span.dimension-unit", "%"),
            ),
            m("span.stage-hint", "Bone Dry → Bisque"),
        ),
        m(".stage-field",
            m("span.label", "Fired"),
            m(".dimension-input-wrap",
                m(".derived-value",
                    { "aria-label": "Fired shrinkage percentage", role: "status", "aria-live": "polite" },
                    format(derived.firingPercent),
                ),
                derived.firingPercent !== null && m("span.dimension-unit", "%"),
            ),
            m("span.stage-hint", "Bisque → Fired"),
        ),
        derived.stagesWarning && m(".stage-warning",
            { role: "alert" },
            derived.stagesWarning,
        ),
    ),
};


// Vertical timeline showing dimensions at each stage: Wet → Bone Dry → Bisque → Fired
export const StagesCard: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const stages: Stage[] = [
            { label: "Wet",      dimensions: derived.wetDimensions!,     percent: null,                     isEndpoint: true },
            { label: "Bone Dry", dimensions: derived.boneDryDimensions!, percent: derived.greenwarePercent, isEndpoint: false },
            { label: "Bisque",   dimensions: derived.bisqueDimensions!,  percent: derived.bisquePercent,    isEndpoint: false },
            { label: "Fired",    dimensions: derived.finalDimensions!,   percent: derived.firingPercent,    isEndpoint: true },
        ];
        return m(".results-card",
            m(".results-header", "Shrinkage stages"),
            m(".timeline",
                stages.map((stage, index) =>
                    m(TimelineStage, { key: stage.label, stage, fields: derived.shape.fields, isFirst: index === 0 }),
                ),
            ),
        );
    },
};

// Single stage card with arrow connector showing shrinkage percent from previous stage
const TimelineStage: m.Component<{ stage: Stage; fields: string[]; isFirst: boolean }> = {
    view: ({ attrs: { stage, fields, isFirst } }) => m(".timeline-stage",
        !isFirst && m(".timeline-arrow",
            m("span.arrow-line"),
            m("span.arrow-percent", `−${format(stage.percent)}%`),
        ),
        m(`.timeline-card${stage.isEndpoint ? ".endpoint" : ""}`,
            m(".timeline-label", stage.label),
            fields.map((field, fieldIndex) => m(".timeline-dimension",
                { key: field },
                m(`span.timeline-dimension-label${stage.isEndpoint ? ".endpoint" : ""}`, field),
                m("span.timeline-dimension-value",
                    `${format(stage.dimensions[fieldIndex])} ${state.unit}`,
                ),
            )),
        ),
    ),
};
