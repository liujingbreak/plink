"use strict";
/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameOfAction = exports.createActionStreamByType = exports.createActionStream = void 0;
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let SEQ = 0;
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
// eslint-disable-next-line space-before-function-paren
function createActionStream(actionCreator, debug) {
    const dispatcher = {};
    const actionUpstream = new rxjs_1.Subject();
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
        ? actionUpstream.pipe((0, operators_1.tap)(typeof window !== 'undefined'
            ? action => {
                // eslint-disable-next-line no-console
                console.log('%c rx:action ', 'color: white; background: #8c61ff;', action.type);
            }
            // eslint-disable-next-line no-console
            : action => console.log('rx:action', action.type)), (0, operators_1.share)())
        : actionUpstream;
    return {
        dispatcher,
        action$,
        ofType: createOfTypeOperator(typePrefix),
        isActionType: createIsActionTypeFn(typePrefix),
        nameOfAction: (action) => action.type.split('/')[1]
    };
}
exports.createActionStream = createActionStream;
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
function createActionStreamByType(opt = {}) {
    const actionUpstream = new rxjs_1.Subject();
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
    const emitByType = {};
    const actionsByType = {};
    let splitByTypeConnected = false;
    function actionOfType(type) {
        let a$ = actionsByType[type];
        if (a$ == null) {
            const emitter = new rxjs_1.Subject();
            emitByType[type] = emitter;
            a$ = actionsByType[type] = (0, rxjs_1.defer)(() => {
                if (!splitByTypeConnected) {
                    splitByTypeConnected = true;
                    action$.subscribe(action => {
                        const emitter = emitByType[action.type.split('/')[1]];
                        if (emitter) {
                            emitter.next(action);
                        }
                    });
                }
                return emitter;
            });
        }
        return a$;
    }
    const actionByTypeProxy = new Proxy({}, {
        get(_target, key, _rec) {
            return actionOfType(key);
        }
    });
    const debugName = typeof opt.debug === 'string' ? `[${typePrefix}${opt.debug}] ` : '';
    const interceptor$ = new rxjs_1.BehaviorSubject(null);
    function changeActionInterceptor(factory) {
        const newInterceptor = factory(interceptor$.getValue());
        interceptor$.next(newInterceptor);
    }
    const debuggableAction$ = opt.debug
        ? actionUpstream.pipe(opt.log ?
            (0, operators_1.tap)(action => opt.log(debugName + 'rx:action', action.type)) :
            typeof window !== 'undefined' ?
                (0, operators_1.tap)(action => {
                    // eslint-disable-next-line no-console
                    console.log(`%c ${debugName}rx:action `, 'color: white; background: #8c61ff;', action.type, action.payload);
                })
                :
                    // eslint-disable-next-line no-console
                    (0, operators_1.tap)(action => console.log(debugName + 'rx:action', action.type)), (0, operators_1.share)())
        : actionUpstream;
    const action$ = interceptor$.pipe((0, operators_1.switchMap)(interceptor => interceptor ?
        debuggableAction$.pipe(interceptor, (0, operators_1.share)()) :
        debuggableAction$));
    return {
        dispatcher: dispatcherProxy,
        dispatchFactory: dispatchFactory,
        action$,
        actionByType: actionByTypeProxy,
        actionOfType,
        changeActionInterceptor,
        ofType: createOfTypeOperator(typePrefix),
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
exports.createActionStreamByType = createActionStreamByType;
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
function nameOfAction(action) {
    return action.type.split('/')[1];
}
exports.nameOfAction = nameOfAction;
function createIsActionTypeFn(prefix) {
    return function isActionType(action, type) {
        return action.type === prefix + type;
    };
}
/** create rx a operator to filter action by action.type */
function createOfTypeOperator(typePrefix = '') {
    return (...types) => (upstream) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return upstream.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (0, operators_1.filter)((action) => types.some((type) => action.type === typePrefix + type)), (0, operators_1.share)());
    };
}
//# sourceMappingURL=rx-utils.js.map