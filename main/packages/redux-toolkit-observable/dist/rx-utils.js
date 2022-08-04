"use strict";
/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActionStreamByType = exports.createActionStream = void 0;
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
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
function createActionStream(actionCreator, debug) {
    const dispatcher = {};
    const actionUpstream = new rxjs_1.Subject();
    for (const type of Object.keys(actionCreator)) {
        dispatcher[type] = (...params) => {
            const action = {
                type,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                payload: params.length === 1 ? params[0] : params.length === 0 ? undefined : params
            };
            actionUpstream.next(action);
        };
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
        ofType: createOfTypeOperator(),
        isActionType: createIsActionTypeFn()
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
    function dispatchFactory(type) {
        if (Object.prototype.hasOwnProperty.call(dispatcher, type)) {
            return dispatcher[type];
        }
        const dispatch = (...params) => {
            const action = {
                type,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                payload: params.length === 1 ? params[0] : params.length === 0 ? undefined : params
            };
            actionUpstream.next(action);
        };
        dispatcher[type] = dispatch;
        return dispatch;
    }
    const dispatcherProxy = new Proxy({}, {
        get(target, key, rec) {
            return dispatchFactory(key);
        }
    });
    const debugName = typeof opt.debug === 'string' ? `[${opt.debug}]` : '';
    const action$ = opt.debug
        ? actionUpstream.pipe(opt.log ?
            (0, operators_1.tap)(action => opt.log(debugName + 'rx:action', action.type)) :
            typeof window !== 'undefined' ?
                (0, operators_1.tap)(action => {
                    // eslint-disable-next-line no-console
                    console.log(`%c ${debugName}rx:action `, 'color: white; background: #8c61ff;', action.type);
                })
                :
                    // eslint-disable-next-line no-console
                    (0, operators_1.tap)(action => console.log(debugName + 'rx:action', action.type)), (0, operators_1.share)())
        : actionUpstream;
    return {
        dispatcher: dispatcherProxy,
        dispatchFactory: dispatchFactory,
        action$,
        ofType: createOfTypeOperator(),
        isActionType: createIsActionTypeFn()
    };
}
exports.createActionStreamByType = createActionStreamByType;
function createIsActionTypeFn() {
    return function isActionType(action, type) {
        return action.type === type;
    };
}
/** create rx a operator to filter action by action.type */
function createOfTypeOperator() {
    return (...types) => (upstream) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return upstream.pipe((0, operators_1.filter)((action) => types.some((type) => action.type === type)), (0, operators_1.share)());
    };
}
//# sourceMappingURL=rx-utils.js.map