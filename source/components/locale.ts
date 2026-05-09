// Locale Utilities

// Parsing
const SIGN_CHARACTERS = ["-", "+"];
const EXPONENT_MARKERS = ["e", "E"];

const removeAll = (value: string, token: string): string =>
    value.split(token).join("");

const replaceFirst = (value: string, token: string, replacement: string): string => {
    const tokenIndex = value.indexOf(token);
    if (tokenIndex === -1) return value;
    return `${value.slice(0, tokenIndex)}${replacement}${value.slice(tokenIndex + token.length)}`;
};

const stripLeadingSign = (value: string): string =>
    SIGN_CHARACTERS.includes(value[0]) ? value.slice(1) : value;

const containsOnlyDigits = (value: string): boolean =>
    value !== "" && [...value].every((character) => character >= "0" && character <= "9");

const containsOnlyZeroDigits = (value: string): boolean =>
    [...value].every((character) => character === "0");

// Normalized mantissas should reject mixed separators before Number() sees them.
const isDecimalMantissa = (value: string): boolean => {
    const unsigned = stripLeadingSign(value);
    const decimalIndex = unsigned.indexOf(".");
    if (decimalIndex === -1) return containsOnlyDigits(unsigned);
    if (decimalIndex !== unsigned.lastIndexOf(".")) return false;

    const integerPart = unsigned.slice(0, decimalIndex);
    const fractionPart = unsigned.slice(decimalIndex + 1);
    const hasDigits = integerPart !== "" || fractionPart !== "";
    const integerValid = integerPart === "" || containsOnlyDigits(integerPart);
    const fractionValid = fractionPart === "" || containsOnlyDigits(fractionPart);
    return hasDigits && integerValid && fractionValid;
};

const isDecimalExponent = (value: string): boolean =>
    containsOnlyDigits(stripLeadingSign(value));

const splitExponent = (value: string): { mantissa: string; exponent?: string } | undefined => {
    let exponentIndex = -1;

    for (let index = 0; index < value.length; index += 1) {
        const character = value[index];
        if (!EXPONENT_MARKERS.includes(character)) continue;
        if (exponentIndex !== -1) return undefined;
        exponentIndex = index;
    }

    if (exponentIndex === -1) return { mantissa: value };
    return {
        mantissa: value.slice(0, exponentIndex),
        exponent: value.slice(exponentIndex + 1),
    };
};

const isNormalizedDecimal = (value: string): boolean => {
    const parts = splitExponent(value);
    if (!parts || !isDecimalMantissa(parts.mantissa)) return false;
    return parts.exponent === undefined || isDecimalExponent(parts.exponent);
};

const parseNormalizedNumber = (value: string): number =>
    isNormalizedDecimal(value) ? Number(value) : NaN;

const digitsAfter = (value: string, index: number): number =>
    value.length - index - 1;

// Non-zero integer input such as "1,234" should treat one comma as grouping.
const isGroupedCommaInteger = (value: string, commaIndex: number, dotIndex: number): boolean => {
    if (dotIndex !== -1 || digitsAfter(value, commaIndex) !== 3) return false;

    const integerPart = stripLeadingSign(value.slice(0, commaIndex));
    return !containsOnlyZeroDigits(integerPart);
};

const normalizeCommaDominantNumber = (value: string, commaIndex: number, dotIndex: number): string => {
    if (isGroupedCommaInteger(value, commaIndex, dotIndex)) return removeAll(value, ",");
    return replaceFirst(removeAll(value, "."), ",", ".");
};

// Comma and dot separators should normalize before decimal grammar validation.
export const parseLocaleNumber = (value: string): number => {
    const trimmed = value.trim();
    if (trimmed === "") return NaN;

    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");

    const normalized = lastComma > lastDot
        ? normalizeCommaDominantNumber(trimmed, lastComma, lastDot)
        : removeAll(trimmed, ",");
    return parseNormalizedNumber(normalized);
};


// Region Detection

const IMPERIAL_REGIONS = ["US", "LR", "MM"];

const region = (() => {
    try {
        return new Intl.Locale(globalThis.navigator?.language ?? "").region ?? "";
    } catch {
        // Missing or rejected locale identifiers should fall back to metric defaults.
        return "";
    }
})();

const isImperial = IMPERIAL_REGIONS.includes(region);

// Imperial regions should start with inches, while other regions start with centimeters.
export const detectDefaultDimensionUnit = (): "mm" | "cm" | "in" =>
    isImperial ? "in" : "cm";

// Imperial regions should start with pounds, while other regions start with kilograms.
export const detectDefaultWeightUnit = (): "g" | "kg" | "oz" | "lb" =>
    isImperial ? "lb" : "kg";


// Number Formatting
export const decimalFormat = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const ZERO_DISPLAY = decimalFormat.format(0);
const NEGATIVE_ZERO_DISPLAY = decimalFormat.format(-0);

// Finite values should show two decimals, while empty or invalid values use an en dash.
export const formatNumber = (value: number | null): string => {
    if (value === null || !Number.isFinite(value)) return "\u2013";

    const formatted = decimalFormat.format(value);
    return formatted === NEGATIVE_ZERO_DISPLAY ? ZERO_DISPLAY : formatted;
};


// Unit Labels
export const UNIT_VERBOSE = {
    mm: "millimeters",
    cm: "centimeters",
    in: "inches",
    g:  "grams",
    kg: "kilograms",
    oz: "ounces",
    lb: "pounds",
} as const;

// Unknown unit tokens should pass through for forward compatibility.
export const expandUnit = (unit: string): string =>
    (UNIT_VERBOSE as Record<string, string>)[unit] ?? unit;
