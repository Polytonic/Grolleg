import m from "mithril";
import { ConnectedPill } from "../../components/connected-pill";
import { InputWithSuffix } from "../../components/input-with-suffix";
import { Silhouette } from "./comparison";
import {
    state, addPiece, removePiece, updatePiece,
    togglePieceFiring, togglePiecePair,
} from "./state";
import type { Derived, Piece, PieceComputed } from "./state";


/* ── Local Icons ── */

const xIcon = (size: number = 16): m.Vnode =>
    m("svg", {
        width: size, height: size, viewBox: "0 0 24 24",
        fill: "none", stroke: "currentColor", "stroke-width": 2,
        "stroke-linecap": "round", "stroke-linejoin": "round",
        "aria-hidden": "true",
    },
        m("path", { d: "M18 6 6 18" }),
        m("path", { d: "m6 6 12 12" }),
    );

const plusIcon = (size: number = 14): m.Vnode =>
    m("svg", {
        width: size, height: size, viewBox: "0 0 24 24",
        fill: "none", stroke: "currentColor", "stroke-width": 2,
        "stroke-linecap": "round", "stroke-linejoin": "round",
        "aria-hidden": "true",
    },
        m("path", { d: "M5 12h14" }),
        m("path", { d: "M12 5v14" }),
    );


/* ── Local Chip Primitive ──
   Smaller than the controls Pill (12px font, 5px/11px padding).
   Inactive uses font-weight 400 because the suite forbids 500 (Segoe
   UI on Windows renders 500 inconsistently). Disabled chips dim to
   50% opacity, signalling "studio doesn't bill for this firing" while
   preserving the underlying coloring. */

interface ChipAttrs {
    active: boolean;
    disabled?: boolean;
    onclick: () => void;
}

const Chip: m.Component<ChipAttrs> = {
    view: ({ attrs, children }) =>
        m(`button.chip${attrs.active ? ".active" : ""}${attrs.disabled ? ".disabled" : ""}`,
            {
                type: "button",
                // ARIA expects string "true"/"false", not the HTML5 boolean
                // attribute presence form Mithril uses for raw booleans.
                "aria-pressed": attrs.active ? "true" : "false",
                "aria-disabled": attrs.disabled ? "true" : undefined,
                disabled: attrs.disabled,
                onclick: attrs.disabled ? undefined : attrs.onclick,
            },
            children,
        ),
};


/* ── Number Formatting ──
   Weight basis prints two decimals (small numbers like 1.25 lb);
   volume and footprint print whole numbers (large numbers like 240 in³).
   Price always prints two decimals as a dollar amount. */

const formatPrice = (value: number): string => `$${value.toFixed(2)}`;
const formatQuantity = (value: number, basis: string): string =>
    basis === "weight" ? value.toFixed(2) : value.toFixed(0);


/* ── Price + Quantity ──
   Right-justified in the Include row. Active price is accent-coloured;
   $0 reads as muted-soft so it doesn't compete with real numbers. */

const PriceLabel: m.Component<{ computed: PieceComputed; derived: Derived }> = {
    view: ({ attrs: { computed, derived } }) => {
        const { result, quantityUnit } = computed;
        const hasPrice = result.price > 0;
        if (!hasPrice) {
            return m("span.piece-row__price.zero", formatPrice(0));
        }
        return m("span.piece-row__price-block",
            m("span.piece-row__price", formatPrice(result.price)),
            result.quantity > 0 && m("span.piece-row__quantity",
                ` · ${formatQuantity(result.quantity, derived.studio.basis)} ${quantityUnit}`,
            ),
        );
    },
};


/* ── Dimension Inputs ──
   Volume: 3-col grid (L, W, H). The H input gains the .warn class when the
   piece's entered height is below the studio minimum, which the parent
   passes via heightBelowMin. Footprint: 2-col grid (L, W). Weight: single
   input bounded to 220px so it doesn't stretch full-width. */

interface DimensionsAttrs {
    piece: Piece;
    derived: Derived;
    heightBelowMin: boolean;
}

const Dimensions: m.Component<DimensionsAttrs> = {
    view: ({ attrs: { piece, derived, heightBelowMin } }) => {
        const { studio } = derived;
        if (studio.basis === "weight") {
            return m(".piece-row__weight",
                m(".field-group",
                    m("label.input-label", { for: `piece-${piece.id}-weight` }, "Weight"),
                    m(InputWithSuffix, {
                        suffix: studio.weightUnit,
                        inputClass: "numeric",
                        id: `piece-${piece.id}-weight`,
                        type: "number",
                        inputmode: "decimal",
                        step: "0.1",
                        min: "0",
                        placeholder: "—",
                        value: piece.weight,
                        oninput: (event: Event) => updatePiece(piece.id, {
                            weight: (event.currentTarget as HTMLInputElement).value,
                        }),
                    }),
                ),
            );
        }
        const columns: { key: "L" | "W" | "H"; label: string; warn?: boolean }[] = [
            { key: "L", label: "Length" },
            { key: "W", label: "Width" },
        ];
        if (studio.basis === "volume") {
            columns.push({ key: "H", label: "Height", warn: heightBelowMin });
        }
        return m(`.piece-row__dimensions.columns-${columns.length}`,
            columns.map((column) => m(".field-group", { key: column.key },
                m("label.input-label", { for: `piece-${piece.id}-${column.key}` }, column.label),
                m(InputWithSuffix, {
                    suffix: studio.dimensionUnit,
                    inputClass: column.warn ? "numeric warn" : "numeric",
                    id: `piece-${piece.id}-${column.key}`,
                    type: "number",
                    inputmode: "decimal",
                    step: "0.1",
                    min: "0",
                    placeholder: "—",
                    title: column.warn
                        ? `Billed at ${studio.minHeight} ${studio.dimensionUnit} (minimum height)`
                        : undefined,
                    value: piece[column.key],
                    oninput: (event: Event) => updatePiece(piece.id, {
                        [column.key]: (event.currentTarget as HTMLInputElement).value,
                    }),
                }),
            )),
        );
    },
};


/* ── Include Row ──
   The Bisque|Glaze ConnectedPill (chip scale) and Luster chip on the
   left. Price + quantity right-justified on the right. The comparison
   silhouette has moved up to the Piece Dimensions header row, leaving
   this row to read as "with these firings included, the piece costs
   $X." The pair's `connected` reflects ONLY the studio bundled flag,
   never the per-piece firing-active state. */

interface IncludeRowAttrs {
    piece: Piece;
    computed: PieceComputed;
    derived: Derived;
}

const IncludeRow: m.Component<IncludeRowAttrs> = {
    view: ({ attrs: { piece, computed, derived } }) => {
        const onPair = (key: "bisque" | "glaze") =>
            state.bundled
                ? togglePiecePair(piece.id, key)
                : togglePieceFiring(piece.id, key);
        return m(".piece-row__include",
            m("span.label", "Include"),
            m(".piece-row__include-chips",
                m(ConnectedPill, {
                    size: "chip",
                    connected: state.bundled,
                    aActive: !!piece.firings.bisque,
                    bActive: !!piece.firings.glaze,
                    aLabel: "Bisque",
                    bLabel: "Glaze",
                    aDisabled: !state.firingToggles.bisque,
                    bDisabled: !state.firingToggles.glaze,
                    onToggleA: () => onPair("bisque"),
                    onToggleB: () => onPair("glaze"),
                }),
                m(Chip, {
                    active: !!piece.firings.luster,
                    disabled: !state.firingToggles.luster,
                    onclick: () => togglePieceFiring(piece.id, "luster"),
                }, "Luster"),
            ),
            m(".piece-row__include-meta",
                m(PriceLabel, { computed, derived }),
            ),
        );
    },
};


/* ── Piece Row ──
   Header row: badge (multi-piece) · "Piece Dimensions" label ·
   comparison silhouette (right-justified, when dimensions yield one) ·
   remove X (multi-piece, far right). Single-piece mode skips both badge
   and X so the header collapses to label + comparison. */

interface PieceRowAttrs {
    computed: PieceComputed;
    derived: Derived;
    indexLabel: string | null;
    canRemove: boolean;
}

const PieceRow: m.Component<PieceRowAttrs> = {
    view: ({ attrs: { computed, derived, indexLabel, canRemove } }) => {
        const { piece, comparison, heightBelowMin } = computed;
        const studio = derived.studio;
        const hasMeta = !!comparison || canRemove;
        return m(".piece-row",
            m(".piece-row__header",
                indexLabel && m("span.piece-row__badge",
                    { "aria-hidden": "true" },
                    indexLabel),
                m("span.section-label", "Piece Dimensions"),
                hasMeta && m(".piece-row__header-meta",
                    comparison && m("span.piece-row__comparison",
                        m(Silhouette, { type: comparison.silhouette, size: 18 }),
                        m("span.piece-row__comparison-label", `≈ ${comparison.name}`),
                    ),
                    canRemove && m("button.piece-row__remove", {
                        type: "button",
                        "aria-label": indexLabel ? `Remove piece ${indexLabel}` : "Remove piece",
                        onclick: () => removePiece(piece.id),
                    }, xIcon(16)),
                ),
            ),
            m(Dimensions, { piece, derived, heightBelowMin }),
            heightBelowMin && m(".piece-row__warning",
                { role: "status", "aria-live": "polite" },
                `Billed at ${studio.minHeight} ${studio.dimensionUnit} (minimum height). Pieces shorter than this are charged at the minimum height.`,
            ),
            m(IncludeRow, { piece, computed, derived }),
        );
    },
};


/* ── Section Export ──
   Naked stack of piece rows on the page background, mirroring shrinkage's
   convention of inputs sitting directly on the page. The Add Piece button
   right-aligns at the end of the stack. */

export const PiecesSection: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const total = derived.pieces.length;
        const showIndex = total > 1;
        return m(".pieces-section",
            m(".pieces-stack",
                derived.pieces.map((computed, index) => m(PieceRow, {
                    key: computed.piece.id,
                    computed,
                    derived,
                    indexLabel: showIndex ? String(index + 1).padStart(2, "0") : null,
                    canRemove: total > 1,
                })),
            ),
            m(".pieces-add-row",
                m("button.add-piece", { type: "button", onclick: addPiece },
                    plusIcon(12),
                    m("span", "Add Piece"),
                ),
            ),
        );
    },
};

