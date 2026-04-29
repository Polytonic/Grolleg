/* ── Locale Utilities ──
   Shared locale-aware parsing, region detection, and number formatting.
   Centralizes locale logic so all tools handle international input and
   display consistently. */


/* ── Parsing ── */

// Normalizes locale number formats before parsing. Detects whether comma
// is a decimal or thousands separator based on position, then strips
// grouping separators and normalizes the decimal to a period.
export const parseLocaleNumber = (value: string): number => {
    const trimmed = value.trim();
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    if (lastComma > lastDot) {
        return parseFloat(trimmed.replaceAll(".", "").replace(",", "."));
    }
    return parseFloat(trimmed.replaceAll(",", ""));
};


/* ── Region Detection ──
   Intl.Locale provides a reliable region from any valid BCP 47 tag,
   unlike prefix matching which misclassifies en-CA as imperial.
   US, Liberia, and Myanmar are the imperial-leaning regions. */

const IMPERIAL_REGIONS = ["US", "LR", "MM"];

const region = (() => {
    try { return new Intl.Locale(navigator?.language ?? "").region ?? ""; }
    catch (_) { return ""; }
})();

const isImperial = IMPERIAL_REGIONS.includes(region);

export const detectDefaultDimensionUnit = (): "mm" | "cm" | "in" =>
    isImperial ? "in" : "cm";

export const detectDefaultWeightUnit = (): "g" | "kg" | "oz" | "lb" =>
    isImperial ? "lb" : "kg";


/* ── Number Formatting ── */

export const decimalFormat = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// Locale-aware 2-decimal format. En dash signals empty or invalid state,
// distinguishing it from zero.
export const formatNumber = (value: number | null): string =>
    value !== null && Number.isFinite(value) ? decimalFormat.format(value) : "\u2013";


/* ── Unit Labels ── */

export const UNIT_VERBOSE: Record<string, string> = {
    mm: "millimeters",
    cm: "centimeters",
    in: "inches",
    g:  "grams",
    kg: "kilograms",
    oz: "ounces",
    lb: "pounds",
};

export const expandUnit = (unit: string): string =>
    UNIT_VERBOSE[unit] ?? unit;
