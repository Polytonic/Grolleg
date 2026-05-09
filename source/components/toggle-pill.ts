import m from "mithril";


// Toggle Pill Atom
// Exclusive groups should still use pressed button semantics until this
// primitive owns radio-group keyboard behavior.

interface TogglePillAttrs {
    // Single selector-safe class token. Space-separated class names are not supported.
    className: string;
    active: boolean;
    onclick: () => void;
    ariaLabel?: string;
    title?: string;
    disabled?: boolean;
}

export const TogglePill: m.Component<TogglePillAttrs> = {
    view: ({ attrs, children }) => {
        const classes = [attrs.className];
        if (attrs.active) classes.push("active");
        if (attrs.disabled) classes.push("disabled");
        return m(`button.${classes.join(".")}`, {
            type: "button",
            "aria-pressed": attrs.active ? "true" : "false",
            "aria-label": attrs.ariaLabel,
            "aria-disabled": attrs.disabled ? "true" : undefined,
            title: attrs.title,
            disabled: attrs.disabled,
            onclick: attrs.disabled ? undefined : attrs.onclick,
        }, children);
    },
};
