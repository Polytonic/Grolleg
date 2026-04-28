import m from "mithril";
import { Tooltip } from "../../components/tooltip";
import { UnitToggle } from "../../components/unit-toggle";
import { InputWithSuffix } from "../../components/input-with-suffix";
import {
    state, SHAPE_MODES,
    handleShapeChange, handleDirectionChange, handleUnitChange,
    handleDimensionInput, handleDimensionKey,
} from "./state";
import type { Direction, Unit, Derived } from "./state";


// Shape, direction, unit toggle, and dimension inputs grouped as one section
export const ClayControls: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".section",
        { role: "group", "aria-label": "Shape, direction, and dimensions" },
        m(".mode-row",
            m(ShapeSection),
            m(DirectionSection),
        ),
        m("span.section-label",
            `${state.direction === "fired-to-wet" ? "Fired" : "Wet"} Dimensions`,
            m(UnitToggle, {
                units: UNITS,
                active: state.unit,
                onSelect: (unit) => handleUnitChange(unit as Unit),
                ariaLabels: UNIT_ARIA_LABELS,
            }),
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
                        "aria-pressed": isActive ? "true" : "false",
                        onclick: () => handleShapeChange(index),
                    },
                    shapeMode.label,
                );
            }),
        ),
    ),
};

// Pill toggle for Fired→Wet / Wet→Fired conversion direction
const DIRECTION_OPTIONS: [Direction, string, string][] = [
    ["fired-to-wet", "Fired → Wet", "Fired to wet"],
    ["wet-to-fired", "Wet → Fired", "Wet to fired"],
];

const DirectionSection: m.Component = {
    view: () => m("div",
        m(".section-label",
            "Direction",
            m(Tooltip, {
                label: "direction",
                text: "Controls which way the conversion runs. Fired to Wet shows the wet size you need to throw to reach a given fired dimension. Wet to Fired shows how much a piece at a given wet size will shrink after firing.",
            }),
        ),
        m(".shape-pills",
            DIRECTION_OPTIONS.map(([value, label, ariaLabel]) => {
                const isActive = state.direction === value;
                return m(`button.shape-pill${isActive ? ".active" : ""}`,
                    {
                        key: value,
                        type: "button",
                        "aria-pressed": isActive ? "true" : "false",
                        "aria-label": ariaLabel,
                        onclick: () => handleDirectionChange(value),
                    },
                    label,
                );
            }),
        ),
    ),
};

const UNITS: readonly Unit[] = ["mm", "cm", "in"];
const UNIT_ARIA_LABELS: Record<string, string> = {
    mm: "millimeters",
    cm: "centimeters",
    in: "inches",
};

// Single numeric input with unit suffix and pulse animation on direction change
const DimensionInput: m.Component<{ field: string; fieldIndex: number; isLast: boolean }> = {
    view: ({ attrs: { field, fieldIndex, isLast } }) => m(".dimension-field",
        m("label.input-label", { for: `dimension-${field.toLowerCase()}` }, field),
        m(InputWithSuffix, {
            suffix: state.unit,
            modifiers: ["numeric"],
            pulseKey: state.pulseKey,
            id: `dimension-${field.toLowerCase()}`,
            type: "number",
            inputmode: "decimal",
            enterkeyhint: isLast ? "done" : "next",
            step: "any",
            min: "0",
            placeholder: "\u2014",
            value: state.dimensions[fieldIndex],
            oninput: (event: Event) => handleDimensionInput(fieldIndex, event),
            onkeydown: (event: KeyboardEvent) => handleDimensionKey(fieldIndex, event),
        }),
    ),
};
