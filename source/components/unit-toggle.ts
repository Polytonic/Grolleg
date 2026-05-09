import m from "mithril";


// Unit Toggle

interface UnitToggleAttrs {
    units: readonly string[];
    active: string;
    onSelect: (unit: string) => void;
    ariaLabels?: Record<string, string>;
    ariaLabel?: string;
}

const unitButton = (
    unit: string,
    active: string,
    onSelect: (unit: string) => void,
    ariaLabels?: Record<string, string>,
) => {
    const isActive = active === unit;
    return m(`button.unit-text${isActive ? ".active" : ""}`,
        {
            key: unit,
            type: "button",
            // ARIA state values should stay strings because Mithril serializes
            // raw booleans as HTML boolean attributes.
            "aria-pressed": isActive ? "true" : "false",
            "aria-label": ariaLabels?.[unit] ?? unit,
            onclick: () => onSelect(unit),
        },
        unit,
    );
};

const unitControls = (
    units: readonly string[],
    active: string,
    onSelect: (unit: string) => void,
    ariaLabels?: Record<string, string>,
) =>
    units.flatMap((unit, index) =>
        index === 0
            ? [unitButton(unit, active, onSelect, ariaLabels)]
            : [
                m("span.unit-separator", { key: `${unit}-sep`, "aria-hidden": "true" }, "|"),
                unitButton(unit, active, onSelect, ariaLabels),
            ],
    );

export const UnitToggle: m.Component<UnitToggleAttrs> = {
    view: ({ attrs: { units, active, onSelect, ariaLabels, ariaLabel } }) =>
        m("span.unit-text-toggle",
            { role: "group", "aria-label": ariaLabel },
            m("span", { "aria-hidden": "true" }, "("),
            unitControls(units, active, onSelect, ariaLabels),
            m("span", { "aria-hidden": "true" }, ")"),
        ),
};
