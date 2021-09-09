import React from 'react';
import {createSlice, Reducers, Slice, SliceOptions, EpicFactory, OfTypeFn, Epic} from './tiny-redux-toolkit';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
export * from './tiny-redux-toolkit';

export interface BaseComponentState<Props> {
  componentProps?: Props;
  error?: Error;
}

type CompPropsSyncReducer<Props, S extends BaseComponentState<Props>> = {
  _syncComponentProps(s: S, payload: Props): void;
  _willUnmount(s: S): void;
};

function withBaseReducers<Props, S extends BaseComponentState<Props>, R extends Reducers<S>>(origReducers: R):
CompPropsSyncReducer<Props, S> & R {
  const reducers = {
    _syncComponentProps(s: S, payload: Props) {
      s.componentProps = {...payload};
    },
    _willUnmount(s: S) {},
    ...origReducers
  };
  return reducers;
}

export type EpicFactory4Comp<Props, S extends BaseComponentState<Props>, R extends Reducers<S>> =
  (slice: Slice<S, R & CompPropsSyncReducer<Props, S>>, ofType: OfTypeFn<S, R & CompPropsSyncReducer<Props, S>>) => Epic<S> | void;

/**
 * Unlike useTinyReduxTookit, useTinyRtk() accepts a State which extends BaseComponentState, 
 *  useTinyRtk() will automatically create an extra reducer "_syncComponentProps" for shallow coping
 * React component's properties to this internal RTK store
 * @param optsFactory 
 * @param props 
 * @param epicFactories 
 * @returns 
 */
export function useTinyRtk<Props, S extends BaseComponentState<Props>, R extends Reducers<S>>(
    optsFactory: () => SliceOptions<S, R>, props: Props, ...epicFactories: Array<EpicFactory4Comp<Props, S, R> | null | undefined>
  ): [state: S, slice: Slice<S, R & CompPropsSyncReducer<Props, S>>] {

    const extendOptsFactory = React.useCallback(() => {
      const opts = optsFactory();

      return {
        ...opts,
        reducers: withBaseReducers<Props, S, typeof opts.reducers>(opts.reducers)
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => () => {
      (stateAndSlice[1] as Slice<S, CompPropsSyncReducer<Props, S>>).actionDispatcher._willUnmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stateAndSlice = useTinyReduxTookit(extendOptsFactory, ...epicFactories);

    React.useEffect(() => {
      stateAndSlice[1].actionDispatcher._syncComponentProps(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Object.values(props));

    return stateAndSlice;
}
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts 
 * @returns 
 */
export function useTinyReduxTookit<S extends {error?: Error}, R extends Reducers<S>>(
  optsFactory: () => SliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>
): [state: S, slice: Slice<S, R>] {

  // To avoid a mutatable version is passed in
  // const clonedState = clone(opts.initialState);
  const willUnmountSub = React.useMemo(() => new rx.ReplaySubject<void>(1), []);
  const sliceOptions = React.useMemo(optsFactory, [optsFactory]);
  const epic$s = React.useMemo<rx.BehaviorSubject<EpicFactory<S, R> | null | undefined>[]>(() => {
    return epicFactories.map(() => new rx.BehaviorSubject<EpicFactory<S, R> | null | undefined>(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, setState] = React.useState<S>(sliceOptions.initialState);
  // const [slice, setSlice] = React.useState<Slice<S, R>>();
  const slice = React.useMemo<Slice<S, R>>(() => {
    const slice = createSlice(sliceOptions);
    slice.state$.pipe(
      op.distinctUntilChanged(),
      op.observeOn(rx.animationFrameScheduler), // To avoid changes being batched by React setState()
      op.tap(changed => setState(changed)),
      op.takeUntil(willUnmountSub)
    ).subscribe();

    // Important!!
    // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
    // change state, it turns out any subscriber that subscribe state$ later than
    // epic will get a state change event in reversed order !! So epic must be the last one to
    // subscribe state$ stream
    for (const epicFac$ of epic$s) {
      slice.addEpic$(epicFac$);
    }
    // Let's fun epic factory as earlier as possible, so that it will not missing
    // any action dispatched from child component, since child component's useEffect()
    // runs earlier than parent component's
    epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
    return slice;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
  }, [epic$s, epicFactories]);

  React.useEffect(() => {
    // const sub = slice.state$.pipe(
    //   op.distinctUntilChanged(),
    //   // Important!!! because this stream is subscribed later than Epic,
    //   // "changed" value might
    //   // come in reversed order in case of recursive state changing in "Epic",
    //   // so always use getValue() to get latest state
    //   op.tap(() => setState(slice.state$.getValue()))
    // ).subscribe();
    return () => {
      willUnmountSub.next();
      willUnmountSub.complete();
      // sub.unsubscribe();
      slice.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [state, slice];
}
