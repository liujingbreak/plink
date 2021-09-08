import { OperatorFunction } from 'rxjs';
/** A React useEffect() hook like operator function */
export declare function filterEffect<T>(dependecies: (current: T) => any[]): OperatorFunction<T, T>;
