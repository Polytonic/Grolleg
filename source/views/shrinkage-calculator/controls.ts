import m from "mithril";
import { Tooltip } from "../../components/tooltip";
import {
    state, SHAPE_MODES,
    handleShapeChange, handleDirectionChange, handleUnitChange,
    handleDimensionInput, handleDimensionKey,
} from "./state";
import type { Direction, Unit, Derived, PulseState } from "./state";


// Shape, direction, unit toggle, and dimension inputs grouped as one section
export const ClayControls: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".section",
        { role: "group", "aria-label": "Shape, direction, and dimensions" },
        m(".mode-row",
            m(ShapeSection),
            m(DirectionSection),
        ),
        m(".section-header",
            m("span.section-title",
                `Enter ${state.direction === "fired-to-wet" ? "fired" : "wet"} dimensions`,
            ),
            m(UnitToggle),
        ),
        m(".dimensions-row",
            derived.shape.fields.map((field, fieldIndex) => m(DimensionInput, {
                key: field,
                field,
                fieldIndex,
                isLast: fieldIndex === derived.shape.fields.length - 1,
            })),
        ),
    ),
};

// Pill toggle for Linear / Cylinder / Rectangle
const ShapeSection: m.Component = {
    view: () => m("div",
        m(".section-label",
            "Shape",
            m(Tooltip, {
                label: "shape",
                text: "Choose the shape closest to your piece. Cylinder for round forms such as mugs, bowls, and vases. Rectangle for tiles, slabs, and boxes. Linear for a single length such as a test bar or tile edge.",
            }),
        ),
        m(".shape-pills",
            SHAPE_MODES.map((shapeMode, index) => {
                const isActive = state.shapeIndex === index;
                return m(`button.shape-pill${isActive ? ".active" : ""}`,
                    {
                        key: shapeMode.id,
                        type: "button",
                        "aria-pressed": isActive,
                        onclick: () => handleShapeChange(index),
                    },
                    shapeMode.label,
                );
            }),
        ),
    ),
};

// Pill toggle for Fired→Wet / Wet→Fired conversion direction
const DirectionSection: m.Component = {
    view: () => {
        const options: [Direction, string, string][] = [
            ["fired-to-wet", "Fired → Wet", "Fired to wet"],
            ["wet-to-fired", "Wet → Fired", "Wet to fired"],
        ];
        return m("div",
            m(".section-label", "Direction"),
            m(".shape-pills",
                options.map(([value, label, ariaLabel]) => {
                    const isActive = state.direction === value;
                    return m(`button.shape-pill${isActive ? ".active" : ""}`,
                        {
                            key: value,
                            type: "button",
                            "aria-pressed": isActive,
                            "aria-label": ariaLabel,
                            onclick: () => handleDirectionChange(value),
                        },
                        label,
                    );
                }),
            ),
        );
    },
};

// Inline mm | cm | in selector next to the dimension header
const UnitToggle: m.Component = {
    view: () => {
        const units: [Unit, string, string][] = [
            ["mm", "mm", "millimeters"],
            ["cm", "cm", "centimeters"],
            ["in", "in", "inches"],
        ];
        const children: m.Children[] = [];
        units.forEach(([value, label, ariaLabel], index) => {
            if (index > 0) {
                children.push(m("span.unit-separator", { key: `${value}-separator` }, "|"));
            }
            const isActive = state.unit === value;
            children.push(m(`button.unit-text${isActive ? ".active" : ""}`,
                {
                    key: value,
                    type: "button",
                    "aria-pressed": isActive,
                    "aria-label": ariaLabel,
                    onclick: () => handleUnitChange(value),
                },
                label,
            ));
        });
        return m("span.unit-text-toggle",
            m("span.unit-paren", "("),
            children,
            m("span.unit-paren", ")"),
        );
    },
};

// Single numeric input with unit suffix and pulse animation on direction change
const DimensionInput: m.Component<{ field: string; fieldIndex: number; isLast: boolean }> = {
    view: ({ attrs: { field, fieldIndex, isLast } }) => m(".dimension-field",
        m("label.dimension-label", { for: `dimension-${field.toLowerCase()}` }, field),
        m(".dimension-input-wrap",
            m("input.dimension-input", {
                id: `dimension-${field.toLowerCase()}`,
                type: "number",
                inputmode: "decimal",
                enterkeyhint: isLast ? "done" : "next",
                step: "any",
                min: "0",
                placeholder: "—",
                value: state.dimensions[fieldIndex],
                oninput: (event: Event) => handleDimensionInput(fieldIndex, event),
                onkeydown: (event: KeyboardEvent) => handleDimensionKey(fieldIndex, event),
                // Remove-reflow-add replays the CSS animation reliably, regardless
                // of whether Mithril reused the DOM node. A key-change approach is
                // fragile because the input's sibling span is unkeyed.
                oncreate: (vnode: m.VnodeDOM) => {
                    (vnode.state as PulseState).lastPulseKey = state.pulseKey;
                },
                onupdate: (vnode: m.VnodeDOM) => {
                    const tracker = vnode.state as PulseState;
                    if (tracker.lastPulseKey === state.pulseKey) return;
                    tracker.lastPulseKey = state.pulseKey;
                    if (state.pulseKey === 0) return;
                    const element = vnode.dom as HTMLElement;
                    element.classList.remove("pulsing");
                    void element.offsetHeight;
                    element.classList.add("pulsing");
                },
            }),
            m("span.dimension-unit", state.unit),
        ),
    ),
};
