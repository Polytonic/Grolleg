import m from "mithril";
import { ConnectedPill } from "../../components/connected-pill";
import { Silhouette } from "./comparison";
import {
    state, addPiece, removePiece, updatePiece,
    togglePieceFiring, togglePiecePair,
} from "./state";
import type { Derived, Piece, PieceComputed, FiringKey } from "./state";


/* ── Local Icons (Lucide, Transcribed for Mithril) ── */

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
   Smaller than the controls-card pill (12px font, 5px/11px padding).
   Inactive uses font-weight 400 to align with the suite's 400/600 weights
   (the Segoe UI 500 weight from the React prototype is intentionally
   omitted). Disabled state preserves underlying active/inactive coloring
   at 50% opacity so users can read which firing is logically on. */

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
                "aria-pressed": attrs.active,
                "aria-disabled": attrs.disabled || undefined,
                disabled: attrs.disabled,
                onclick: attrs.disabled ? undefined : attrs.onclick,
            },
            children,
        ),
};


/* ── Number Formatting ──
   Aggregate quantity: weight basis prints two decimals (small numbers like
   1.25 lb), volume/footprint prints whole numbers (large numbers like 240
   in³). Price always prints two decimals as a dollar amount. */

const formatPrice = (value: number): string => `$${value.toFixed(2)}`;
const formatQuantity = (value: number, basis: string): string =>
    basis === "weight" ? value.toFixed(2) : value.toFixed(0);


/* ── Header Line ──
   Badge (2+ pieces) · name input · price+qty subtitle · remove X (2+ pieces). */

interface PieceHeaderAttrs {
    piece: Piece;
    computed: PieceComputed;
    derived: Derived;
    indexLabel: string | null;
    canRemove: boolean;
}

const PieceHeader: m.Component<PieceHeaderAttrs> = {
    view: ({ attrs: { piece, computed, derived, indexLabel, canRemove } }) => {
        const { result, quantityUnit } = computed;
        const hasPrice = result.price > 0;
        return m(".piece-row__header",
            indexLabel && m("span.piece-row__badge", indexLabel),
            m("input.piece-row__name-input", {
                type: "text",
                placeholder: "Piece Name (Optional)",
                value: piece.name,
                "aria-label": `Piece ${indexLabel ?? ""} name`.trim(),
                oninput: (event: Event) => updatePiece(piece.id, {
                    name: (event.currentTarget as HTMLInputElement).value,
                }),
            }),
            m(".piece-row__subtitle",
                hasPrice
                    ? m("span.piece-row__subtitle-active",
                        m("span.piece-row__price", formatPrice(result.price)),
                        result.quantity > 0 && m("span.piece-row__quantity",
                            ` · ${formatQuantity(result.quantity, derived.studio.basis)} ${quantityUnit}`,
                        ),
                    )
                    : m("span.piece-row__price.zero", formatPrice(0)),
            ),
            canRemove && m("button.piece-row__remove", {
                type: "button",
                tabindex: -1,
                "aria-label": `Remove piece ${indexLabel ?? ""}`.trim(),
                onclick: () => removePiece(piece.id),
            }, xIcon(16)),
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
                m(".input-with-suffix",
                    m("input.input.numeric.with-suffix", {
                        type: "number",
                        inputmode: "decimal",
                        step: "0.1",
                        min: "0",
                        placeholder: "Weight",
                        "aria-label": "Weight",
                        value: piece.weight,
                        oninput: (event: Event) => updatePiece(piece.id, {
                            weight: (event.currentTarget as HTMLInputElement).value,
                        }),
                    }),
                    m("span.input-suffix", studio.weightUnit),
                ),
            );
        }
        const columns: { key: "L" | "W" | "H"; placeholder: string; warn?: boolean }[] = [
            { key: "L", placeholder: "L" },
            { key: "W", placeholder: "W" },
        ];
        if (studio.basis === "volume") {
            columns.push({ key: "H", placeholder: "H", warn: heightBelowMin });
        }
        return m(`.piece-row__dimensions.columns-${columns.length}`,
            columns.map((column) => m(".input-with-suffix", { key: column.key },
                m(`input.input.numeric.with-suffix${column.warn ? ".warn" : ""}`, {
                    type: "number",
                    inputmode: "decimal",
                    step: "0.1",
                    min: "0",
                    placeholder: column.placeholder,
                    "aria-label": column.placeholder === "L" ? "Length"
                                : column.placeholder === "W" ? "Width"
                                : "Height",
                    title: column.warn
                        ? `Billed at ${studio.minHeight} ${studio.dimensionUnit} (minimum height)`
                        : undefined,
                    value: piece[column.key],
                    oninput: (event: Event) => updatePiece(piece.id, {
                        [column.key]: (event.currentTarget as HTMLInputElement).value,
                    }),
                }),
                m("span.input-suffix", studio.dimensionUnit),
            )),
        );
    },
};


/* ── Include Chips ──
   ConnectedPill chip-size for the Bisque|Glaze pair (always rendered),
   followed by a separate Luster Chip. The pair's `connected` reflects ONLY
   the studio bundled flag, never the firing-active state. Earlier
   iteration gated `connected` on bundled+bisque+glaze, which broke the
   visual link when a user paired-off bisque/glaze under bundled. */

const IncludeChips: m.Component<{ piece: Piece }> = {
    view: ({ attrs: { piece } }) => {
        const onPair = (key: "bisque" | "glaze") =>
            state.bundled
                ? togglePiecePair(piece.id, key)
                : togglePieceFiring(piece.id, key);
        return m(".piece-row__include",
            m("span.piece-row__include-label", "Include"),
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
                onclick: () => togglePieceFiring(piece.id, "luster" as FiringKey),
            }, "Luster"),
        );
    },
};


/* ── Piece Row ── */

interface PieceRowAttrs {
    computed: PieceComputed;
    derived: Derived;
    indexLabel: string | null;
    canRemove: boolean;
}

const PieceRow: m.Component<PieceRowAttrs> = {
    view: ({ attrs: { computed, derived, indexLabel, canRemove } }) => {
        const { piece, comparison, heightBelowMin, quantityUnit } = computed;
        const studio = derived.studio;
        return m(".piece-row",
            m(PieceHeader, { piece, computed, derived, indexLabel, canRemove }),
            m(Dimensions, { piece, derived, heightBelowMin }),
            comparison && m(".piece-row__comparison",
                m(Silhouette, { type: comparison.silhouette, size: 20 }),
                m("span.piece-row__comparison-label", `≈ ${comparison.name}`),
            ),
            heightBelowMin && m(".piece-row__warning", { role: "note" },
                `Billed at ${studio.minHeight} ${studio.dimensionUnit} — minimum height. Pieces shorter than this are charged at the minimum height.`,
            ),
            m(IncludeChips, { piece }),
        );
    },
};


/* ── Card Export ── */

export const PiecesCard: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const total = derived.pieces.length;
        const showIndex = total > 1;
        return m("section.card", { "aria-label": "Pieces" },
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
                    plusIcon(14),
                    m("span", "Add Piece"),
                ),
            ),
        );
    },
};

// Re-export for tests that need to render PieceRow in isolation.
export { PieceRow };
