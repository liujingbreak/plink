import { distinctUntilChanged, map } from 'rxjs/operators';
export function reselect(selectors, combine) {
    return src => {
        return src.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        map(s => selectors.map(selector => selector(s))), distinctUntilChanged((a, b) => a.every((result, i) => result === b[i])), map(results => combine(...results)));
    };
}
