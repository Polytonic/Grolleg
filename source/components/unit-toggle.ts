import m from "mithril";


// Unit Toggle
// Separators and parentheses are decorative. Unit buttons use aria-pressed because
// this compact selector does not own radio-group keyboard behavior.

interface UnitToggleAttrs {
    units: readonly string[];
    active: string;
    onSelect: (unit: string) => void;
    ariaLabels?: Record<string, string>;
    ariaLabel?: string;
}

export const UnitToggle: m.Component<UnitToggleAttrs> = {
    view: ({ attrs: { units, active, onSelect, ariaLabels, ariaLabel } }) => {
        const children: m.Children[] = [];
        units.forEach((unit, index) => {
            if (index > 0) {
                children.push(m("span.unit-separator", { key: `${unit}-sep`, "aria-hidden": "true" }, "|"));
            }
            const isActive = active === unit;
            children.push(m(`button.unit-text${isActive ? ".active" : ""}`,
                {
                    key: unit,
                    type: "button",
                    // ARIA state values should stay strings because Mithril
                    // serializes raw booleans as HTML boolean attributes.
                    "aria-pressed": isActive ? "true" : "false",
                    "aria-label": ariaLabels?.[unit] ?? unit,
                    onclick: () => onSelect(unit),
                },
                unit,
            ));
        });
        return m("span.unit-text-toggle",
            { role: "group", "aria-label": ariaLabel },
            m("span", { "aria-hidden": "true" }, "("),
            children,
            m("span", { "aria-hidden": "true" }, ")"),
        );
    },
};
