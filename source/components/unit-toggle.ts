import m from "mithril";


/* ── Unit Toggle ──
   Inline `mm | cm | in`-style selector that wraps in parens via CSS
   pseudo-elements (`.unit-text-toggle::before/::after` from
   styles/controls.css). Used by any tool that needs a compact unit
   switch sitting inline with a section header. Sizing comes from
   the shared `.unit-text` class. This component only owns the DOM
   shape and the iteration. */

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
                children.push(m("span.unit-separator", { key: `${unit}-sep` }, "|"));
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
        return m("span.unit-text-toggle", children);
    },
};
