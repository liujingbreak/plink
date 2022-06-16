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
// eslint-disable-next-line space-before-function-paren
function createActionStreamByType(opt = {}) {
    const actionUpstream = new rxjs_1.Subject();
    const dispatches = (type) => (...params) => {
        const action = {
            type: type,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            payload: params.length === 1 ? params[0] : params
        };
        actionUpstream.next(action);
    };
    const action$ = opt.debug
        ? actionUpstream.pipe((0, operators_1.tap)(typeof window !== 'undefined'
            ? action => {
                // eslint-disable-next-line no-console
                console.log('%c rx:action ', 'color: white; background: #8c61ff;', action.type);
            }
            : action => console.log('rx:action', action.type)), (0, operators_1.share)())
        : actionUpstream;
    return {
        dispatchFactory: dispatches,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicngtdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9yeC11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCwrQkFBeUM7QUFDekMsOENBQWtEO0FBZWxEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBSyxhQUFpQixFQUFFLEtBQWU7SUFDdkUsTUFBTSxVQUFVLEdBQUcsRUFBUSxDQUFDO0lBQzVCLE1BQU0sY0FBYyxHQUFHLElBQUksY0FBTyxFQUEwQyxDQUFDO0lBQzdFLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRTtRQUM3QyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQWEsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sTUFBTSxHQUFHO2dCQUNiLElBQUk7Z0JBQ0osbUVBQW1FO2dCQUNuRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTthQUNSLENBQUM7WUFDNUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUM7S0FDSDtJQUVELE1BQU0sT0FBTyxHQUFHLEtBQUs7UUFDbkIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ25CLElBQUEsZUFBRyxFQUFDLE9BQU8sTUFBTSxLQUFLLFdBQVc7WUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNULHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xGLENBQUM7WUFDRCxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDcEQsSUFBQSxpQkFBSyxHQUFFLENBQ1I7UUFDRCxDQUFDLENBQUMsY0FBYyxDQUFDO0lBRW5CLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTztRQUNQLE1BQU0sRUFBRSxvQkFBb0IsRUFBTTtRQUNsQyxZQUFZLEVBQUUsb0JBQW9CLEVBQU07S0FDekMsQ0FBQztBQUNKLENBQUM7QUFoQ0QsZ0RBZ0NDO0FBSUQsdURBQXVEO0FBQ3ZELFNBQWdCLHdCQUF3QixDQUEyRCxNQUF5QixFQUFFO0lBQzVILE1BQU0sY0FBYyxHQUFHLElBQUksY0FBTyxFQUEwQyxDQUFDO0lBQzdFLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsTUFBYSxFQUFFLEVBQUU7UUFDeEQsTUFBTSxNQUFNLEdBQUc7WUFDYixJQUFJLEVBQUUsSUFBZ0I7WUFDdEIsbUVBQW1FO1lBQ25FLE9BQU8sRUFBRSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO1NBQ1IsQ0FBQztRQUM1QyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQztJQUVGLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLO1FBQ3ZCLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNuQixJQUFBLGVBQUcsRUFBQyxPQUFPLE1BQU0sS0FBSyxXQUFXO1lBQy9CLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDVCxzQ0FBc0M7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsRixDQUFDO1lBQ0QsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQ3BELElBQUEsaUJBQUssR0FBRSxDQUNSO1FBQ0QsQ0FBQyxDQUFDLGNBQWMsQ0FBQztJQUVuQixPQUFPO1FBQ0wsZUFBZSxFQUFFLFVBQTZDO1FBQzlELE9BQU87UUFDUCxNQUFNLEVBQUUsb0JBQW9CLEVBQU07UUFDbEMsWUFBWSxFQUFFLG9CQUFvQixFQUFNO0tBQ3pDLENBQUM7QUFDSixDQUFDO0FBN0JELDREQTZCQztBQWFELFNBQVMsb0JBQW9CO0lBQzNCLE9BQU8sU0FBUyxZQUFZLENBQXFCLE1BQXVCLEVBQUUsSUFBTztRQUMvRSxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDO0lBQzlCLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCwyREFBMkQ7QUFDM0QsU0FBUyxvQkFBb0I7SUFDM0IsT0FBTyxDQUFxQixHQUFHLEtBQVUsRUFBRSxFQUFFLENBQzNDLENBQUMsUUFBeUIsRUFBRSxFQUFFO1FBQzVCLHNFQUFzRTtRQUN0RSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBQSxrQkFBTSxFQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FFOUUsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIHJlZHV4LW9ic2VydmFibGUgbGlrZSBhc3luYyByZWFjdGl2ZSBhY3Rpb25zLCBzaWRlIGVmZmVjdCB1dGlsaXRpZXNcbiAqIGh0dHBzOi8vcmVkdXgtb2JzZXJ2YWJsZS5qcy5vcmcvXG4gKi9cblxuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7ZmlsdGVyLCB0YXAsIHNoYXJlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCB0eXBlIEFjdGlvblR5cGVzPEFDPiA9IHtcbiAgW0sgaW4ga2V5b2YgQUNdOiB7XG4gICAgdHlwZTogSztcbiAgICBwYXlsb2FkOiBBQ1tLXSBleHRlbmRzICgpID0+IGFueVxuICAgICAgPyB1bmRlZmluZWRcbiAgICAgIDogQUNbS10gZXh0ZW5kcyAocDogaW5mZXIgUCkgPT4gYW55XG4gICAgICAgID8gUFxuICAgICAgICA6IEFDW0tdIGV4dGVuZHMgKC4uLnA6IGluZmVyIFBBcnJheSkgPT4gYW55XG4gICAgICAgICAgPyBQQXJyYXlcbiAgICAgICAgICA6IHVua25vd247XG4gIH07XG59O1xuXG4vKipcbiAqIGNyZWF0ZSBTdHJlYW0gb2YgYWN0aW9uIHN0cmVhbSBhbmQgYWN0aW9uIGRpc3BhdGNoZXIsXG4gKiBzaW1pbGFyIHRvIHJlZHV4LW9ic2VydmFibGUgRXBpYyBjb25jZXB0LFxuICogV2hhdCB5b3UgY2FuIGdldCBmcm9tIHRoaXMgZnVuY3Rpb24gYXJlOlxuICogICAxLiBBbiBhY3Rpb24gb2JzZXJ2YWJsZSAoc3RyZWFtKSxcbiAqICAgICAgc28gdGhhdCB5b3UgY2FuIHN1YnNjcmliZSB0byBpdCBhbmQgcmVhY3Qgd2l0aCBmYW50YXN0aWMgUmVhY3RpdmUgb3BlcmF0b3JzXG4gKiAgICAgIHRvIGhhbmRsZSBjb21wbGV4IGFzeW5jIGxvZ2ljXG4gKlxuICogICAyLiBBbiBhY3Rpb24gZGlzcGF0Y2hlcixcbiAqICAgICAgc28gdGhhdCB5b3UgY2FuIGVtaXQgbmV3IGFjdGlvbiBhbG9uZyB3aXRoIHBhcmFtdGVycyAocGF5bG9hZCkgYmFjayB0byBhY3Rpb24gb2JzZXJ2YWxlIHN0cmVhbS5cbiAqXG4gKiAgIDMuIEFuIFJ4SnMgXCJmaWx0ZXIoKVwiIG9wZXJhdG9yIHRvIGZpbHRlciBhY3Rpb24gYnkgaXRzIHR5cGUsIGl0IHByb3ZpZGVzIGJldHRlciBUeXBlc2NyaXB0XG4gKiAgIHR5cGUgZGVmaW5pdGlvbiBmb3IgZG93bnN0cmVhbSBhY3Rpb24gY29tcGFyZSBiYXJlIFwiZmlsdGVyKClcIlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQWN0aW9uU3RyZWFtPEFDPihhY3Rpb25DcmVhdG9yOiBBQywgZGVidWc/OiBib29sZWFuKSB7XG4gIGNvbnN0IGRpc3BhdGNoZXIgPSB7fSBhcyBBQztcbiAgY29uc3QgYWN0aW9uVXBzdHJlYW0gPSBuZXcgU3ViamVjdDxBY3Rpb25UeXBlczxBQz5ba2V5b2YgQWN0aW9uVHlwZXM8QUM+XT4oKTtcbiAgZm9yIChjb25zdCB0eXBlIG9mIE9iamVjdC5rZXlzKGFjdGlvbkNyZWF0b3IpKSB7XG4gICAgZGlzcGF0Y2hlclt0eXBlXSA9ICguLi5wYXJhbXM6IGFueVtdKSA9PiB7XG4gICAgICBjb25zdCBhY3Rpb24gPSB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICAgICAgcGF5bG9hZDogcGFyYW1zLmxlbmd0aCA9PT0gMSA/IHBhcmFtc1swXSA6IHBhcmFtc1xuICAgICAgfSBhcyBBY3Rpb25UeXBlczxBQz5ba2V5b2YgQWN0aW9uVHlwZXM8QUM+XTtcbiAgICAgIGFjdGlvblVwc3RyZWFtLm5leHQoYWN0aW9uKTtcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgYWN0aW9uJCA9IGRlYnVnXG4gICAgPyBhY3Rpb25VcHN0cmVhbS5waXBlKFxuICAgICAgdGFwKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gYWN0aW9uID0+IHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCclYyByeDphY3Rpb24gJywgJ2NvbG9yOiB3aGl0ZTsgYmFja2dyb3VuZDogIzhjNjFmZjsnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgOiBhY3Rpb24gPT4gY29uc29sZS5sb2coJ3J4OmFjdGlvbicsIGFjdGlvbi50eXBlKSksXG4gICAgICBzaGFyZSgpXG4gICAgKVxuICAgIDogYWN0aW9uVXBzdHJlYW07XG5cbiAgcmV0dXJuIHtcbiAgICBkaXNwYXRjaGVyLFxuICAgIGFjdGlvbiQsXG4gICAgb2ZUeXBlOiBjcmVhdGVPZlR5cGVPcGVyYXRvcjxBQz4oKSxcbiAgICBpc0FjdGlvblR5cGU6IGNyZWF0ZUlzQWN0aW9uVHlwZUZuPEFDPigpXG4gIH07XG59XG5cbnR5cGUgU2ltcGxlQWN0aW9uRGlzcGF0Y2hGYWN0b3J5PEFDPiA9IDxLIGV4dGVuZHMga2V5b2YgQUM+KHR5cGU6IEspID0+IEFDW0tdO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgc3BhY2UtYmVmb3JlLWZ1bmN0aW9uLXBhcmVuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQWN0aW9uU3RyZWFtQnlUeXBlPEFDIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgKCguLi5wYXlsb2FkOiBhbnlbXSkgPT4gdm9pZCk+PihvcHQ6IHtkZWJ1Zz86IGJvb2xlYW59ID0ge30pIHtcbiAgY29uc3QgYWN0aW9uVXBzdHJlYW0gPSBuZXcgU3ViamVjdDxBY3Rpb25UeXBlczxBQz5ba2V5b2YgQWN0aW9uVHlwZXM8QUM+XT4oKTtcbiAgY29uc3QgZGlzcGF0Y2hlcyA9ICh0eXBlOiBzdHJpbmcpID0+ICguLi5wYXJhbXM6IGFueVtdKSA9PiB7XG4gICAgY29uc3QgYWN0aW9uID0ge1xuICAgICAgdHlwZTogdHlwZSBhcyBrZXlvZiBBQyxcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICAgIHBheWxvYWQ6IHBhcmFtcy5sZW5ndGggPT09IDEgPyBwYXJhbXNbMF0gOiBwYXJhbXNcbiAgICB9IGFzIEFjdGlvblR5cGVzPEFDPltrZXlvZiBBY3Rpb25UeXBlczxBQz5dO1xuICAgIGFjdGlvblVwc3RyZWFtLm5leHQoYWN0aW9uKTtcbiAgfTtcblxuICBjb25zdCBhY3Rpb24kID0gb3B0LmRlYnVnXG4gICAgPyBhY3Rpb25VcHN0cmVhbS5waXBlKFxuICAgICAgdGFwKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gYWN0aW9uID0+IHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCclYyByeDphY3Rpb24gJywgJ2NvbG9yOiB3aGl0ZTsgYmFja2dyb3VuZDogIzhjNjFmZjsnLCBhY3Rpb24udHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgOiBhY3Rpb24gPT4gY29uc29sZS5sb2coJ3J4OmFjdGlvbicsIGFjdGlvbi50eXBlKSksXG4gICAgICBzaGFyZSgpXG4gICAgKVxuICAgIDogYWN0aW9uVXBzdHJlYW07XG5cbiAgcmV0dXJuIHtcbiAgICBkaXNwYXRjaEZhY3Rvcnk6IGRpc3BhdGNoZXMgYXMgU2ltcGxlQWN0aW9uRGlzcGF0Y2hGYWN0b3J5PEFDPixcbiAgICBhY3Rpb24kLFxuICAgIG9mVHlwZTogY3JlYXRlT2ZUeXBlT3BlcmF0b3I8QUM+KCksXG4gICAgaXNBY3Rpb25UeXBlOiBjcmVhdGVJc0FjdGlvblR5cGVGbjxBQz4oKVxuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9mVHlwZUZuPEFDPiB7XG4gIDxUIGV4dGVuZHMga2V5b2YgQUM+KHR5cGU6IFQpOiAodXBzdHJlYW06IE9ic2VydmFibGU8YW55PikgPT4gT2JzZXJ2YWJsZTxBY3Rpb25UeXBlczxBQz5bVF0+O1xuICA8VCBleHRlbmRzIGtleW9mIEFDLCBUMiBleHRlbmRzIGtleW9mIEFDPih0eXBlOiBULCB0eXBlMjogVDIpOiAoXG4gICAgdXBzdHJlYW06IE9ic2VydmFibGU8YW55PlxuICApID0+IE9ic2VydmFibGU8QWN0aW9uVHlwZXM8QUM+W1RdIHwgQWN0aW9uVHlwZXM8QUM+W1QyXT47XG4gIDxUIGV4dGVuZHMga2V5b2YgQUMsIFQyIGV4dGVuZHMga2V5b2YgQUMsIFQzIGV4dGVuZHMga2V5b2YgQUM+KHR5cGU6IFQsIHR5cGUyOiBUMiwgdHlwZTM6IFQzKTogKFxuICAgIHVwc3RyZWFtOiBPYnNlcnZhYmxlPGFueT5cbiAgKSA9PiBPYnNlcnZhYmxlPEFjdGlvblR5cGVzPEFDPltUXSB8IEFjdGlvblR5cGVzPEFDPltUMl0gfCBBY3Rpb25UeXBlczxBQz5bVDNdPjtcbiAgPFQgZXh0ZW5kcyBrZXlvZiBBQz4oLi4udHlwZXM6IFRbXSk6ICh1cHN0cmVhbTogT2JzZXJ2YWJsZTxhbnk+KSA9PiBPYnNlcnZhYmxlPEFjdGlvblR5cGVzPEFDPltUXT47XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUlzQWN0aW9uVHlwZUZuPEFDPigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGlzQWN0aW9uVHlwZTxLIGV4dGVuZHMga2V5b2YgQUM+KGFjdGlvbjoge3R5cGU6IHVua25vd259LCB0eXBlOiBLKTogYWN0aW9uIGlzIEFjdGlvblR5cGVzPEFDPltLXSB7XG4gICAgcmV0dXJuIGFjdGlvbi50eXBlID09PSB0eXBlO1xuICB9O1xufVxuXG4vKiogY3JlYXRlIHJ4IGEgb3BlcmF0b3IgdG8gZmlsdGVyIGFjdGlvbiBieSBhY3Rpb24udHlwZSAqL1xuZnVuY3Rpb24gY3JlYXRlT2ZUeXBlT3BlcmF0b3I8QUM+KCk6IE9mVHlwZUZuPEFDPiB7XG4gIHJldHVybiA8VCBleHRlbmRzIGtleW9mIEFDPiguLi50eXBlczogVFtdKSA9PlxuICAgICh1cHN0cmVhbTogT2JzZXJ2YWJsZTxhbnk+KSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICByZXR1cm4gdXBzdHJlYW0ucGlwZShmaWx0ZXIoYWN0aW9uID0+IHR5cGVzLnNvbWUodHlwZSA9PiBhY3Rpb24udHlwZSA9PT0gdHlwZSkpKSBhcyBPYnNlcnZhYmxlPFxuICAgICAgQWN0aW9uVHlwZXM8QUM+W1RdXG4gICAgICA+O1xuICAgIH07XG59XG4iXX0=