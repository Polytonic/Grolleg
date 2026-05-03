import m from "mithril";


/* Unit Toggle   Inline `mm | cm | in`-style selector. Parens are DOM spans with
   aria-hidden so screen readers skip the decorative punctuation.
   Sizing comes from the shared `.unit-text` class. */

interface UnitToggleAttrs {
    units: readonly string[];
    active: string;
    onSelect: (unit: string) => void;
    ariaLabels?: Record<string, string>;
}

export const UnitToggle: m.Component<UnitToggleAttrs> = {
    view: ({ attrs: { units, active, onSelect, ariaLabels } }) => {
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
                    // ARIA wants string "true"/"false", not Mithril's
                    // raw-boolean attribute presence form.
                    "aria-pressed": isActive ? "true" : "false",
                    "aria-label": ariaLabels?.[unit] ?? unit,
                    onclick: () => onSelect(unit),
                },
                unit,
            ));
        });
        return m("span.unit-text-toggle",
            m("span", { "aria-hidden": "true" }, "("),
            children,
            m("span", { "aria-hidden": "true" }, ")"),
        );
    },
};
