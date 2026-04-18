import m from "mithril";
import { Tooltip } from "../../components/tooltip";
import {
    state, PRESET_GROUPS,
    handlePresetChange, handleShrinkageInput, handleShrinkageBlur,
} from "./state";
import type { Derived } from "./state";


// Preset dropdown grouped by generic and brand-name clay bodies
export const ClayBodyField: m.Component = {
    view: () => m(".field-group",
        m("label.label", { for: "clay-body" },
            "Clay Body",
            m(Tooltip, {
                label: "clay body",
                text: "Select a preset to auto-fill shrinkage rates, or choose Custom. Presets also populate staged shrinkage values when enabled.",
            }),
        ),
        m("select.select",
            {
                id: "clay-body",
                value: state.presetIndex,
                onchange: handlePresetChange,
            },
            PRESET_GROUPS.map((group) => m("optgroup",
                { key: group.label, label: group.label },
                group.options.map((option) => m("option",
                    { key: option.index, value: option.index },
                    option.name,
                )),
            )),
        ),
    ),
};

// Numeric input for total wet-to-fired shrinkage percentage
export const ShrinkageField: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".field-group",
        m("label.label", { for: "shrinkage-rate" },
            "Shrinkage Rate",
            derived.shrinkInvalid && m("span.required", " *"),
            m(Tooltip, {
                label: "shrinkage rate",
                text: "Wet-to-fired shrinkage combining drying and firing. Most clay bodies publish this on their spec sheet. To measure yourself: scratch a known length into a wet test bar, fire to maturity, measure again. Shrinkage = (wet − fired) ÷ wet × 100.",
            }),
        ),
        m(".dimension-input-wrap",
            m(`input.input.with-suffix${derived.shrinkInvalid ? ".error" : ""}`, {
                id: "shrinkage-rate",
                type: "number",
                inputmode: "decimal",
                step: "0.1",
                min: "0",
                max: "99",
                placeholder: "e.g. 12.5",
                value: state.shrinkage,
                "aria-invalid": derived.shrinkInvalid ? true : undefined,
                "aria-describedby": derived.shrinkInvalid ? "shrinkage-rate-error" : undefined,
                oninput: handleShrinkageInput,
                onblur: handleShrinkageBlur,
            }),
            m("span.dimension-unit", "%"),
        ),
        derived.shrinkInvalid && m("span.input-error-text",
            {
                id: "shrinkage-rate-error",
                role: "status",
                "aria-live": "polite",
            },
            "Enter a number greater than 0 and less than 100",
        ),
    ),
};
