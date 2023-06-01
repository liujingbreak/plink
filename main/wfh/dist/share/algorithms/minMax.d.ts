/**
 * According to the book << Introduction to Algorithms, Third Edition >>, this algorithm
 * costs only (3/2n) time efficiency
 * @param items
 * @param comparator
 */
export declare function getMinAndMax<T = number>(items: Iterable<T>, comparator?: (a: T, b: T) => number): [T | undefined, T | undefined];
