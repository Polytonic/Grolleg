import type { ShapeMode } from "./state";


export const applyRate = (dimension: number, percent: number): number =>
    dimension * (1 - percent / 100);

export const reverseRate = (dimension: number, percent: number): number =>
    dimension / (1 - percent / 100);

export const calculateVolume = (dimensions: number[], shapeId: ShapeMode["id"]): number | null => {
    if (shapeId === "rectangle" && dimensions.length >= 3) return dimensions[0] * dimensions[1] * dimensions[2];
    if (shapeId === "cylinder" && dimensions.length >= 2) return Math.PI * (dimensions[0] / 2) ** 2 * dimensions[1];
    return null;
};

// (1 - total) == (1 - greenware) * (1 - bisque) * (1 - firing).
// Guard against 0/0 (total=100 and a stage=100) producing NaN that slips past range checks.
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
