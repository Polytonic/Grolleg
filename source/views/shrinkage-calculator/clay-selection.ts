import m from "mithril";
import { Tooltip } from "../../components/tooltip";
import { InputWithSuffix } from "../../components/input-with-suffix";
import {
    state, PRESET_GROUPS,
    handlePresetChange, handleShrinkageInput, handleShrinkageBlur,
} from "./state";
import type { Derived } from "./derived";


// Clay Body Field
// ClayBodyField should group generic and brand-name clay presets in one select.
export const ClayBodyField: m.Component = {
    view: () => m(".field-group",
        m("span.label",
            m("label", { for: "clay-body" }, "Clay Body"),
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

// Shrinkage Field
// ShrinkageField should collect the total wet-to-fired shrinkage percentage.
export const ShrinkageField: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".field-group",
        m("span.label",
            m("label", { for: "shrinkage-rate" },
                "Shrinkage Rate",
                derived.shrinkageInvalid && m("span.required", " *"),
            ),
            m(Tooltip, {
                label: "shrinkage rate",
                text: "Wet-to-fired shrinkage, including drying and firing. Clay spec sheets usually list it. To measure it, mark a wet test bar, fire it, and compare lengths.",
            }),
        ),
        m(InputWithSuffix, {
            suffix: "%",
            modifiers: derived.shrinkageInvalid ? ["error"] : undefined,
            id: "shrinkage-rate",
            type: "text",
            inputmode: "decimal",
            placeholder: "e.g. 12",
            value: state.shrinkage,
            "aria-required": "true",
            "aria-invalid": derived.shrinkageInvalid && "true",
            "aria-describedby": derived.shrinkageInvalid && "shrinkage-rate-error",
            oninput: handleShrinkageInput,
            onblur: handleShrinkageBlur,
        }),
        derived.shrinkageInvalid && m("span.input-error-text",
            {
                id: "shrinkage-rate-error",
                role: "status",
                "aria-live": "polite",
            },
            "Enter a number greater than 0 and less than 100",
        ),
    ),
};
