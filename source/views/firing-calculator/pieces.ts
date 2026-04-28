import m from "mithril";
import { ConnectedPill } from "../../components/connected-pill";
import { InputWithSuffix } from "../../components/input-with-suffix";
import { Silhouette } from "./comparison";
import {
    state, addPiece, removePiece, updatePiece,
    togglePieceFiring, togglePiecePair, expandUnit,
    formatPrice, formatQuantity,
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



/* ── Price Label ──
   Right-justified inside the Include row. Active price is accent
   coloured; $0 reads as muted so empty cards don't compete with
   priced ones in a stack. The price sits in the same row as the
   firings chips so it reads as "with these firings included, the
   piece costs $X." */

const PriceLabel: m.Component<{ computed: PieceComputed }> = {
    view: ({ attrs: { computed } }) => {
        const { result } = computed;
        const hasPrice = result.price > 0;
        return m("span.piece-row__price-block",
            m(`span.piece-row__price${hasPrice ? "" : ".zero"}`, formatPrice(result.price)),
        );
    },
};


/* ── Size Label ──
   Silhouette icon + comparison name + parenthetical quantity, right
   justified in the piece-row header (next to the Remove X when the
   row is removable). Renders any time the piece has valid dimensions
   (quantity > 0), independent of pricing or which firings are
   selected: toggling firings off shouldn't hide the dimensions the
   user just entered. When no comparison shape matches the
   dimensions, falls back to the bare quantity. */

const SizeLabel: m.Component<{ computed: PieceComputed; derived: Derived }> = {
    view: ({ attrs: { computed, derived } }) => {
        const { result, comparison, quantityUnit } = computed;
        if (result.quantity <= 0) return null;
        const size = `${formatQuantity(result.quantity, derived.studio.basis)} ${quantityUnit}`;
        if (comparison) {
            return m(".piece-row__size-block",
                m(Silhouette, { type: comparison.silhouette, size: 18 }),
                m("span", `≈ ${comparison.name} (${size})`),
            );
        }
        return m(".piece-row__size-block",
            m("span", size),
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
                        suffixSr: expandUnit(studio.weightUnit),
                        modifiers: ["numeric"],
                        id: `piece-${piece.id}-weight`,
                        type: "number",
                        inputmode: "decimal",
                        enterkeyhint: "done",
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
                    suffixSr: expandUnit(studio.dimensionUnit),
                    modifiers: column.warn ? ["numeric", "warn"] : ["numeric"],
                    id: `piece-${piece.id}-${column.key}`,
                    type: "number",
                    inputmode: "decimal",
                    enterkeyhint: "done",
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
   left. Price right-justified on the right. The size cluster
   (silhouette + comparison + qty) lives in the Piece Dimensions
   header row above, so this row reads as "with these firings
   included, the piece costs $X." The pair's `connected` reflects
   ONLY the studio bundled flag, never the per-piece firing-active
   state. */

interface IncludeRowAttrs {
    piece: Piece;
    computed: PieceComputed;
}

const IncludeRow: m.Component<IncludeRowAttrs> = {
    view: ({ attrs: { piece, computed } }) => {
        const onPair = (key: "bisque" | "glaze") =>
            state.bundled
                ? togglePiecePair(piece.id, key)
                : togglePieceFiring(piece.id, key);
        return m(".piece-row__include",
            { role: "group", "aria-label": "Firing inclusions and price" },
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
            m(PriceLabel, { computed }),
        );
    },
};


/* ── Piece Row ──
   Header row: badge (multi-piece) · "Piece Dimensions" label · size
   cluster (silhouette + comparison + qty, when dimensions are valid)
   · remove X (multi-piece, far right). The size cluster renders any
   time dimensions are valid, independent of firings, so a user
   toggling firings off doesn't lose visual confirmation of the
   dimensions they entered. Single-piece mode skips badge and remove
   X so the header collapses to label + size cluster. */

interface PieceRowAttrs {
    computed: PieceComputed;
    derived: Derived;
    indexLabel: string | null;
    canRemove: boolean;
}

const PieceRow: m.Component<PieceRowAttrs> = {
    view: ({ attrs: { computed, derived, indexLabel, canRemove } }) => {
        const { piece, heightBelowMin } = computed;
        const studio = derived.studio;
        return m(".piece-row",
            m(".piece-row__header",
                // The badge is the SR heading anchor in multi-piece mode
                // ("Piece 02") so heading-nav has somewhere to land
                // between the section h2 and the input controls.
                indexLabel && m("h3.piece-row__badge",
                    { "aria-label": `Piece ${indexLabel}` },
                    indexLabel),
                m("span.section-label", "Piece Dimensions"),
                m(".piece-row__header-meta",
                    m(SizeLabel, { computed, derived }),
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
                `Billed at ${studio.minHeight} ${studio.dimensionUnit} minimum. Shorter pieces are charged at this height.`,
            ),
            m(IncludeRow, { piece, computed }),
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
            m("h2.sr-only", "Pieces"),
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

