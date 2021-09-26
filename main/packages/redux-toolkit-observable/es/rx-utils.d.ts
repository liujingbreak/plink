import { OperatorFunction } from 'rxjs';
export declare function reselect<T, R, R1, R2, R3, R4, R5>(selectors: [
    (current: T) => R1,
    (current: T) => R2,
    (current: T) => R3,
    (current: T) => R4,
    (current: T) => R5,
    ...((current: T) => any)[]
], combine: (...results: [R1, R2, R3, R4, R5, ...any[]]) => R): OperatorFunction<T, R>;
