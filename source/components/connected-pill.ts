import m from "mithril";
import "@css/components/connected-pill.css";


/* ── Geometry by Size Variant ──
   Two sizes cover current uses. Pill matches the controls-card row height
   (vertical padding aligns with the input's 10px). Chip is the smaller
   variant for inside piece rows. */

const GEOMETRY = {
    pill: { padding: "9px 14px", fontSize: 14, outerRadius: 10, gap: 6 },
    chip: { padding: "5px 11px", fontSize: 12, outerRadius: 6,  gap: 6 },
};

// Translucent white reads against the accent fill at 3:1 (WCAG 1.4.11
// non-text minimum). Used as the inner divider when both halves are active
// and connected, signaling "two halves of one shape" without losing the seam.
const INNER_EDGE_WHEN_BOTH_ACTIVE = "rgba(255, 255, 255, 0.6)";


/* ── Attrs ──
   Two tappable halves inside one rounded shape. When `connected`, halves
   sit flush with a single outer border (the right half's left edge is
   transparent so the join doesn't double up). When disconnected, the inner
   corners animate from 0 to outerRadius and a margin opens up between them. */

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

export const ConnectedPill: m.Component<ConnectedPillAttrs> = {
    view: ({ attrs }) => {
        const size = attrs.size ?? "pill";
        const geom = GEOMETRY[size];
        const innerRadius = attrs.connected ? 0 : geom.outerRadius;
        const splitGap = attrs.connected ? 0 : geom.gap;
        const bothActiveConnected = attrs.connected && attrs.aActive && attrs.bActive;

        // Per-edge border colors. Top/bottom always use --cp-border (a CSS
        // custom property the stylesheet drives across base/hover/press
        // states). Inner edges have special-case overrides for the unity-
        // of-shape illusion.
        const edge = (isLeft: boolean): { left: string; right: string } => ({
            left: !isLeft && attrs.connected ? "transparent" : "var(--cp-border)",
            right: isLeft && attrs.connected
                ? (bothActiveConnected ? INNER_EDGE_WHEN_BOTH_ACTIVE : "var(--cp-border)")
                : "var(--cp-border)",
        });

        const halfStyle = (isLeft: boolean, active: boolean): Record<string, string> => {
            const { left, right } = edge(isLeft);
            return {
                padding: geom.padding,
                fontSize: `${geom.fontSize}px`,
                background: "var(--cp-bg)",
                color: "var(--cp-color)",
                borderTop:    "1px solid var(--cp-border)",
                borderBottom: "1px solid var(--cp-border)",
                borderLeft:   `1px solid ${left}`,
                borderRight:  `1px solid ${right}`,
                borderTopLeftRadius:     `${isLeft ? geom.outerRadius : innerRadius}px`,
                borderBottomLeftRadius:  `${isLeft ? geom.outerRadius : innerRadius}px`,
                borderTopRightRadius:    `${isLeft ? innerRadius : geom.outerRadius}px`,
                borderBottomRightRadius: `${isLeft ? innerRadius : geom.outerRadius}px`,
                marginRight: isLeft ? `${splitGap}px` : "0px",
                fontWeight: active ? "600" : "400",
            };
        };

        const buildHalf = (
            isLeft: boolean, label: m.Children, active: boolean,
            disabled: boolean, onToggle: () => void, ariaLabel?: string,
        ) =>
            m(`button.connected-pill__half.size-${size}${active ? ".active" : ""}${disabled ? ".disabled" : ""}`,
                {
                    type: "button",
                    "aria-pressed": active,
                    "aria-disabled": disabled || undefined,
                    "aria-label": ariaLabel,
                    disabled,
                    onclick: disabled ? undefined : onToggle,
                    style: halfStyle(isLeft, active),
                },
                label,
            );

        return m(".connected-pill",
            buildHalf(true,  attrs.aLabel, attrs.aActive, !!attrs.aDisabled, attrs.onToggleA, attrs.aAriaLabel),
            buildHalf(false, attrs.bLabel, attrs.bActive, !!attrs.bDisabled, attrs.onToggleB, attrs.bAriaLabel),
        );
    },
};
