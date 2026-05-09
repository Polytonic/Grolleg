import m from "mithril";
import { InputWithSuffix } from "../../components/input-with-suffix";
import { UNIT_VERBOSE } from "../../components/locale";
import { TogglePill } from "../../components/toggle-pill";
import { Tooltip } from "../../components/tooltip";
import { UnitToggle } from "../../components/unit-toggle";
import {
    state, SHAPE_MODES,
    handleShapeChange, handleDirectionChange, handleUnitChange,
    handleDimensionInput, handleDimensionKey,
} from "./state";
import type { Direction, Unit } from "./state";
import type { Derived } from "./derived";


// Clay Controls
// ClayControls should keep shape, direction, unit toggle, and dimension inputs
// in one grouped section.
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
                ariaLabels: UNIT_VERBOSE,
                ariaLabel: "Dimension unit",
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

// Shape and direction controls should use pressed toggles because the shared
// pill primitive does not own radio-group keyboard behavior.
const ShapeSection: m.Component = {
    view: () => m("div",
        m(".section-label",
            "Shape",
            m(Tooltip, {
                label: "shape",
                text: "Choose the closest shape. Cylinder fits round forms. Rectangle fits tiles, slabs, and boxes. Linear fits one measured length.",
            }),
        ),
        m(".shape-pills", { role: "group", "aria-label": "Shape" },
            SHAPE_MODES.map((shapeMode, index) =>
                m(TogglePill, {
                    key: shapeMode.id,
                    className: "shape-pill",
                    active: state.shapeIndex === index,
                    onclick: () => handleShapeChange(index),
                }, shapeMode.label),
            ),
        ),
    ),
};

interface DirectionOption {
    value: Direction;
    label: string;
    ariaLabel: string;
}

const DIRECTION_OPTIONS: DirectionOption[] = [
    { value: "fired-to-wet", label: "Fired → Wet", ariaLabel: "Fired to wet" },
    { value: "wet-to-fired", label: "Wet → Fired", ariaLabel: "Wet to fired" },
];

const DirectionSection: m.Component = {
    view: () => m("div",
        m(".section-label",
            "Direction",
            m(Tooltip, {
                label: "direction",
                text: "Fired to Wet finds the wet size needed for a fired dimension. Wet to Fired predicts fired size from wet size.",
            }),
        ),
        m(".shape-pills", { role: "group", "aria-label": "Direction" },
            DIRECTION_OPTIONS.map(({ value, label, ariaLabel }) =>
                m(TogglePill, {
                    key: value,
                    className: "shape-pill",
                    active: state.direction === value,
                    ariaLabel,
                    onclick: () => handleDirectionChange(value),
                }, label),
            ),
        ),
    ),
};

const UNITS: readonly Unit[] = ["mm", "cm", "in"];

// Dimension Input
// DimensionInput should pair a numeric field with the active unit and direction
// pulse animation.
const DimensionInput: m.Component<{ field: string; fieldIndex: number; isLast: boolean }> = {
    view: ({ attrs: { field, fieldIndex, isLast } }) => m(".dimension-field",
        m("label.input-label", { for: `dimension-${field.toLowerCase()}` }, field),
        m(InputWithSuffix, {
            suffix: state.unit,
            modifiers: ["numeric"],
            pulseKey: state.pulseKey,
            id: `dimension-${field.toLowerCase()}`,
            type: "text",
            inputmode: "decimal",
            enterkeyhint: isLast ? "done" : "next",
            placeholder: "\u2014",
            value: state.dimensions[fieldIndex],
            oninput: (event: Event) => handleDimensionInput(fieldIndex, event),
            onkeydown: (event: KeyboardEvent) => handleDimensionKey(fieldIndex, event),
        }),
    ),
};
