import { distinctUntilChanged, map } from 'rxjs/operators';
/** A React useEffect() hook like operator function */
export function filterEffect(dependecies) {
    return (src) => {
        return src.pipe(map(s => dependecies(s)), distinctUntilChanged((deps1, deps2) => {
            if (deps1.length !== deps2.length) {
                return false;
            }
            return deps1.length === deps2.length && deps1.every((dep, i) => dep === deps2[i]);
        }));
    };
}
export function reselect(selectors, combine) {
    return src => {
        return src.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        map(s => selectors.map(selector => selector(s))), distinctUntilChanged((a, b) => a.every((result, i) => result === b[i])), map(results => combine(...results)));
    };
}
