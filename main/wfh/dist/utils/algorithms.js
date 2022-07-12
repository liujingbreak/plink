"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinAndMax = void 0;
/**
 * According to the book << Introduction to Algorithms, Third Edition >>, this algorithm
 * costs only (3/2n) time efficiency
 * @param items
 * @param comparator
 */
function getMinAndMax(items, comparator = (a, b) => a - b) {
    let firstOfPair = null;
    let min;
    let max;
    for (const item of items) {
        if (firstOfPair != null) { // firstOfPair must be non-null
            const res = comparator(item, firstOfPair);
            let bigger;
            let smaller;
            if (res < 0) {
                bigger = firstOfPair;
                smaller = item;
            }
            else if (res >= 0) {
                bigger = item;
                smaller = firstOfPair;
            }
            if (min == null || smaller < min) {
                min = smaller;
            }
            if (max == null || bigger > max) {
                max = bigger;
            }
            firstOfPair = null;
        }
        else {
            firstOfPair = item;
        }
    }
    if (firstOfPair) {
        if (min == null || firstOfPair < min) {
            min = firstOfPair;
        }
        else if (max == null || firstOfPair > max) {
            max = firstOfPair;
        }
    }
    if (min != null && max == null)
        max = min;
    return [min, max];
}
exports.getMinAndMax = getMinAndMax;
//# sourceMappingURL=algorithms.js.map