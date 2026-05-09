import m from "mithril";
import { InputWithSuffix } from "../../components/input-with-suffix";
import { formatNumber } from "../../components/locale";
import { state, handleGreenwareInput, handleBisqueInput } from "./state";
import type { Stage } from "./state";
import type { Derived } from "./derived";


// Stage Inputs
// StageInputs should show greenware, bisque, and derived firing percentages
// with stage hints.
const STAGE_FIELDS = [
    { id: "greenware-percent", label: "Greenware", hint: "Wet → Bone Dry",    placeholder: "e.g. 6",    stateKey: "greenwareShrinkage" as const, handler: handleGreenwareInput },
    { id: "bisque-percent",    label: "Bisque",    hint: "Bone Dry → Bisque", placeholder: "e.g. 1",    stateKey: "bisqueShrinkage" as const,    handler: handleBisqueInput },
];

export const StageInputs: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".stage-inputs",
        STAGE_FIELDS.map((field) => m(".stage-field", { key: field.id },
            m("label.label", { for: field.id }, field.label),
            m(InputWithSuffix, {
                suffix: "%",
                id: field.id,
                type: "text",
                inputmode: "decimal",
                placeholder: field.placeholder,
                value: state[field.stateKey],
                oninput: field.handler,
            }),
            m("span.hint-text", field.hint),
        )),
        // Firing percentage should render as read-only text because it is
        // derived, not user-entered.
        m(".stage-field",
            m("span.label", "Fired"),
            m(".input-with-suffix",
                m(".derived-value",
                    { "aria-label": "Fired shrinkage percentage", role: "status", "aria-live": "polite" },
                    formatNumber(derived.firingPercent),
                ),
                derived.firingPercent !== null && m("span.input-suffix", "%"),
            ),
            m("span.hint-text", "Bisque → Fired"),
        ),
        derived.stagesWarning && m(".stage-warning",
            { role: "alert" },
            derived.stagesWarning,
        ),
    ),
};


// Stages Card
// StagesCard should show dimensions from Wet through Fired.
export const StagesCard: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        if (!derived.stageWetDimensions || !derived.boneDryDimensions
            || !derived.bisqueDimensions || !derived.stageFinalDimensions) return null;
        const stages: Stage[] = [
            { label: "Wet", dimensions: derived.stageWetDimensions, percent: null, isEndpoint: true },
            {
                label: "Bone Dry",
                dimensions: derived.boneDryDimensions,
                percent: derived.greenwarePercent,
                isEndpoint: false,
            },
            {
                label: "Bisque",
                dimensions: derived.bisqueDimensions,
                percent: derived.bisquePercent,
                isEndpoint: false,
            },
            {
                label: "Fired",
                dimensions: derived.stageFinalDimensions,
                percent: derived.firingPercent,
                isEndpoint: true,
            },
        ];
        return m(".results-card",
            m(".results-header", "Shrinkage stages"),
            stages.map((stage, index) =>
                m(TimelineStage, { key: stage.label, stage, fields: derived.shape.fields, isFirst: index === 0 }),
            ),
        );
    },
};

// Timeline Stage
// TimelineStage should show one stage with its shrinkage from the previous one.
const TimelineStage: m.Component<{ stage: Stage; fields: string[]; isFirst: boolean }> = {
    view: ({ attrs: { stage, fields, isFirst } }) => m(".timeline-stage",
        !isFirst && m(".timeline-arrow",
            m("span.arrow-percent", `−${formatNumber(stage.percent)}%`),
        ),
        m(`.timeline-card${stage.isEndpoint ? ".endpoint" : ""}`,
            m(".timeline-label", stage.label),
            fields.map((field, fieldIndex) => {
                const dimension = stage.dimensions[fieldIndex];
                return m(".timeline-dimension",
                    { key: field },
                    m(`span.timeline-dimension-label${stage.isEndpoint ? ".endpoint" : ""}`, field),
                    m("span.timeline-dimension-value",
                        dimension === null ? formatNumber(null) : `${formatNumber(dimension)} ${state.unit}`,
                    ),
                );
            }),
        ),
    ),
};
