import {OperatorFunction} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

export function reselect<T, R, R1, R2, R3, R4, R5>(selectors: [
  (current: T) => R1, (current: T) => R2, (current: T) => R3, (current: T) => R4, (current: T) => R5, ...((current: T) => any)[]
], combine: (...results: [R1, R2, R3, R4, R5, ...any[]]) => R): OperatorFunction<T, R> {
  return src => {
    return src.pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      map(s => selectors.map(selector => selector(s)) as [R1, R2, R3, R4, R5, ...any[]]),
      distinctUntilChanged((a, b) => a.every((result, i) => result === b[i])),
      map(results => combine(...results))
    );
  };
}
