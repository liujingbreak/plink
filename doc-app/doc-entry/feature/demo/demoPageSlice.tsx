// import { ofPayloadAction} from '@wfh/redux-toolkit-observable/es/state-factory-browser';
import {EpicFactory4Comp, createReducers, BaseComponentState} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';

export interface DemoPageObservableProps {
  // define component properties
}
export interface DemoPageState extends BaseComponentState<DemoPageObservableProps> {
  componentProps?: DemoPageObservableProps;
}

const reducers = createReducers({
  // define more reducers...
});

export function sliceOptionFactory() {
  const initialState: DemoPageState = {
  };
  return {
    name: 'DemoPage',
    initialState,
    reducers
  };
}

export const epicFactory: EpicFactory4Comp<DemoPageObservableProps, DemoPageState, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
      // Observe state (state$) change event, exactly like React.useEffect(), but more powerful for async time based reactions
      slice.getStore().pipe(
        op.map(s => s.componentProps), // watch component property changes
        op.distinctUntilChanged(), // distinctUntilChanged accept an expression as parameter
        op.filter(props => props != null),
        op.switchMap(props => { // Consider other ooperators like, concatMap(), mergeMap(), tap(), exhaustMap()
          return rx.from('some cancellable async reactions on component property changes and');
        })
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};


