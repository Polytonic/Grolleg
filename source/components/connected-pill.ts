import m from "mithril";
import "@css/components/connected-pill.css";


// Geometry by Size Variant
// Pill aligns with input rows. Chip stays compact inside piece rows.

const GEOMETRY = {
    pill: { padding: "9px 14px", fontSize: 14, outerRadius: 10, gap: 6 },
    chip: { padding: "5px 11px", fontSize: 12, outerRadius: 6, gap: 6 },
};

// The active inner divider should keep the connected pair readable as
// one shape while still meeting the 3:1 non-text contrast minimum.
const INNER_EDGE_WHEN_BOTH_ACTIVE = "var(--color-accent-inner-edge)";


// Component Contract

interface ConnectedPillAttrs {
    connected: boolean;
    aActive: boolean;
    bActive: boolean;
    aLabel: m.Children;
    bLabel: m.Children;
    aDisabled?: boolean;
    bDisabled?: boolean;
    onToggleA: () => void;
    onToggleB: () => void;
    size?: "pill" | "chip";
    aAriaLabel?: string;
    bAriaLabel?: string;
}

interface Half {
    isLeft: boolean;
    label: m.Children;
    active: boolean;
    disabled: boolean;
    onToggle: () => void;
    ariaLabel?: string;
}

export const ConnectedPill: m.Component<ConnectedPillAttrs> = {
    view: ({ attrs }) => {
        const size = attrs.size ?? "pill";
        const geometry = GEOMETRY[size];
        const innerRadius = attrs.connected ? 0 : geometry.outerRadius;
        const splitGap = attrs.connected ? 0 : geometry.gap;
        const bothActiveConnected = attrs.connected && attrs.aActive && attrs.bActive;

        // Inline borders should keep each edge at one physical pixel while
        // connected halves animate between separated and joined geometry.
        const halfStyle = (isLeft: boolean): Record<string, string> => {
            const normalBorder = "var(--cp-border)";
            const leftBorder = !isLeft && attrs.connected ? "transparent" : normalBorder;
            const rightBorder = isLeft && attrs.connected
                ? (bothActiveConnected ? INNER_EDGE_WHEN_BOTH_ACTIVE : normalBorder)
                : normalBorder;

            return {
                padding: geometry.padding,
                fontSize: `${geometry.fontSize}px`,
                background: "var(--cp-bg)",
                color: "var(--cp-color)",
                borderTop:    "1px solid var(--cp-border)",
                borderBottom: "1px solid var(--cp-border)",
                borderLeft:   `1px solid ${leftBorder}`,
                borderRight:  `1px solid ${rightBorder}`,
                borderTopLeftRadius:     `${isLeft ? geometry.outerRadius : innerRadius}px`,
                borderBottomLeftRadius:  `${isLeft ? geometry.outerRadius : innerRadius}px`,
                borderTopRightRadius:    `${isLeft ? innerRadius : geometry.outerRadius}px`,
                borderBottomRightRadius: `${isLeft ? innerRadius : geometry.outerRadius}px`,
                marginRight: isLeft ? `${splitGap}px` : "0px",
                fontWeight: "400",
            };
        };

        const renderHalf = (half: Half) =>
            m(`button.connected-pill__half.size-${size}${half.active ? ".active" : ""}${half.disabled ? ".disabled" : ""}`,
                {
                    type: "button",
                    // ARIA state values should stay strings because Mithril
                    // serializes raw booleans as HTML boolean attributes.
                    "aria-pressed": half.active ? "true" : "false",
                    "aria-disabled": half.disabled ? "true" : undefined,
                    "aria-label": half.ariaLabel,
                    disabled: half.disabled,
                    onclick: half.disabled ? undefined : half.onToggle,
                    style: halfStyle(half.isLeft),
                },
                half.label,
            );

        return m(".connected-pill",
            renderHalf({ isLeft: true,  label: attrs.aLabel, active: attrs.aActive,
                disabled: !!attrs.aDisabled, onToggle: attrs.onToggleA, ariaLabel: attrs.aAriaLabel }),
            renderHalf({ isLeft: false, label: attrs.bLabel, active: attrs.bActive,
                disabled: !!attrs.bDisabled, onToggle: attrs.onToggleB, ariaLabel: attrs.bAriaLabel }),
        );
    },
};
