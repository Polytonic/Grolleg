import m from "mithril";
import { Silhouette } from "./comparison";
import type { Derived } from "./state";


// Aggregate quantity uses the same per-basis precision as per-piece quantity.
const formatTotalQuantity = (value: number, basis: string): string =>
    basis === "weight" ? value.toFixed(2) : value.toFixed(0);


/* ── Total Band ──
   Two-column layout: identity on the left (label, comparison silhouette
   for two or more pieces, piece-count subtitle), price on the right.
   The orchestrator places a `.divider` immediately above this band so
   the configuration-to-result transition reads visually. */

export const TotalBand: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const { aggregate, studio, pieces, totalQuantityUnit } = derived;
        const pieceCount = pieces.length;
        const subtitle = aggregate.totalQuantity > 0
            ? `${pieceCount} piece${pieceCount === 1 ? "" : "s"} · ${formatTotalQuantity(aggregate.totalQuantity, studio.basis)} ${totalQuantityUnit}`
            : `${pieceCount} piece${pieceCount === 1 ? "" : "s"}`;

        // The aggregate comparison is suppressed for a single piece because
        // the per-piece row already shows the same silhouette, and "All
        // together" reads oddly when there's nothing to combine.
        const showAggregateComparison = aggregate.comparison && pieceCount > 1;

        return m("section.total-band", { "aria-labelledby": "total-band__heading" },
            m(".total-band__identity",
                m("h2.total-band__label#total-band__heading", "Total"),
                showAggregateComparison && m(".total-band__comparison",
                    m(Silhouette, { type: aggregate.comparison!.silhouette, size: 26 }),
                    m("span.total-band__comparison-label",
                        `All together ≈ ${aggregate.comparison!.name}`),
                ),
                m(".total-band__subtitle", subtitle),
            ),
            m(".total-band__amount",
                { role: "status", "aria-live": "polite", "aria-atomic": "true" },
                `$${aggregate.total.toFixed(2)}`),
        );
    },
};
