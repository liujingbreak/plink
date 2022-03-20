import { Subject } from 'rxjs';
import { distinctUntilChanged, map, filter, tap, share } from 'rxjs/operators';
export function reselect(selectors, combine) {
    return src => {
        return src.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        map(s => selectors.map(selector => selector(s))), distinctUntilChanged((a, b) => a.every((result, i) => result === b[i])), map(results => combine(...results)));
    };
}
/**
 * create Stream of action stream and action dispatcher,
 * similar to redux-observable Epic concept,
 * What you can get from this function are:
 *   1. An action observable (stream),
 *      so that you can subscribe to it and react with fantastic Reactive operators
 *      to handle complex async logic
 *
 *   2. An action dispatcher,
 *      so that you can emit new action along with paramters (payload) back to action observale stream.
 *
 *   3. An RxJs "filter()" operator to filter action by its type, it provides better Typescript
 *   type definition for downstream action compare bare "filter()"
 */
export function createActionStream(actionCreator, debug) {
    const dispatcher = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const actionUpstream = new Subject();
    for (const type of Object.keys(actionCreator)) {
        dispatcher[type] = (...params) => {
            const action = {
                type,
                payload: params.length === 1 ? params[0] : params
            };
            actionUpstream.next(action);
        };
    }
    const action$ = debug
        ? actionUpstream.pipe(tap(action => {
            // eslint-disable-next-line no-console
            console.log('%c rx:action ', 'color: white; background: #8c61ff;', action.type);
        }), share())
        : actionUpstream;
    return {
        dispatcher,
        action$,
        ofType: createOfTypeOperator(actionCreator)
    };
}
/** create rx a operator to filter action by action.type */
function createOfTypeOperator(_actionCreator) {
    return (type) => (upstream) => {
        return upstream.pipe(filter(action => action.type === type));
    };
}
