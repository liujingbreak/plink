/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */
import { Subject, BehaviorSubject } from 'rxjs';
import { switchMap, filter, map, tap, share } from 'rxjs/operators';
let SEQ = 0;
/**
 * @Deprecated
 * Use createActionStreamByType<R>() instead.
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
// eslint-disable-next-line space-before-function-paren
export function createActionStream(actionCreator, debug) {
    const dispatcher = {};
    const actionUpstream = new Subject();
    const typePrefix = SEQ++ + '/';
    for (const type of Object.keys(actionCreator)) {
        const dispatch = (...params) => {
            const action = {
                type: typePrefix + type,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                payload: params.length === 1 ? params[0] : params.length === 0 ? undefined : params
            };
            actionUpstream.next(action);
        };
        dispatcher[type] = dispatch;
    }
    const action$ = debug
        ? actionUpstream.pipe(tap(typeof window !== 'undefined'
            ? action => {
                // eslint-disable-next-line no-console
                console.log('%c rx:action ', 'color: white; background: #8c61ff;', action.type);
            }
            // eslint-disable-next-line no-console
            : action => console.log('rx:action', action.type)), share())
        : actionUpstream;
    return {
        dispatcher,
        action$,
        ofType: createOfTypeOperator(typePrefix),
        isActionType: createIsActionTypeFn(typePrefix),
        nameOfAction: (action) => action.type.split('/')[1]
    };
}
/**
 * Unlike `createActionStream()`, this function only needs an "Action creator" type as generic type parameter,
 * instead of an actual empty "Action creator" object to be parameter
 *
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
// eslint-disable-next-line space-before-function-paren
export function createActionStreamByType(opt = {}) {
    const actionUpstream = new Subject();
    const dispatcher = {};
    const typePrefix = SEQ++ + '/';
    function dispatchFactory(type) {
        if (Object.prototype.hasOwnProperty.call(dispatcher, type)) {
            return dispatcher[type];
        }
        const dispatch = (...params) => {
            const action = {
                type: typePrefix + type,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                payload: params.length === 1 ? params[0] : params.length === 0 ? undefined : params
            };
            actionUpstream.next(action);
        };
        dispatcher[type] = dispatch;
        return dispatch;
    }
    const dispatcherProxy = new Proxy({}, {
        get(_target, key, _rec) {
            return dispatchFactory(key);
        }
    });
    const actionsByType = {};
    const payloadsByType = {};
    const ofType = createOfTypeOperator(typePrefix);
    function actionOfType(type) {
        let a$ = actionsByType[type];
        if (a$ == null) {
            a$ = actionsByType[type] = action$.pipe(ofType(type));
        }
        return a$;
    }
    const actionByTypeProxy = new Proxy({}, {
        get(_target, key, _rec) {
            return actionOfType(key);
        }
    });
    const payloadByTypeProxy = new Proxy({}, {
        get(_target, key, _rec) {
            let p$ = payloadsByType[key];
            if (p$ == null) {
                const matchType = typePrefix + key;
                p$ = payloadsByType[key] = action$.pipe(filter(({ type }) => type === matchType), 
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                map(action => action.payload), share());
            }
            return p$;
        }
    });
    const debugName = typeof opt.debug === 'string' ? `[${typePrefix}${opt.debug}] ` : typePrefix;
    const interceptor$ = new BehaviorSubject(null);
    function changeActionInterceptor(factory) {
        const newInterceptor = factory(interceptor$.getValue());
        interceptor$.next(newInterceptor);
    }
    const debuggableAction$ = opt.debug
        ? actionUpstream.pipe(opt.log ?
            tap(action => opt.log(debugName + 'rx:action', nameOfAction(action))) :
            (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                tap(action => {
                    // eslint-disable-next-line no-console
                    console.log(`%c ${debugName}rx:action `, 'color: white; background: #8c61ff;', nameOfAction(action), action.payload === undefined ? '' : action.payload);
                })
                :
                    // eslint-disable-next-line no-console
                    tap(action => console.log(debugName + 'rx:action', nameOfAction(action), action.payload === undefined ? '' : action.payload)), share())
        : actionUpstream;
    const action$ = interceptor$.pipe(switchMap(interceptor => interceptor ?
        debuggableAction$.pipe(interceptor, share()) :
        debuggableAction$));
    return {
        dispatcher: dispatcherProxy,
        dispatchFactory: dispatchFactory,
        action$,
        payloadByType: payloadByTypeProxy,
        actionByType: actionByTypeProxy,
        actionOfType,
        changeActionInterceptor,
        ofType,
        isActionType: createIsActionTypeFn(typePrefix),
        nameOfAction: (action) => nameOfAction(action),
        _actionFromObject(obj) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            actionUpstream.next({ type: typePrefix + obj.t, payload: obj.p });
        },
        _actionToObject(action) {
            return { t: nameOfAction(action), p: action.payload };
        }
    };
}
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
export function nameOfAction(action) {
    return action.type.split('/')[1];
}
function createIsActionTypeFn(prefix) {
    return function isActionType(action, type) {
        return action.type === prefix + type;
    };
}
/** create rx a operator to filter action by action.type */
function createOfTypeOperator(typePrefix = '') {
    return (...types) => (upstream) => {
        const matchTypes = types.map(type => typePrefix + type);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return upstream.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        filter((action) => matchTypes.some(type => action.type === type)), share());
    };
}
//# sourceMappingURL=rx-utils.js.map