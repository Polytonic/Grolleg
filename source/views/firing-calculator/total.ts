import m from "mithril";
import { Silhouette } from "./comparison";
import type { Derived } from "./state";


// Aggregate quantity uses the same per-basis precision as per-piece quantity.
const formatTotalQuantity = (value: number, basis: string): string =>
    basis === "weight" ? value.toFixed(2) : value.toFixed(0);


/* ── Total Band ──
   Two-column layout: identity on the left (TOTAL label, comparison
   silhouette, piece-count subtitle), price on the right. Sits on top of a
   borderDark separator that visually severs the band from the cards above
   it (the result reads as a different layer of information than the
   configuration). The disclaimer follows centered below. */

export const TotalBand: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const { aggregate, studio, pieces, totalQuantityUnit } = derived;
        const pieceCount = pieces.length;
        const subtitle = aggregate.totalQuantity > 0
            ? `${pieceCount} piece${pieceCount === 1 ? "" : "s"} · ${formatTotalQuantity(aggregate.totalQuantity, studio.basis)} ${totalQuantityUnit}`
            : `${pieceCount} piece${pieceCount === 1 ? "" : "s"}`;

        return [
            m(".total-band",
                m(".total-band__identity",
                    m("span.total-band__label", "Total"),
                    aggregate.comparison && m(".total-band__comparison",
                        m(Silhouette, { type: aggregate.comparison.silhouette, size: 26 }),
                        m("span.total-band__comparison-label",
                            `All together ≈ ${aggregate.comparison.name}`),
                    ),
                    m(".total-band__subtitle", subtitle),
                ),
                m(".total-band__amount", `$${aggregate.total.toFixed(2)}`),
            ),
            m(".disclaimer", "Estimates only — actual billing may differ."),
        ];
    },
};
