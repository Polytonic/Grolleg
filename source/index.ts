import m from "mithril";
import { ShrinkageCalculator } from "./views/shrinkage-calculator/shrinkage-calculator";

// Single-page mount. The calculator owns the entire view, no routing needed.
m.mount(document.body, ShrinkageCalculator);
