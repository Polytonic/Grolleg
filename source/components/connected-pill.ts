import m from "mithril";
import "@css/components/connected-pill.css";


/* ── Geometry by Size Variant ──
   Pill matches input row height; chip is the smaller variant for inside
   piece rows. */

const GEOMETRY = {
    pill: { padding: "9px 14px", fontSize: 14, outerRadius: 10, gap: 6 },
    chip: { padding: "5px 11px", fontSize: 12, outerRadius: 6,  gap: 6 },
};

// Inner divider when both halves are active and connected. Translucent
// white reads against the accent fill at 3:1 (WCAG 1.4.11 non-text
// minimum). The token lives in source/index.css so dark-mode theming
// can retarget it.
const INNER_EDGE_WHEN_BOTH_ACTIVE = "var(--color-accent-inner-edge)";


/* ── Attrs ──
   Two tappable halves inside one rounded shape. When `connected`,
   halves sit flush with a single outer border (the right half's left
   edge is transparent so the join doesn't double up). When
   disconnected, the inner corners animate from 0 to outerRadius and a
   margin opens between them. */

export interface ConnectedPillAttrs {
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

        // Per-edge border colors. Top and bottom always use --cp-border
        // (a CSS custom property the stylesheet drives across base,
        // hover, and press states). Inner edges have special-case
        // overrides so the connected pair reads as one shape.
        const edge = (isLeft: boolean): { left: string; right: string } => ({
            left: !isLeft && attrs.connected ? "transparent" : "var(--cp-border)",
            right: isLeft && attrs.connected
                ? (bothActiveConnected ? INNER_EDGE_WHEN_BOTH_ACTIVE : "var(--cp-border)")
                : "var(--cp-border)",
        });

        const halfStyle = (isLeft: boolean, active: boolean): Record<string, string> => {
            const { left, right } = edge(isLeft);
            return {
                padding: geometry.padding,
                fontSize: `${geometry.fontSize}px`,
                background: "var(--cp-bg)",
                color: "var(--cp-color)",
                borderTop:    "1px solid var(--cp-border)",
                borderBottom: "1px solid var(--cp-border)",
                borderLeft:   `1px solid ${left}`,
                borderRight:  `1px solid ${right}`,
                borderTopLeftRadius:     `${isLeft ? geometry.outerRadius : innerRadius}px`,
                borderBottomLeftRadius:  `${isLeft ? geometry.outerRadius : innerRadius}px`,
                borderTopRightRadius:    `${isLeft ? innerRadius : geometry.outerRadius}px`,
                borderBottomRightRadius: `${isLeft ? innerRadius : geometry.outerRadius}px`,
                marginRight: isLeft ? `${splitGap}px` : "0px",
                fontWeight: active ? "600" : "400",
            };
        };

        const renderHalf = (half: Half) =>
            m(`button.connected-pill__half.size-${size}${half.active ? ".active" : ""}${half.disabled ? ".disabled" : ""}`,
                {
                    type: "button",
                    // ARIA expects string "true"/"false". Mithril treats
                    // raw booleans as HTML5 boolean-attribute presence,
                    // which screen readers ignore for these properties.
                    "aria-pressed": half.active ? "true" : "false",
                    "aria-disabled": half.disabled ? "true" : undefined,
                    "aria-label": half.ariaLabel,
                    disabled: half.disabled,
                    onclick: half.disabled ? undefined : half.onToggle,
                    style: halfStyle(half.isLeft, half.active),
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
