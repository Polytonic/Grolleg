import m from "mithril";
import { state, format, handleGreenwareInput, handleBisqueInput } from "./state";
import type { Stage, Derived } from "./state";


// Greenware, bisque, and derived firing percentage inputs with stage hints
const STAGE_FIELDS = [
    { id: "greenware-percent", label: "Greenware", hint: "Wet → Bone Dry",    placeholder: "e.g. 6",    stateKey: "greenwareShrinkage" as const, handler: handleGreenwareInput },
    { id: "bisque-percent",    label: "Bisque",    hint: "Bone Dry → Bisque", placeholder: "e.g. 0.75", stateKey: "bisqueShrinkage" as const,    handler: handleBisqueInput },
];

export const StageInputs: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".stage-inputs",
        STAGE_FIELDS.map((field) => m(".stage-field", { key: field.id },
            m("label.label", { for: field.id }, field.label),
            m(".dimension-input-wrap",
                m("input.input.with-suffix", {
                    id: field.id,
                    type: "number",
                    inputmode: "decimal",
                    step: "0.1",
                    min: "0",
                    placeholder: field.placeholder,
                    value: state[field.stateKey],
                    oninput: field.handler,
                }),
                m("span.dimension-unit", "%"),
            ),
            m("span.hint-text", field.hint),
        )),
        // Firing percentage is derived, not user-entered
        m(".stage-field",
            m("span.label", "Fired"),
            m(".dimension-input-wrap",
                m(".derived-value",
                    { "aria-label": "Fired shrinkage percentage", role: "status", "aria-live": "polite" },
                    format(derived.firingPercent),
                ),
                derived.firingPercent !== null && m("span.dimension-unit", "%"),
            ),
            m("span.hint-text", "Bisque → Fired"),
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
            stages.map((stage, index) =>
                m(TimelineStage, { key: stage.label, stage, fields: derived.shape.fields, isFirst: index === 0 }),
            ),
        );
    },
};

// Single stage card with arrow connector showing shrinkage percent from previous stage
const TimelineStage: m.Component<{ stage: Stage; fields: string[]; isFirst: boolean }> = {
    view: ({ attrs: { stage, fields, isFirst } }) => m(".timeline-stage",
        !isFirst && m(".timeline-arrow",
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
