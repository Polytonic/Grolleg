import m from "mithril";
import { ConnectedPill } from "../../components/connected-pill";
import { xIcon, plusIcon } from "../../components/icons";
import { InputWithSuffix } from "../../components/input-with-suffix";
import { TogglePill } from "../../components/toggle-pill";
import { Silhouette } from "./silhouettes";
import { expandUnit } from "../../components/locale";
import type { Piece } from "./types";
import { formatPrice, formatQuantity } from "./pricing";
import {
    state, addPiece, removePiece, updatePiece,
    togglePieceFiring, togglePiecePair,
} from "./state";
import type { Derived, PieceComputed } from "./derived";

// Price Label
// PriceLabel should sit in the Include row so the price reads as the result of
// the selected firing chips.

const PriceLabel: m.Component<{ computed: PieceComputed }> = {
    view: ({ attrs: { computed } }) => {
        const { result } = computed;
        const hasPrice = result.price > 0;
        return m("span.piece-row__price-block",
            m(`span.piece-row__price${hasPrice ? "" : ".zero"}`, formatPrice(result.price)),
        );
    },
};


// Size Label
// SizeLabel should show valid dimensions independent of firing selection, so
// toggling firings off does not hide the entered size.

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


// Dimension Inputs
// Dimensions should render only the fields that the active billing basis needs.

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
                        type: "text",
                        inputmode: "decimal",
                        enterkeyhint: "done",
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
                    type: "text",
                    inputmode: "decimal",
                    enterkeyhint: "done",
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


// Include Row
// IncludeRow should keep firing chips and price together while the size cluster
// stays in the Piece Dimensions header.

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
                    aActive: piece.firings.bisque,
                    bActive: piece.firings.glaze,
                    aLabel: "Bisque",
                    bLabel: "Glaze",
                    aDisabled: !state.firingToggles.bisque,
                    bDisabled: !state.firingToggles.glaze,
                    onToggleA: () => onPair("bisque"),
                    onToggleB: () => onPair("glaze"),
                }),
                m(TogglePill, {
                    className: "chip",
                    active: piece.firings.luster,
                    disabled: !state.firingToggles.luster,
                    onclick: () => togglePieceFiring(piece.id, "luster"),
                }, "Luster"),
            ),
            m(PriceLabel, { computed }),
        );
    },
};


// Piece Row
// PieceRow should collapse single-piece headers and reserve badges plus remove
// buttons for multi-piece mode.

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
                // The badge should anchor screen-reader heading navigation in
                // multi-piece mode.
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


// Section Export
// PiecesSection should keep piece rows directly on the page background and
// right-align the Add Piece button at the end.

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
                m("button.add-piece", { id: "add-piece-button", type: "button", onclick: addPiece },
                    plusIcon(12),
                    m("span", "Add Piece"),
                ),
            ),
        );
    },
};
