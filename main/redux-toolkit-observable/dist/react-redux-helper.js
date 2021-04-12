"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoreOfStateFactory = void 0;
var react_1 = require("react");
// let COMPONENT_ID = 0;
/**
 * Use "state" in React rendering template, use `getState()` to get current computed state from Redux Store,
 * be aware, `state` might not be the same as returned value of `getState()` at some moments.
 *
 * @param name
 * @param sliceFactory
 */
// export function useInternalReduxForComponent<S extends {[prop: string]: any}, R extends SliceCaseReducers<S>, Name extends string>(
//   opt: CreateSliceOptions<S, R, Name> & {epicFactory?: EpicFactory<S, R, Name>}): [state: S, slice: Slice<S, R & ExtraSliceReducers<S>, Name>] {
//   const resourceMap = useMemo(() => new ResourceMap(), []);
//   const [reactState, setReactState] = useState<S>();
//   useEffect(() => {
//     const compId = COMPONENT_ID++;
//     let existingSlice = existingSliceMap.get(opt.name) as SliceData<{[compId: string]: S}, {}>;
//     if (existingSlice == null) {
//       const newReducers = {} as CreateSliceOptions<{[compId: string]: S}, R, Name>['reducers'];
//       for (const [caseName, reducer] of Object.entries(opt.reducers)) {
//         newReducers[caseName as keyof R] = function(s: {[compId: string]: S}, action: PayloadAction<any>) {
//           return (reducer as any)(s[compId], action) as  {[compId: string]: S};
//         } as any;
//       }
//       const slice = stateFactory.newSlice({
//         name: opt.name,
//         initialState: {[opt.name]: {[compId]: opt.initialState}} as {[compId: string]: S},
//         reducers: newReducers
//       });
//       const actionDispatcher = stateFactory.bindActionCreators(slice);
//       const store = stateFactory.sliceStore(slice);
//       const getState = () => stateFactory.sliceState(slice);
//       existingSlice = {slice, actionDispatcher, store, getState, epicFactory: opt.epicFactory};
//       existingSliceMap.set(opt.name, existingSlice);
//     } else {
//       const sliceData: SliceData<{[compId: string]: S}, {}> = existingSlice;
//       sliceData.actionDispatcher._change((draft) => {
//         s[compId] = opt.initialState;
//       });
//     }
//     if (opt.epicFactory) {
//       // const epic = opt.epicFactory(existingSlice.slice)
//       // stateFactory.addEpic()
//     }
//     return () => {
//       const sliceData: SliceData<{[compId: string]: S}, {}> = existingSlice;
//       sliceData.actionDispatcher._change((draft) => {
//         delete s[compId];
//       });
//     };
//   }, []);
//   return {...toolkit, state: reactState};
// }
function useStoreOfStateFactory(stateFactory) {
    var _a = react_1.useState(undefined), reduxStore = _a[0], setReduxStore = _a[1];
    react_1.useEffect(function () {
        stateFactory.store$.subscribe({
            next: function (store) {
                setReduxStore(store);
            }
        });
    }, [stateFactory.getRootStore()]);
    return reduxStore;
}
exports.useStoreOfStateFactory = useStoreOfStateFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3QtcmVkdXgtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVhY3QtcmVkdXgtaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQU9BLCtCQUEwQztBQThCMUMsd0JBQXdCO0FBQ3hCOzs7Ozs7R0FNRztBQUNILHNJQUFzSTtBQUN0SSxtSkFBbUo7QUFDbkosOERBQThEO0FBQzlELHVEQUF1RDtBQUV2RCxzQkFBc0I7QUFDdEIscUNBQXFDO0FBQ3JDLGtHQUFrRztBQUNsRyxtQ0FBbUM7QUFDbkMsa0dBQWtHO0FBQ2xHLDBFQUEwRTtBQUMxRSw4R0FBOEc7QUFDOUcsa0ZBQWtGO0FBQ2xGLG9CQUFvQjtBQUNwQixVQUFVO0FBQ1YsOENBQThDO0FBQzlDLDBCQUEwQjtBQUMxQiw2RkFBNkY7QUFDN0YsZ0NBQWdDO0FBQ2hDLFlBQVk7QUFDWix5RUFBeUU7QUFDekUsc0RBQXNEO0FBQ3RELCtEQUErRDtBQUMvRCxrR0FBa0c7QUFDbEcsdURBQXVEO0FBQ3ZELGVBQWU7QUFDZiwrRUFBK0U7QUFDL0Usd0RBQXdEO0FBQ3hELHdDQUF3QztBQUN4QyxZQUFZO0FBQ1osUUFBUTtBQUVSLDZCQUE2QjtBQUM3Qiw2REFBNkQ7QUFDN0Qsa0NBQWtDO0FBQ2xDLFFBQVE7QUFFUixxQkFBcUI7QUFDckIsK0VBQStFO0FBQy9FLHdEQUF3RDtBQUN4RCw0QkFBNEI7QUFDNUIsWUFBWTtBQUNaLFNBQVM7QUFDVCxZQUFZO0FBRVosNENBQTRDO0FBQzVDLElBQUk7QUFFSixTQUFnQixzQkFBc0IsQ0FBQyxZQUEwQjtJQUN6RCxJQUFBLEtBQThCLGdCQUFRLENBQTJDLFNBQVMsQ0FBQyxFQUExRixVQUFVLFFBQUEsRUFBRSxhQUFhLFFBQWlFLENBQUM7SUFDbEcsaUJBQVMsQ0FBQztRQUNSLFlBQVksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO1lBQzVCLElBQUksWUFBQyxLQUFLO2dCQUNSLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QixDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBRUwsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUVsQyxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBWkQsd0RBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0luZmVyYWJsZUNvbXBvbmVudEVuaGFuY2VyV2l0aFByb3BzfSBmcm9tICdyZWFjdC1yZWR1eCc7XG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgU2xpY2UsIFBheWxvYWRBY3Rpb24sIFNsaWNlQ2FzZVJlZHVjZXJzLy8gLCBFeHRyYVNsaWNlUmVkdWNlcnNcbn0gZnJvbSAnLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuLy8gaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4vc3RhdGUtZmFjdG9yeS1icm93c2VyJztcbmltcG9ydCB7RXBpY30gZnJvbSAncmVkdXgtb2JzZXJ2YWJsZSc7XG4vLyBpbXBvcnQge0NyZWF0ZVNsaWNlT3B0aW9uc30gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge1Jlc291cmNlTWFwfSBmcm9tICcuL3Jlc291cmNlLW1hcCc7XG5pbXBvcnQge3VzZUVmZmVjdCwgdXNlU3RhdGV9IGZyb20gJ3JlYWN0JztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuLy8gaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJy4vZXhhbXBsZS9leGFtcGxlLXNsaWNlLXN0b3JlLWRlY2xhcmF0aW9uJztcblxuLy8gaW50ZXJmYWNlIFNsaWNlRGF0YTxTLCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4+IHtcbi8vICAgc2xpY2U6IFNsaWNlPFMsIFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+O1xuLy8gICBlcGljRmFjdG9yeT86IEVwaWNGYWN0b3J5PFMsIFIsIHN0cmluZz47XG4vLyAgIGFjdGlvbkRpc3BhdGNoZXI6IFNsaWNlPFMsIFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4+WydhY3Rpb25zJ107XG4vLyAgIHN0b3JlOiBPYnNlcnZhYmxlPFM+O1xuLy8gICBnZXRTdGF0ZTogKCkgPT4gUztcbi8vIH1cbi8vIGNvbnN0IGV4aXN0aW5nU2xpY2VNYXAgPSBuZXcgTWFwPHN0cmluZywgU2xpY2VEYXRhPGFueSwgYW55Pj4oKTtcblxuZXhwb3J0IHR5cGUgSW5qZWN0ZWRDb21wUHJvcHNUeXBlPENvbm5lY3RIT0M+ID1cbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxpbmZlciBUSW5qZWN0ZWRQcm9wcywgYW55PiA/IFRJbmplY3RlZFByb3BzIDoge30pXG4gICZcbiAgKENvbm5lY3RIT0MgZXh0ZW5kcyBJbmZlcmFibGVDb21wb25lbnRFbmhhbmNlcldpdGhQcm9wczxhbnksIGluZmVyIFRPd25Qcm9wcz4gPyBUT3duUHJvcHMgOiB7fSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVkdXhJbnNpZGVDb21wb25lbnQ8Uz4ge1xuICAvKiogVGhlIHN0b3JlIGZvciBub24tcHJpbWF0aXZlIGRhdGEgdHlwZSBhbmQgUmVkdXggdW5mcmllbmRseSBvYmplY3RzICovXG4gIHJlc291cmNlTWFwPzogUmVzb3VyY2VNYXA7XG4gIGdldFN0b3JlKCk6IHJ4Lk9ic2VydmFibGU8Uz47XG4gIGRlc3RvcnkoKTogdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgRXBpY0ZhY3Rvcnk8UywgUiBleHRlbmRzIFNsaWNlQ2FzZVJlZHVjZXJzPFM+LCBOYW1lIGV4dGVuZHMgc3RyaW5nPiA9XG4gIChzbGljZTogU2xpY2U8UywgUiwgTmFtZT4pID0+IEVwaWM8UGF5bG9hZEFjdGlvbjxhbnk+LCBQYXlsb2FkQWN0aW9uPGFueT4sIFM+O1xuXG5cbi8vIGxldCBDT01QT05FTlRfSUQgPSAwO1xuLyoqXG4gKiBVc2UgXCJzdGF0ZVwiIGluIFJlYWN0IHJlbmRlcmluZyB0ZW1wbGF0ZSwgdXNlIGBnZXRTdGF0ZSgpYCB0byBnZXQgY3VycmVudCBjb21wdXRlZCBzdGF0ZSBmcm9tIFJlZHV4IFN0b3JlLFxuICogYmUgYXdhcmUsIGBzdGF0ZWAgbWlnaHQgbm90IGJlIHRoZSBzYW1lIGFzIHJldHVybmVkIHZhbHVlIG9mIGBnZXRTdGF0ZSgpYCBhdCBzb21lIG1vbWVudHMuXG4gKiBcbiAqIEBwYXJhbSBuYW1lXG4gKiBAcGFyYW0gc2xpY2VGYWN0b3J5IFxuICovXG4vLyBleHBvcnQgZnVuY3Rpb24gdXNlSW50ZXJuYWxSZWR1eEZvckNvbXBvbmVudDxTIGV4dGVuZHMge1twcm9wOiBzdHJpbmddOiBhbnl9LCBSIGV4dGVuZHMgU2xpY2VDYXNlUmVkdWNlcnM8Uz4sIE5hbWUgZXh0ZW5kcyBzdHJpbmc+KFxuLy8gICBvcHQ6IENyZWF0ZVNsaWNlT3B0aW9uczxTLCBSLCBOYW1lPiAmIHtlcGljRmFjdG9yeT86IEVwaWNGYWN0b3J5PFMsIFIsIE5hbWU+fSk6IFtzdGF0ZTogUywgc2xpY2U6IFNsaWNlPFMsIFIgJiBFeHRyYVNsaWNlUmVkdWNlcnM8Uz4sIE5hbWU+XSB7XG4vLyAgIGNvbnN0IHJlc291cmNlTWFwID0gdXNlTWVtbygoKSA9PiBuZXcgUmVzb3VyY2VNYXAoKSwgW10pO1xuLy8gICBjb25zdCBbcmVhY3RTdGF0ZSwgc2V0UmVhY3RTdGF0ZV0gPSB1c2VTdGF0ZTxTPigpO1xuXG4vLyAgIHVzZUVmZmVjdCgoKSA9PiB7XG4vLyAgICAgY29uc3QgY29tcElkID0gQ09NUE9ORU5UX0lEKys7XG4vLyAgICAgbGV0IGV4aXN0aW5nU2xpY2UgPSBleGlzdGluZ1NsaWNlTWFwLmdldChvcHQubmFtZSkgYXMgU2xpY2VEYXRhPHtbY29tcElkOiBzdHJpbmddOiBTfSwge30+O1xuLy8gICAgIGlmIChleGlzdGluZ1NsaWNlID09IG51bGwpIHtcbi8vICAgICAgIGNvbnN0IG5ld1JlZHVjZXJzID0ge30gYXMgQ3JlYXRlU2xpY2VPcHRpb25zPHtbY29tcElkOiBzdHJpbmddOiBTfSwgUiwgTmFtZT5bJ3JlZHVjZXJzJ107XG4vLyAgICAgICBmb3IgKGNvbnN0IFtjYXNlTmFtZSwgcmVkdWNlcl0gb2YgT2JqZWN0LmVudHJpZXMob3B0LnJlZHVjZXJzKSkge1xuLy8gICAgICAgICBuZXdSZWR1Y2Vyc1tjYXNlTmFtZSBhcyBrZXlvZiBSXSA9IGZ1bmN0aW9uKHM6IHtbY29tcElkOiBzdHJpbmddOiBTfSwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPGFueT4pIHtcbi8vICAgICAgICAgICByZXR1cm4gKHJlZHVjZXIgYXMgYW55KShzW2NvbXBJZF0sIGFjdGlvbikgYXMgIHtbY29tcElkOiBzdHJpbmddOiBTfTtcbi8vICAgICAgICAgfSBhcyBhbnk7XG4vLyAgICAgICB9XG4vLyAgICAgICBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4vLyAgICAgICAgIG5hbWU6IG9wdC5uYW1lLFxuLy8gICAgICAgICBpbml0aWFsU3RhdGU6IHtbb3B0Lm5hbWVdOiB7W2NvbXBJZF06IG9wdC5pbml0aWFsU3RhdGV9fSBhcyB7W2NvbXBJZDogc3RyaW5nXTogU30sXG4vLyAgICAgICAgIHJlZHVjZXJzOiBuZXdSZWR1Y2Vyc1xuLy8gICAgICAgfSk7XG4vLyAgICAgICBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG4vLyAgICAgICBjb25zdCBzdG9yZSA9IHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbi8vICAgICAgIGNvbnN0IGdldFN0YXRlID0gKCkgPT4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xuLy8gICAgICAgZXhpc3RpbmdTbGljZSA9IHtzbGljZSwgYWN0aW9uRGlzcGF0Y2hlciwgc3RvcmUsIGdldFN0YXRlLCBlcGljRmFjdG9yeTogb3B0LmVwaWNGYWN0b3J5fTtcbi8vICAgICAgIGV4aXN0aW5nU2xpY2VNYXAuc2V0KG9wdC5uYW1lLCBleGlzdGluZ1NsaWNlKTtcbi8vICAgICB9IGVsc2Uge1xuLy8gICAgICAgY29uc3Qgc2xpY2VEYXRhOiBTbGljZURhdGE8e1tjb21wSWQ6IHN0cmluZ106IFN9LCB7fT4gPSBleGlzdGluZ1NsaWNlO1xuLy8gICAgICAgc2xpY2VEYXRhLmFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZSgoZHJhZnQpID0+IHtcbi8vICAgICAgICAgc1tjb21wSWRdID0gb3B0LmluaXRpYWxTdGF0ZTtcbi8vICAgICAgIH0pO1xuLy8gICAgIH1cblxuLy8gICAgIGlmIChvcHQuZXBpY0ZhY3RvcnkpIHtcbi8vICAgICAgIC8vIGNvbnN0IGVwaWMgPSBvcHQuZXBpY0ZhY3RvcnkoZXhpc3RpbmdTbGljZS5zbGljZSlcbi8vICAgICAgIC8vIHN0YXRlRmFjdG9yeS5hZGRFcGljKClcbi8vICAgICB9XG5cbi8vICAgICByZXR1cm4gKCkgPT4ge1xuLy8gICAgICAgY29uc3Qgc2xpY2VEYXRhOiBTbGljZURhdGE8e1tjb21wSWQ6IHN0cmluZ106IFN9LCB7fT4gPSBleGlzdGluZ1NsaWNlO1xuLy8gICAgICAgc2xpY2VEYXRhLmFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZSgoZHJhZnQpID0+IHtcbi8vICAgICAgICAgZGVsZXRlIHNbY29tcElkXTtcbi8vICAgICAgIH0pO1xuLy8gICAgIH07XG4vLyAgIH0sIFtdKTtcblxuLy8gICByZXR1cm4gey4uLnRvb2xraXQsIHN0YXRlOiByZWFjdFN0YXRlfTtcbi8vIH1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZVN0b3JlT2ZTdGF0ZUZhY3Rvcnkoc3RhdGVGYWN0b3J5OiBTdGF0ZUZhY3RvcnkpIHtcbiAgY29uc3QgW3JlZHV4U3RvcmUsIHNldFJlZHV4U3RvcmVdID0gdXNlU3RhdGU8UmV0dXJuVHlwZTxTdGF0ZUZhY3RvcnlbJ2dldFJvb3RTdG9yZSddPj4odW5kZWZpbmVkKTtcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzdGF0ZUZhY3Rvcnkuc3RvcmUkLnN1YnNjcmliZSh7XG4gICAgICBuZXh0KHN0b3JlKSB7XG4gICAgICAgIHNldFJlZHV4U3RvcmUoc3RvcmUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIH0sIFtzdGF0ZUZhY3RvcnkuZ2V0Um9vdFN0b3JlKCldKTtcblxuICByZXR1cm4gcmVkdXhTdG9yZTtcbn1cbiJdfQ==