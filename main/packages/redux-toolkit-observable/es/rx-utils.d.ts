import { OperatorFunction } from 'rxjs';
/** A React useEffect() hook like operator function */
export declare function filterEffect<T, R extends any[]>(dependecies: (current: T) => R): OperatorFunction<T, R>;
