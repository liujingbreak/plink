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
                payload: params.length === 1 ? params[0] : params
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
                type: type,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                payload: params.length === 1 ? params[0] : params
            };
            actionUpstream.next(action);
        };
        dispatcher[type] = dispatch;
        return dispatch;
    }
    const action$ = opt.debug
        ? actionUpstream.pipe((0, operators_1.tap)(typeof window !== 'undefined'
            ? action => {
                // eslint-disable-next-line no-console
                console.log('%c rx:action ', 'color: white; background: #8c61ff;', action.type);
            }
            : action => console.log('rx:action', action.type)), (0, operators_1.share)())
        : actionUpstream;
    return {
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
        return upstream.pipe((0, operators_1.filter)(action => types.some(type => action.type === type)));
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicngtdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9yeC11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCwrQkFBeUM7QUFDekMsOENBQWtEO0FBZWxEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBSyxhQUFpQixFQUFFLEtBQWU7SUFDdkUsTUFBTSxVQUFVLEdBQUcsRUFBUSxDQUFDO0lBQzVCLE1BQU0sY0FBYyxHQUFHLElBQUksY0FBTyxFQUEwQyxDQUFDO0lBQzdFLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRTtRQUM3QyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQWEsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sTUFBTSxHQUFHO2dCQUNiLElBQUk7Z0JBQ0osbUVBQW1FO2dCQUNuRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTthQUNSLENBQUM7WUFDNUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUM7S0FDSDtJQUVELE1BQU0sT0FBTyxHQUFHLEtBQUs7UUFDbkIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ25CLElBQUEsZUFBRyxFQUFDLE9BQU8sTUFBTSxLQUFLLFdBQVc7WUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNULHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xGLENBQUM7WUFDRCxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxN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eW5jIHJlYWN0aXZlIGFjdGlvbnMsIHNpZGUgZWZmZWN0IHV0aWxpdGllc1xuICogaHR0cHM6Ly9yZWR1eC1vYnNlcnZhYmxlLmpzLm9yZy9cbiAqL1xuXG5pbXBvcnQge09ic2VydmFibGUsIFN1YmplY3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtmaWx0ZXIsIHRhcCwgc2hhcmV9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZXhwb3J0IHR5cGUgQWN0aW9uVHlwZXM8QUM+ID0ge1xuICBbSyBpbiBrZXlvZiBBQ106IHtcbiAgICB0eXBlOiBLO1xuICAgIHBheWxvYWQ6IEFDW0tdIGV4dGVuZHMgKCkgPT4gYW55XG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiBBQ1tLXSBleHRlbmRzIChwOiBpbmZlciBQKSA9PiBhbnlcbiAgICAgICAgPyBQXG4gICAgICAgIDogQUNbS10gZXh0ZW5kcyAoLi4ucDogaW5mZXIgUEFycmF5KSA9PiBhbnlcbiAgICAgICAgICA/IFBBcnJheVxuICAgICAgICAgIDogdW5rbm93bjtcbiAgfTtcbn07XG5cbi8qKlxuICogY3JlYXRlIFN0cmVhbSBvZiBhY3Rpb24gc3RyZWFtIGFuZCBhY3Rpb24gZGlzcGF0Y2hlcixcbiAqIHNpbWlsYXIgdG8gcmVkdXgtb2JzZXJ2YWJsZSBFcGljIGNvbmNlcHQsXG4gKiBXaGF0IHlvdSBjYW4gZ2V0IGZyb20gdGhpcyBmdW5jdGlvbiBhcmU6XG4gKiAgIDEuIEFuIGFjdGlvbiBvYnNlcnZhYmxlIChzdHJlYW0pLFxuICogICAgICBzbyB0aGF0IHlvdSBjYW4gc3Vic2NyaWJlIHRvIGl0IGFuZCByZWFjdCB3aXRoIGZhbnRhc3RpYyBSZWFjdGl2ZSBvcGVyYXRvcnNcbiAqICAgICAgdG8gaGFuZGxlIGNvbXBsZXggYXN5bmMgbG9naWNcbiAqXG4gKiAgIDIuIEFuIGFjdGlvbiBkaXNwYXRjaGVyLFxuICogICAgICBzbyB0aGF0IHlvdSBjYW4gZW1pdCBuZXcgYWN0aW9uIGFsb25nIHdpdGggcGFyYW10ZXJzIChwYXlsb2FkKSBiYWNrIHRvIGFjdGlvbiBvYnNlcnZhbGUgc3RyZWFtLlxuICpcbiAqICAgMy4gQW4gUnhKcyBcImZpbHRlcigpXCIgb3BlcmF0b3IgdG8gZmlsdGVyIGFjdGlvbiBieSBpdHMgdHlwZSwgaXQgcHJvdmlkZXMgYmV0dGVyIFR5cGVzY3JpcHRcbiAqICAgdHlwZSBkZWZpbml0aW9uIGZvciBkb3duc3RyZWFtIGFjdGlvbiBjb21wYXJlIGJhcmUgXCJmaWx0ZXIoKVwiXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBY3Rpb25TdHJlYW08QUM+KGFjdGlvbkNyZWF0b3I6IEFDLCBkZWJ1Zz86IGJvb2xlYW4pIHtcbiAgY29uc3QgZGlzcGF0Y2hlciA9IHt9IGFzIEFDO1xuICBjb25zdCBhY3Rpb25VcHN0cmVhbSA9IG5ldyBTdWJqZWN0PEFjdGlvblR5cGVzPEFDPltrZXlvZiBBY3Rpb25UeXBlczxBQz5dPigpO1xuICBmb3IgKGNvbnN0IHR5cGUgb2YgT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcikpIHtcbiAgICBkaXNwYXRjaGVyW3R5cGVdID0gKC4uLnBhcmFtczogYW55W10pID0+IHtcbiAgICAgIGNvbnN0IGFjdGlvbiA9IHtcbiAgICAgICAgdHlwZSxcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgICAgICBwYXlsb2FkOiBwYXJhbXMubGVuZ3RoID09PSAxID8gcGFyYW1zWzBdIDogcGFyYW1zXG4gICAgICB9IGFzIEFjdGlvblR5cGVzPEFDPltrZXlvZiBBY3Rpb25UeXBlczxBQz5dO1xuICAgICAgYWN0aW9uVXBzdHJlYW0ubmV4dChhY3Rpb24pO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBhY3Rpb24kID0gZGVidWdcbiAgICA/IGFjdGlvblVwc3RyZWFtLnBpcGUoXG4gICAgICB0YXAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgPyBhY3Rpb24gPT4ge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coJyVjIHJ4OmFjdGlvbiAnLCAnY29sb3I6IHdoaXRlOyBiYWNrZ3JvdW5kOiAjOGM2MWZmOycsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgfVxuICAgICAgICA6IGFjdGlvbiA9PiBjb25zb2xlLmxvZygncng6YWN0aW9uJywgYWN0aW9uLnR5cGUpKSxcbiAgICAgIHNoYXJlKClcbiAgICApXG4gICAgOiBhY3Rpb25VcHN0cmVhbTtcblxuICByZXR1cm4ge1xuICAgIGRpc3BhdGNoZXIsXG4gICAgYWN0aW9uJCxcbiAgICBvZlR5cGU6IGNyZWF0ZU9mVHlwZU9wZXJhdG9yPEFDPigpLFxuICAgIGlzQWN0aW9uVHlwZTogY3JlYXRlSXNBY3Rpb25UeXBlRm48QUM+KClcbiAgfTtcbn1cblxudHlwZSBTaW1wbGVBY3Rpb25EaXNwYXRjaEZhY3Rvcnk8QUM+ID0gPEsgZXh0ZW5kcyBrZXlvZiBBQz4odHlwZTogSykgPT4gQUNbS107XG5cbi8qKlxuICogVW5saWtlIGBjcmVhdGVBY3Rpb25TdHJlYW0oKWAsIHRoaXMgZnVuY3Rpb24gb25seSBuZWVkcyBhbiBcIkFjdGlvbiBjcmVhdG9yXCIgdHlwZSBhcyBnZW5lcmljIHR5cGUgcGFyYW1ldGVyLFxuICogaW5zdGVhZCBvZiBhbiBhY3R1YWwgZW1wdHkgXCJBY3Rpb24gY3JlYXRvclwiIG9iamVjdCB0byBiZSBwYXJhbWV0ZXJcbiAqXG4gKiBjcmVhdGUgU3RyZWFtIG9mIGFjdGlvbiBzdHJlYW0gYW5kIGFjdGlvbiBkaXNwYXRjaGVyLFxuICogc2ltaWxhciB0byByZWR1eC1vYnNlcnZhYmxlIEVwaWMgY29uY2VwdCxcbiAqIFdoYXQgeW91IGNhbiBnZXQgZnJvbSB0aGlzIGZ1bmN0aW9uIGFyZTpcbiAqICAgMS4gQW4gYWN0aW9uIG9ic2VydmFibGUgKHN0cmVhbSksXG4gKiAgICAgIHNvIHRoYXQgeW91IGNhbiBzdWJzY3JpYmUgdG8gaXQgYW5kIHJlYWN0IHdpdGggZmFudGFzdGljIFJlYWN0aXZlIG9wZXJhdG9yc1xuICogICAgICB0byBoYW5kbGUgY29tcGxleCBhc3luYyBsb2dpY1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAqICAgMi4gQW4gYWN0aW9uIGRpc3BhdGNoZXIsXG4gKiAgICAgIHNvIHRoYXQgeW91IGNhbiBlbWl0IG5ldyBhY3Rpb24gYWxvbmcgd2l0aCBwYXJhbXRlcnMgKHBheWxvYWQpIGJhY2sgdG8gYWN0aW9uIG9ic2VydmFsZSBzdHJlYW0uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICogICAzLiBBbiBSeEpzIFwiZmlsdGVyKClcIiBvcGVyYXRvciB0byBmaWx0ZXIgYWN0aW9uIGJ5IGl0cyB0eXBlLCBpdCBwcm92aWRlcyBiZXR0ZXIgVHlwZXNjcmlwdFxuICogICB0eXBlIGRlZmluaXRpb24gZm9yIGRvd25zdHJlYW0gYWN0aW9uIGNvbXBhcmUgYmFyZSBcImZpbHRlcigpXCJcbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHNwYWNlLWJlZm9yZS1mdW5jdGlvbi1wYXJlblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUFjdGlvblN0cmVhbUJ5VHlwZTxBQyBleHRlbmRzIFJlY29yZDxzdHJpbmcsICgoLi4ucGF5bG9hZDogYW55W10pID0+IHZvaWQpPj4ob3B0OiB7ZGVidWc/OiBib29sZWFufSA9IHt9KSB7XG4gIGNvbnN0IGFjdGlvblVwc3RyZWFtID0gbmV3IFN1YmplY3Q8QWN0aW9uVHlwZXM8QUM+W2tleW9mIEFjdGlvblR5cGVzPEFDPl0+KCk7XG4gIGNvbnN0IGRpc3BhdGNoZXIgPSB7fSBhcyBBQztcblxuICBmdW5jdGlvbiBkaXNwYXRjaEZhY3RvcnkodHlwZToga2V5b2YgQUMpIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGRpc3BhdGNoZXIsIHR5cGUpKSB7XG4gICAgICByZXR1cm4gZGlzcGF0Y2hlclt0eXBlXTtcbiAgICB9XG4gICAgY29uc3QgZGlzcGF0Y2ggPSAoLi4ucGFyYW1zOiBhbnlbXSkgPT4ge1xuICAgICAgY29uc3QgYWN0aW9uID0ge1xuICAgICAgICB0eXBlOiB0eXBlIGFzIGtleW9mIEFDLFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICAgIHBheWxvYWQ6IHBhcmFtcy5sZW5ndGggPT09IDEgPyBwYXJhbXNbMF0gOiBwYXJhbXNcbiAgICAgIH0gYXMgQWN0aW9uVHlwZXM8QUM+W2tleW9mIEFjdGlvblR5cGVzPEFDPl07XG4gICAgICBhY3Rpb25VcHN0cmVhbS5uZXh0KGFjdGlvbik7XG4gICAgfTtcbiAgICBkaXNwYXRjaGVyW3R5cGVdID0gZGlzcGF0Y2ggYXMgQUNba2V5b2YgQUNdO1xuICAgIHJldHVybiBkaXNwYXRjaDtcbiAgfVxuXG4gIGNvbnN0IGFjdGlvbiQgPSBvcHQuZGVidWdcbiAgICA/IGFjdGlvblVwc3RyZWFtLnBpcGUoXG4gICAgICB0YXAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgPyBhY3Rpb24gPT4ge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coJyVjIHJ4OmFjdGlvbiAnLCAnY29sb3I6IHdoaXRlOyBiYWNrZ3JvdW5kOiAjOGM2MWZmOycsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgfVxuICAgICAgICA6IGFjdGlvbiA9PiBjb25zb2xlLmxvZygncng6YWN0aW9uJywgYWN0aW9uLnR5cGUpKSxcbiAgICAgIHNoYXJlKClcbiAgICApXG4gICAgOiBhY3Rpb25VcHN0cmVhbTtcblxuICByZXR1cm4ge1xuICAgIGRpc3BhdGNoRmFjdG9yeTogZGlzcGF0Y2hGYWN0b3J5IGFzIFNpbXBsZUFjdGlvbkRpc3BhdGNoRmFjdG9yeTxBQz4sXG4gICAgYWN0aW9uJCxcbiAgICBvZlR5cGU6IGNyZWF0ZU9mVHlwZU9wZXJhdG9yPEFDPigpLFxuICAgIGlzQWN0aW9uVHlwZTogY3JlYXRlSXNBY3Rpb25UeXBlRm48QUM+KClcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPZlR5cGVGbjxBQz4ge1xuICA8VCBleHRlbmRzIGtleW9mIEFDPih0eXBlOiBUKTogKHVwc3RyZWFtOiBPYnNlcnZhYmxlPGFueT4pID0+IE9ic2VydmFibGU8QWN0aW9uVHlwZXM8QUM+W1RdPjtcbiAgPFQgZXh0ZW5kcyBrZXlvZiBBQywgVDIgZXh0ZW5kcyBrZXlvZiBBQz4odHlwZTogVCwgdHlwZTI6IFQyKTogKFxuICAgIHVwc3RyZWFtOiBPYnNlcnZhYmxlPGFueT5cbiAgKSA9PiBPYnNlcnZhYmxlPEFjdGlvblR5cGVzPEFDPltUXSB8IEFjdGlvblR5cGVzPEFDPltUMl0+O1xuICA8VCBleHRlbmRzIGtleW9mIEFDLCBUMiBleHRlbmRzIGtleW9mIEFDLCBUMyBleHRlbmRzIGtleW9mIEFDPih0eXBlOiBULCB0eXBlMjogVDIsIHR5cGUzOiBUMyk6IChcbiAgICB1cHN0cmVhbTogT2JzZXJ2YWJsZTxhbnk+XG4gICkgPT4gT2JzZXJ2YWJsZTxBY3Rpb25UeXBlczxBQz5bVF0gfCBBY3Rpb25UeXBlczxBQz5bVDJdIHwgQWN0aW9uVHlwZXM8QUM+W1QzXT47XG4gIDxUIGV4dGVuZHMga2V5b2YgQUM+KC4uLnR5cGVzOiBUW10pOiAodXBzdHJlYW06IE9ic2VydmFibGU8YW55PikgPT4gT2JzZXJ2YWJsZTxBY3Rpb25UeXBlczxBQz5bVF0+O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJc0FjdGlvblR5cGVGbjxBQz4oKSB7XG4gIHJldHVybiBmdW5jdGlvbiBpc0FjdGlvblR5cGU8SyBleHRlbmRzIGtleW9mIEFDPihhY3Rpb246IHt0eXBlOiB1bmtub3dufSwgdHlwZTogSyk6IGFjdGlvbiBpcyBBY3Rpb25UeXBlczxBQz5bS10ge1xuICAgIHJldHVybiBhY3Rpb24udHlwZSA9PT0gdHlwZTtcbiAgfTtcbn1cblxuLyoqIGNyZWF0ZSByeCBhIG9wZXJhdG9yIHRvIGZpbHRlciBhY3Rpb24gYnkgYWN0aW9uLnR5cGUgKi9cbmZ1bmN0aW9uIGNyZWF0ZU9mVHlwZU9wZXJhdG9yPEFDPigpOiBPZlR5cGVGbjxBQz4ge1xuICByZXR1cm4gPFQgZXh0ZW5kcyBrZXlvZiBBQz4oLi4udHlwZXM6IFRbXSkgPT5cbiAgICAodXBzdHJlYW06IE9ic2VydmFibGU8YW55PikgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgICAgcmV0dXJuIHVwc3RyZWFtLnBpcGUoZmlsdGVyKGFjdGlvbiA9PiB0eXBlcy5zb21lKHR5cGUgPT4gYWN0aW9uLnR5cGUgPT09IHR5cGUpKSkgYXMgT2JzZXJ2YWJsZTxcbiAgICAgIEFjdGlvblR5cGVzPEFDPltUXVxuICAgICAgPjtcbiAgICB9O1xufVxuIl19