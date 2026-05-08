import m from "mithril";
import { Silhouette } from "./silhouettes";
import { formatPrice, formatQuantity } from "./pricing";
import type { Derived } from "./derived";


// Cost Summary
// The result card should keep identity and comparison copy separate from the total.

export const CostSummary: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const { aggregate, studio, pieces, totalQuantityUnit } = derived;
        const pieceCount = pieces.length;
        const subtitle = aggregate.totalQuantity > 0
            ? `${pieceCount} piece${pieceCount === 1 ? "" : "s"} \u00b7 ${formatQuantity(aggregate.totalQuantity, studio.basis)} ${totalQuantityUnit}`
            : `${pieceCount} piece${pieceCount === 1 ? "" : "s"}`;

        // The aggregate comparison is suppressed for a single piece because
        // the per-piece row already shows the same silhouette, and "All
        // together" reads oddly when there's nothing to combine.
        const comparison = pieceCount > 1 ? aggregate.comparison : null;

        return m("section.cost-summary", { "aria-labelledby": "cost-summary__heading" },
            m(".cost-summary__identity",
                m("h2.cost-summary__label#cost-summary__heading", "Total"),
                comparison && m(".cost-summary__comparison",
                    m(Silhouette, { type: comparison.silhouette, size: 26 }),
                    m("span.cost-summary__comparison-label",
                        `All together ≈ ${comparison.name}`),
                ),
                m(".cost-summary__subtitle", subtitle),
            ),
            // role/aria-live announces the new total when it actually
            // changes. aria-atomic was dropped because Mithril's auto-
            // redraw fires on every keystroke, and atomic re-announcement
            // of the entire region on every redraw was extremely chatty.
            m(".cost-summary__amount",
                { role: "status", "aria-live": "polite", "aria-label": "Total price" },
                formatPrice(aggregate.total)),
        );
    },
};
