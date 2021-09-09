import {OperatorFunction} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

/** A React useEffect() hook like operator function */
export function filterEffect<T, R extends any[]>(dependecies: (current: T) => R): OperatorFunction<T, R> {
  return (src) => {
    return src.pipe(
      map(s => dependecies(s)),
      distinctUntilChanged((deps1, deps2) => {
        if (deps1.length !== deps2.length) {
          return false;
        }
        return deps1.length === deps2.length && deps1.every((dep, i) => dep === deps2[i]);
      })
    );
  };
}
