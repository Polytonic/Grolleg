import type { ShapeMode } from "./state";


/** Reduced dimensions remain in the input unit. */
export const applyRate = (dimension: number, percent: number): number =>
    dimension * (1 - percent / 100);

/**
 * Original dimensions remain in the input unit.
 * A 100 percent rate follows normal division and returns Infinity.
 */
export const reverseRate = (dimension: number, percent: number): number =>
    dimension / (1 - percent / 100);

/**
 * Supported shapes produce volume in the input unit cubed.
 * Rectangles use length, width, and height. Cylinders use diameter and height.
 * Returns null for linear or incomplete shapes.
 */
export const calculateVolume = (dimensions: number[], shapeId: ShapeMode["id"]): number | null => {
    if (shapeId === "rectangle" && dimensions.length >= 3) return dimensions[0] * dimensions[1] * dimensions[2];
    if (shapeId === "cylinder" && dimensions.length >= 2) return Math.PI * (dimensions[0] / 2) ** 2 * dimensions[1];
    return null;
};

/**
 * Derives the firing-stage shrinkage that makes all stage factors match total shrinkage.
 * Stage factors compose as (1 - total) = (1 - greenware) * (1 - bisque) * (1 - firing).
 * Returns null when the stages imply negative firing shrinkage or create a zero denominator.
 */
export const deriveFiringPercent = (
    totalPercent: number,
    greenwarePercent: number,
    bisquePercent: number,
): number | null => {
    const factor = (1 - totalPercent / 100) /
        ((1 - greenwarePercent / 100) * (1 - bisquePercent / 100));
    if (Number.isFinite(factor) && factor > 0 && factor <= 1) return (1 - factor) * 100;
    return null;
};
