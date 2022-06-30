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
                type,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                payload: params.length === 1 ? params[0] : params
            };
            actionUpstream.next(action);
        };
        dispatcher[type] = dispatch;
        return dispatch;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicngtdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9yeC11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCwrQkFBeUM7QUFDekMsOENBQWtEO0FBZWxEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBSyxhQUFpQixFQUFFLEtBQWU7SUFDdkUsTUFBTSxVQUFVLEdBQUcsRUFBUSxDQUFDO0lBQzVCLE1BQU0sY0FBYyxHQUFHLElBQUksY0FBTyxFQUEwQyxDQUFDO0lBQzdFLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRTtRQUM3QyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQWEsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sTUFBTSxHQUFHO2dCQUNiLElBQUk7Z0JBQ0osbUVBQW1FO2dCQUNuRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTthQUNSLENBQUM7WUFDNUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUM7S0FDSDtJQUVELE1BQU0sT0FBTyxHQUFHLEtBQUs7UUFDbkIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ25CLElBQUEsZUFBRyxFQUFDLE9BQU8sTUFBTSxLQUFLLFdBQVc7WUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNULHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xGLENBQUM7WUFDRCxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDcEQsSUFBQSxpQkFBSyxHQUFFLENBQ1I7UUFDRCxDQUFDLENBQUMsY0FBYyxDQUFDO0lBRW5CLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTztRQUNQLE1BQU0sRUFBRSxvQkFBb0IsRUFBTTtRQUNsQyxZQUFZLEVBQUUsb0JBQW9CLEVBQU07S0FDekMsQ0FBQztBQUNKLENBQUM7QUFoQ0QsZ0RBZ0NDO0FBSUQ7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCx1REFBdUQ7QUFDdkQsU0FBZ0Isd0JBQXdCLENBQTJELE1BRy9GLEVBQUU7SUFDSixNQUFNLGNBQWMsR0FBRyxJQUFJLGNBQU8sRUFBMEMsQ0FBQztJQUM3RSxNQUFNLFVBQVUsR0FBRyxFQUFRLENBQUM7SUFFNUIsU0FBUyxlQUFlLENBQUMsSUFBYztRQUNyQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDMUQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekI7UUFDRCxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsTUFBYSxFQUFFLEVBQUU7WUFDcEMsTUFBTSxNQUFNLEdBQUc7Z0JBQ2IsSUFBSTtnQkFDSixtRUFBbUU7Z0JBQ25FLE9BQU8sRUFBRSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO2FBQ1IsQ0FBQztZQUM1QyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQztRQUNGLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUF3QixDQUFDO1FBQzVDLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3hFLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLO1FBQ3ZCLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNuQixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDUCxJQUFBLGVBQUcsRUFBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFJLENBQUMsU0FBUyxHQUFHLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ELE9BQU8sTUFBTSxLQUFLLFdBQVcsQ0FBQyxDQUFDO2dCQUM3QixJQUFBLGVBQUcsRUFBQyxNQUFNLENBQUMsRUFBRTtvQkFDYixzQ0FBc0M7b0JBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxTQUFTLFlBQVksRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlGLENBQUMsQ0FBQztnQkFDRixDQUFDO29CQUNELHNDQUFzQztvQkFDdEMsSUFBQSxlQUFHLEVBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxXQUFXLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQ3BFLElBQUEsaUJBQUssR0FBRSxDQUNSO1FBQ0QsQ0FBQyxDQUFDLGNBQWMsQ0FBQztJQUVuQixPQUFPO1FBQ0wsZUFBZSxFQUFFLGVBQWtEO1FBQ25FLE9BQU87UUFDUCxNQUFNLEVBQUUsb0JBQW9CLEVBQU07UUFDbEMsWUFBWSxFQUFFLG9CQUFvQixFQUFNO0tBQ3pDLENBQUM7QUFDSixDQUFDO0FBOUNELDREQThDQztBQWFELFNBQVMsb0JBQW9CO0lBQzNCLE9BQU8sU0FBUyxZQUFZLENBQXFCLE1BQXVCLEVBQUUsSUFBTztRQUMvRSxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDO0lBQzlCLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCwyREFBMkQ7QUFDM0QsU0FBUyxvQkFBb0I7SUFDM0IsT0FBTyxDQUFxQixHQUFHLEtBQVUsRUFBRSxFQUFFLENBQzNDLENBQUMsUUFBeUIsRUFBRSxFQUFFO1FBQzVCLHNFQUFzRTtRQUN0RSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBQSxrQkFBTSxFQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FFOUUsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIHJlZHV4LW9ic2VydmFibGUgbGlrZSBhc3luYyByZWFjdGl2ZSBhY3Rpb25zLCBzaWRlIGVmZmVjdCB1dGlsaXRpZXNcbiAqIGh0dHBzOi8vcmVkdXgtb2JzZXJ2YWJsZS5qcy5vcmcvXG4gKi9cblxuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7ZmlsdGVyLCB0YXAsIHNoYXJlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCB0eXBlIEFjdGlvblR5cGVzPEFDPiA9IHtcbiAgW0sgaW4ga2V5b2YgQUNdOiB7XG4gICAgdHlwZTogSztcbiAgICBwYXlsb2FkOiBBQ1tLXSBleHRlbmRzICgpID0+IGFueVxuICAgICAgPyB1bmRlZmluZWRcbiAgICAgIDogQUNbS10gZXh0ZW5kcyAocDogaW5mZXIgUCkgPT4gYW55XG4gICAgICAgID8gUFxuICAgICAgICA6IEFDW0tdIGV4dGVuZHMgKC4uLnA6IGluZmVyIFBBcnJheSkgPT4gYW55XG4gICAgICAgICAgPyBQQXJyYXlcbiAgICAgICAgICA6IHVua25vd247XG4gIH07XG59O1xuXG4vKipcbiAqIGNyZWF0ZSBTdHJlYW0gb2YgYWN0aW9uIHN0cmVhbSBhbmQgYWN0aW9uIGRpc3BhdGNoZXIsXG4gKiBzaW1pbGFyIHRvIHJlZHV4LW9ic2VydmFibGUgRXBpYyBjb25jZXB0LFxuICogV2hhdCB5b3UgY2FuIGdldCBmcm9tIHRoaXMgZnVuY3Rpb24gYXJlOlxuICogICAxLiBBbiBhY3Rpb24gb2JzZXJ2YWJsZSAoc3RyZWFtKSxcbiAqICAgICAgc28gdGhhdCB5b3UgY2FuIHN1YnNjcmliZSB0byBpdCBhbmQgcmVhY3Qgd2l0aCBmYW50YXN0aWMgUmVhY3RpdmUgb3BlcmF0b3JzXG4gKiAgICAgIHRvIGhhbmRsZSBjb21wbGV4IGFzeW5jIGxvZ2ljXG4gKlxuICogICAyLiBBbiBhY3Rpb24gZGlzcGF0Y2hlcixcbiAqICAgICAgc28gdGhhdCB5b3UgY2FuIGVtaXQgbmV3IGFjdGlvbiBhbG9uZyB3aXRoIHBhcmFtdGVycyAocGF5bG9hZCkgYmFjayB0byBhY3Rpb24gb2JzZXJ2YWxlIHN0cmVhbS5cbiAqXG4gKiAgIDMuIEFuIFJ4SnMgXCJmaWx0ZXIoKVwiIG9wZXJhdG9yIHRvIGZpbHRlciBhY3Rpb24gYnkgaXRzIHR5cGUsIGl0IHByb3ZpZGVzIGJldHRlciBUeXBlc2NyaXB0XG4gKiAgIHR5cGUgZGVmaW5pdGlvbiBmb3IgZG93bnN0cmVhbSBhY3Rpb24gY29tcGFyZSBiYXJlIFwiZmlsdGVyKClcIlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQWN0aW9uU3RyZWFtPEFDPihhY3Rpb25DcmVhdG9yOiBBQywgZGVidWc/OiBib29sZWFuKSB7XG4gIGNvbnN0IGRpc3BhdGNoZXIgPSB7fSBhcyBBQztcbiAgY29uc3QgYWN0aW9uVXBzdHJlYW0gPSBuZXcgU3ViamVjdDxBY3Rpb25UeXBlczxBQz5ba2V5b2YgQWN0aW9uVHlwZXM8QUM+XT4oKTtcbiAgZm9yIChjb25zdCB0eXBlIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3IpKSB7XG4gICAgZGlzcGF0Y2hlclt0eXBlXSA9ICguLi5wYXJhbXM6IGFueVtdKSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICAgICAgcGF5bG9hZDogcGFyYW1zLmxlbmd0aCA9PT0gMSA/IHBhcmFtc1swXSA6IHBhcmFtc1xuICAgICAgfSBhcyBBY3Rpb25UeXBlczxBQz5ba2V5b2YgQWN0aW9uVHlwZXM8QUM+XTtcbiAgICAgIGFjdGlvblVwc3RyZWFtLm5leHQoYWN0aW9uKTtcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgYWN0aW9uJCA9IGRlYnVnXG4gICAgPyBhY3Rpb25VcHN0cmVhbS5waXBlKFxuICAgICAgdGFwKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gYWN0aW9uID0+IHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCclYyByeDphY3Rpb24gJywgJ2NvbG9yOiB3aGl0ZTsgYmFja2dyb3VuZDogIzhjNjFmZjsnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgOiBhY3Rpb24gPT4gY29uc29sZS5sb2coJ3J4OmFjdGlvbicsIGFjdGlvbi50eXBlKSksXG4gICAgICBzaGFyZSgpXG4gICAgKVxuICAgIDogYWN0aW9uVXBzdHJlYW07XG5cbiAgcmV0dXJuIHtcbiAgICBkaXNwYXRjaGVyLFxuICAgIGFjdGlvbiQsXG4gICAgb2ZUeXBlOiBjcmVhdGVPZlR5cGVPcGVyYXRvcjxBQz4oKSxcbiAgICBpc0FjdGlvblR5cGU6IGNyZWF0ZUlzQWN0aW9uVHlwZUZuPEFDPigpXG4gIH07XG59XG5cbnR5cGUgU2ltcGxlQWN0aW9uRGlzcGF0Y2hGYWN0b3J5PEFDPiA9IDxLIGV4dGVuZHMga2V5b2YgQUM+KHR5cGU6IEspID0+IEFDW0tdO1xuXG4vKipcbiAqIFVubGlrZSBgY3JlYXRlQWN0aW9uU3RyZWFtKClgLCB0aGlzIGZ1bmN0aW9uIG9ubHkgbmVlZHMgYW4gXCJBY3Rpb24gY3JlYXRvclwiIHR5cGUgYXMgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcixcbiAqIGluc3RlYWQgb2YgYW4gYWN0dWFsIGVtcHR5IFwiQWN0aW9uIGNyZWF0b3JcIiBvYmplY3QgdG8gYmUgcGFyYW1ldGVyXG4gKlxuICogY3JlYXRlIFN0cmVhbSBvZiBhY3Rpb24gc3RyZWFtIGFuZCBhY3Rpb24gZGlzcGF0Y2hlcixcbiAqIHNpbWlsYXIgdG8gcmVkdXgtb2JzZXJ2YWJsZSBFcGljIGNvbmNlcHQsXG4gKiBXaGF0IHlvdSBjYW4gZ2V0IGZyb20gdGhpcyBmdW5jdGlvbiBhcmU6XG4gKiAgIDEuIEFuIGFjdGlvbiBvYnNlcnZhYmxlIChzdHJlYW0pLFxuICogICAgICBzbyB0aGF0IHlvdSBjYW4gc3Vic2NyaWJlIHRvIGl0IGFuZCByZWFjdCB3aXRoIGZhbnRhc3RpYyBSZWFjdGl2ZSBvcGVyYXRvcnNcbiAqICAgICAgdG8gaGFuZGxlIGNvbXBsZXggYXN5bmMgbG9naWNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gKiAgIDIuIEFuIGFjdGlvbiBkaXNwYXRjaGVyLFxuICogICAgICBzbyB0aGF0IHlvdSBjYW4gZW1pdCBuZXcgYWN0aW9uIGFsb25nIHdpdGggcGFyYW10ZXJzIChwYXlsb2FkKSBiYWNrIHRvIGFjdGlvbiBvYnNlcnZhbGUgc3RyZWFtLlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAqICAgMy4gQW4gUnhKcyBcImZpbHRlcigpXCIgb3BlcmF0b3IgdG8gZmlsdGVyIGFjdGlvbiBieSBpdHMgdHlwZSwgaXQgcHJvdmlkZXMgYmV0dGVyIFR5cGVzY3JpcHRcbiAqICAgdHlwZSBkZWZpbml0aW9uIGZvciBkb3duc3RyZWFtIGFjdGlvbiBjb21wYXJlIGJhcmUgXCJmaWx0ZXIoKVwiXG4gKi9cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBzcGFjZS1iZWZvcmUtZnVuY3Rpb24tcGFyZW5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBY3Rpb25TdHJlYW1CeVR5cGU8QUMgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCAoKC4uLnBheWxvYWQ6IGFueVtdKSA9PiB2b2lkKT4+KG9wdDoge1xuICBkZWJ1Zz86IHN0cmluZyB8IGJvb2xlYW47XG4gIGxvZz86IChtc2c6IHN0cmluZywgLi4ub2JqczogYW55W10pID0+IHVua25vd247XG59ID0ge30pIHtcbiAgY29uc3QgYWN0aW9uVXBzdHJlYW0gPSBuZXcgU3ViamVjdDxBY3Rpb25UeXBlczxBQz5ba2V5b2YgQWN0aW9uVHlwZXM8QUM+XT4oKTtcbiAgY29uc3QgZGlzcGF0Y2hlciA9IHt9IGFzIEFDO1xuXG4gIGZ1bmN0aW9uIGRpc3BhdGNoRmFjdG9yeSh0eXBlOiBrZXlvZiBBQykge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGlzcGF0Y2hlciwgdHlwZSkpIHtcbiAgICAgIHJldHVybiBkaXNwYXRjaGVyW3R5cGVdO1xuICAgIH1cbiAgICBjb25zdCBkaXNwYXRjaCA9ICguLi5wYXJhbXM6IGFueVtdKSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICAgICAgcGF5bG9hZDogcGFyYW1zLmxlbmd0aCA9PT0gMSA/IHBhcmFtc1swXSA6IHBhcmFtc1xuICAgICAgfSBhcyBBY3Rpb25UeXBlczxBQz5ba2V5b2YgQWN0aW9uVHlwZXM8QUM+XTtcbiAgICAgIGFjdGlvblVwc3RyZWFtLm5leHQoYWN0aW9uKTtcbiAgICB9O1xuICAgIGRpc3BhdGNoZXJbdHlwZV0gPSBkaXNwYXRjaCBhcyBBQ1trZXlvZiBBQ107XG4gICAgcmV0dXJuIGRpc3BhdGNoO1xuICB9XG5cbiAgY29uc3QgZGVidWdOYW1lID0gdHlwZW9mIG9wdC5kZWJ1ZyA9PT0gJ3N0cmluZycgPyBgWyR7b3B0LmRlYnVnfV1gIDogJyc7XG4gIGNvbnN0IGFjdGlvbiQgPSBvcHQuZGVidWdcbiAgICA/IGFjdGlvblVwc3RyZWFtLnBpcGUoXG4gICAgICBvcHQubG9nID9cbiAgICAgICAgdGFwKGFjdGlvbiA9PiBvcHQubG9nIShkZWJ1Z05hbWUgKyAncng6YWN0aW9uJywgYWN0aW9uLnR5cGUpKSA6XG4gICAgICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID9cbiAgICAgICAgICB0YXAoYWN0aW9uID0+IHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5sb2coYCVjICR7ZGVidWdOYW1lfXJ4OmFjdGlvbiBgLCAnY29sb3I6IHdoaXRlOyBiYWNrZ3JvdW5kOiAjOGM2MWZmOycsIGFjdGlvbi50eXBlKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIDpcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIHRhcChhY3Rpb24gPT4gY29uc29sZS5sb2coZGVidWdOYW1lICsgJ3J4OmFjdGlvbicsIGFjdGlvbi50eXBlKSksXG4gICAgICBzaGFyZSgpXG4gICAgKVxuICAgIDogYWN0aW9uVXBzdHJlYW07XG5cbiAgcmV0dXJuIHtcbiAgICBkaXNwYXRjaEZhY3Rvcnk6IGRpc3BhdGNoRmFjdG9yeSBhcyBTaW1wbGVBY3Rpb25EaXNwYXRjaEZhY3Rvcnk8QUM+LFxuICAgIGFjdGlvbiQsXG4gICAgb2ZUeXBlOiBjcmVhdGVPZlR5cGVPcGVyYXRvcjxBQz4oKSxcbiAgICBpc0FjdGlvblR5cGU6IGNyZWF0ZUlzQWN0aW9uVHlwZUZuPEFDPigpXG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT2ZUeXBlRm48QUM+IHtcbiAgPFQgZXh0ZW5kcyBrZXlvZiBBQz4odHlwZTogVCk6ICh1cHN0cmVhbTogT2JzZXJ2YWJsZTxhbnk+KSA9PiBPYnNlcnZhYmxlPEFjdGlvblR5cGVzPEFDPltUXT47XG4gIDxUIGV4dGVuZHMga2V5b2YgQUMsIFQyIGV4dGVuZHMga2V5b2YgQUM+KHR5cGU6IFQsIHR5cGUyOiBUMik6IChcbiAgICB1cHN0cmVhbTogT2JzZXJ2YWJsZTxhbnk+XG4gICkgPT4gT2JzZXJ2YWJsZTxBY3Rpb25UeXBlczxBQz5bVF0gfCBBY3Rpb25UeXBlczxBQz5bVDJdPjtcbiAgPFQgZXh0ZW5kcyBrZXlvZiBBQywgVDIgZXh0ZW5kcyBrZXlvZiBBQywgVDMgZXh0ZW5kcyBrZXlvZiBBQz4odHlwZTogVCwgdHlwZTI6IFQyLCB0eXBlMzogVDMpOiAoXG4gICAgdXBzdHJlYW06IE9ic2VydmFibGU8YW55PlxuICApID0+IE9ic2VydmFibGU8QWN0aW9uVHlwZXM8QUM+W1RdIHwgQWN0aW9uVHlwZXM8QUM+W1QyXSB8IEFjdGlvblR5cGVzPEFDPltUM10+O1xuICA8VCBleHRlbmRzIGtleW9mIEFDPiguLi50eXBlczogVFtdKTogKHVwc3RyZWFtOiBPYnNlcnZhYmxlPGFueT4pID0+IE9ic2VydmFibGU8QWN0aW9uVHlwZXM8QUM+W1RdPjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXNBY3Rpb25UeXBlRm48QUM+KCkge1xuICByZXR1cm4gZnVuY3Rpb24gaXNBY3Rpb25UeXBlPEsgZXh0ZW5kcyBrZXlvZiBBQz4oYWN0aW9uOiB7dHlwZTogdW5rbm93bn0sIHR5cGU6IEspOiBhY3Rpb24gaXMgQWN0aW9uVHlwZXM8QUM+W0tdIHtcbiAgICByZXR1cm4gYWN0aW9uLnR5cGUgPT09IHR5cGU7XG4gIH07XG59XG5cbi8qKiBjcmVhdGUgcnggYSBvcGVyYXRvciB0byBmaWx0ZXIgYWN0aW9uIGJ5IGFjdGlvbi50eXBlICovXG5mdW5jdGlvbiBjcmVhdGVPZlR5cGVPcGVyYXRvcjxBQz4oKTogT2ZUeXBlRm48QUM+IHtcbiAgcmV0dXJuIDxUIGV4dGVuZHMga2V5b2YgQUM+KC4uLnR5cGVzOiBUW10pID0+XG4gICAgKHVwc3RyZWFtOiBPYnNlcnZhYmxlPGFueT4pID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICAgIHJldHVybiB1cHN0cmVhbS5waXBlKGZpbHRlcihhY3Rpb24gPT4gdHlwZXMuc29tZSh0eXBlID0+IGFjdGlvbi50eXBlID09PSB0eXBlKSkpIGFzIE9ic2VydmFibGU8XG4gICAgICBBY3Rpb25UeXBlczxBQz5bVF1cbiAgICAgID47XG4gICAgfTtcbn1cbiJdfQ==