/**
 * For those components which has complicated "state" or a lot async "actions",
 * leverage a Redux (Redux-toolkit, Redux-observable) like internal store to manage
 * your component.
 * 
 * It's more powerful than React's useReducer() (https://reactjs.org/docs/hooks-reference.html#usereducer)
 * 
 * You should be familiar with concept of "slice" (Redux-toolkit) and "Epic" (Redux-observable) first.
 * 
 * Unlike real Redux-toolkit, we does not use ImmerJs inside, its your job to take care of
 * immutabilities of state, but also as perks, you can use any ImmerJS unfriendly object in state,
 * e.g. DOM object, React Component, functions
 */
import {EpicFactory4Comp, BaseComponentState} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {MDCRipple} from '@material/ripple/index';
import clsddp from 'classnames/dedupe';
import styles from './Ripple.module.scss';

export type RippleObservableProps = React.PropsWithChildren<{
  // define component properties
  color?: 'dark' | 'light';
  className?: string;
  getMdcRef?: (ref: MDCRipple) => void;
  // renderTo?: HTMLElement;
  // renderToWhen?: rx.Observable<HTMLElement>;
}>;
export interface RippleState extends BaseComponentState<RippleObservableProps> {
  componentProps?: RippleObservableProps;
  mdcRef?: MDCRipple;
  domRef?: HTMLDivElement | HTMLElement;
  mode: 'wrapper' | 'overlayer';
  error?: Error;
}

const reducers = {
  onDomRef(s: RippleState, dom: HTMLDivElement | HTMLElement | null) {
    if (s.mdcRef) {
      s.mdcRef.destroy();
      s.domRef = undefined;
    }
    if (dom != null) {
      s.domRef = dom;
      s.mdcRef = new MDCRipple(dom);
    }
  },

  destory(s: RippleState) {
    if (s.mdcRef) {
      s.mdcRef.destroy();
    }
  },

  _changeMode(s: RippleState, payload: RippleState['mode']) {
    s.mode = payload;
  }
  // define more reducers...
};

export function sliceOptionFactory() {
  const initialState: RippleState = {
    componentProps: {
      color: 'dark'
    },
    mode: 'overlayer'
  };
  return {
    name: 'Ripple',
    initialState,
    reducers,
    debug: false
  };
}

export const epicFactory: EpicFactory4Comp<RippleObservableProps, RippleState, typeof reducers> = function(slice) {
  return (action$) => {
    return rx.merge(
      slice.getStore().pipe(
        op.distinctUntilChanged((x, y) => x.componentProps?.className === y.componentProps?.className &&
          x.componentProps?.color === y.componentProps?.color &&
          x.domRef === y.domRef &&
          x.mode === y.mode),
        op.tap((s) => {
          if (s.domRef && s.componentProps) {
            const cls = clsddp(styles.overlayer, s.mode === 'overlayer' ? s.componentProps.className : '', 'matRipple', 'mdc-ripple-surface',
              {
                dark: s.componentProps.color === 'dark' || s.componentProps.color == null,
                light: s.componentProps.color === 'light'
              });
            s.domRef.className = cls;
          }
        })
      ),
      slice.getStore().pipe(op.map(state => state.componentProps?.children),
        op.distinctUntilChanged(),
        op.tap(children => {
          slice.actionDispatcher._changeMode(children == null ? 'overlayer' : 'wrapper');
        })
      ),
      slice.getStore().pipe(
        op.map(s => s.mdcRef), op.filter(ref => ref != null),
        op.distinctUntilChanged(),
        op.switchMap(mdcRef => {
          return slice.getStore().pipe(op.map(s => s.componentProps?.getMdcRef),
            op.filter(getMdcRef => getMdcRef != null),
            op.distinctUntilChanged(),
            op.take(1),
            op.tap(getMdcRef => getMdcRef!(mdcRef!))
          );
        })
      )
    ).pipe(op.ignoreElements());
  };
};

