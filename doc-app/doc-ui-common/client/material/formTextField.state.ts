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
import {EpicFactory4Comp, BaseComponentState, Slice, castByActionType} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit-hook';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {MDCTextField} from '@material/textfield';
import {MDCLineRipple} from '@material/line-ripple';

export type FormTextFieldProps = React.PropsWithChildren<{
  className?: string;
  name?: string;
  hintText?: string;
  isRequired?: boolean;
  inputType?: 'text' | 'email' | 'number' | 'date';
  minLength?: number;
  maxLength?: number;
  helperTextContent?: string;
  value?: string;
  onChange?: (v: string) => void;
  onValidated?: () => void;
  /** default is true */
  showLabel?: boolean;
  styleType?: 'filled'; // todo 'Outlined'
  sliceRef?(slice: FormTextFieldSlice | null): void;
}>;
export interface FormTextFieldState extends BaseComponentState<FormTextFieldProps> {
  valid?: boolean;
  value: string;
  dom?: HTMLLabelElement | null;
  mdcTextField?: MDCTextField;
  randomId: string;
  _rippleLineDom?: HTMLSpanElement | null;
  error?: Error;
}

const reducers = {
  onDomRef(s: FormTextFieldState, dom: HTMLLabelElement | null) {
    s.dom = dom;
  },
  onRippleLineRef(s: FormTextFieldState, dom: HTMLSpanElement | null) {
    s._rippleLineDom = dom;
  },
  onInputRef(s: FormTextFieldState, dom: HTMLInputElement | null) {},
  setValue(s: FormTextFieldState, value: string) {
    s.value = value;
  },
  setValid(s: FormTextFieldState, isValid: boolean) {},
  _updateMdcInstance(s: FormTextFieldState, dom: HTMLLabelElement | null | undefined) {
    if (s.mdcTextField) {
      s.mdcTextField.destroy();
    }
    s.mdcTextField = dom ? new MDCTextField(dom) : undefined;
    if (s.mdcTextField) {
      s.mdcTextField.getDefaultFoundation().setValidateOnValueChange(true);
    }
  },
  _valueChange(s: FormTextFieldState, value: React.ChangeEvent<HTMLInputElement>) {
    s.value = value.target.value;
    s.valid = undefined;
    if (s.componentProps?.onChange) {
      s.componentProps.onChange(value.target.value);
    }
  },
  _focusChange(s: FormTextFieldState, event: React.FocusEvent) {},
  onValidated(s: FormTextFieldState) {
    if (s.mdcTextField) {
      s.valid = s.mdcTextField.valid;
      s.mdcTextField.layout();
    }
  }
};

export function sliceOptionFactory() {
  const initialState: FormTextFieldState = {
    value: '',
    randomId: Math.random() + ''
  };
  return {
    name: 'FormTextField',
    initialState,
    reducers,
    debug: false // process.env.NODE_ENV !== 'production'
  };
}

export type FormTextFieldSlice = Slice<FormTextFieldState, typeof reducers>;

export const epicFactory: EpicFactory4Comp<FormTextFieldProps, FormTextFieldState, typeof reducers> = function(slice) {
  const propKeys: ('maxLength' | 'minLength' | 'helperTextContent')[] = ['maxLength', 'minLength', 'helperTextContent'];
  return (action$) => {
    const actionStreams = castByActionType(slice.actions, action$);
    const mdcTextField$ = slice.getStore().pipe(
      op.map(s => s.mdcTextField), op.distinctUntilChanged(),
      op.filter(v => v != null)
    ) as rx.Observable<MDCTextField>;

    const syncValueToDom = rx.combineLatest([
        slice.getStore().pipe(
          op.map(s => s.value),
          op.distinctUntilChanged()
        ),
        slice.getStore().pipe(
          op.map(s => s.mdcTextField), op.distinctUntilChanged()
        )
        // actionStreams.onInputRef.pipe(op.map(({payload}) => payload))
      ]).pipe(
        op.map(([value, mdcTextField]) => {
          if (mdcTextField && mdcTextField.value !== value) {
            mdcTextField.value = value;
          }
        })
      );

    const syncValidationPropToMdc = rx.merge(...propKeys.map(prop => {
      return rx.combineLatest([
        mdcTextField$,
        slice.getStore().pipe(
          op.map(s => {
            return s.componentProps ? s.componentProps[prop] : null;
          }),
          op.distinctUntilChanged(),
          op.filter(v => v != null)
        )
      ]).pipe(
        op.tap(([mdc, value]) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (mdc as any)[prop] = value ;
        })
      );
    }));

    return rx.merge(
      slice.getStore().pipe(op.map(s => s.dom),
        op.distinctUntilChanged(),
        op.map(dom => {
          slice.actionDispatcher._updateMdcInstance(dom);
        })
      ),
      slice.getStore().pipe(op.map(s => s._rippleLineDom),
        op.distinctUntilChanged(),
        op.switchMap(dom => new rx.Observable(sub => {
          if (dom) {
            const rippleLine = new MDCLineRipple(dom);
            return () => rippleLine.destroy();
          }
          sub.complete();
        }))
      ),
      syncValueToDom,
      syncValidationPropToMdc,
      actionStreams.setValid.pipe(
        op.switchMap(action => slice.getStore().pipe(
          op.map(s => s.mdcTextField), op.distinctUntilChanged(),
          op.filter(mdc => mdc != null), op.take(1),
          op.map(mdc => ({mdc, valid: action.payload}))
        )),
        op.map(({mdc, valid}) => {
          mdc!.valid = valid;
        })
      ),

      // dispatch onValidated() when focus changes
      slice.getStore().pipe(op.map(s => s.mdcTextField),
        op.distinctUntilChanged(),
        op.filter(o => o != null),
        op.switchMap((mdcTextField) => rx.merge(
          slice.getStore().pipe(
            op.map(s => s.value), op.distinctUntilChanged(),
            op.map((value, idx) => {
              if (idx > 0 || value)
                mdcTextField!.value = value;
            }) // force MDCTextField do validate immediately
          ),
          actionStreams._focusChange
        ).pipe(
            op.debounceTime(100),
            op.map(() => {
              slice.actionDispatcher.onValidated();
            })
          )
        )
      ),
      // setValue on property value changes
      slice.getStore().pipe(op.map(s => s.componentProps?.value),
        op.distinctUntilChanged(),
        op.filter(value => value != null),
        op.map(value => slice.actionDispatcher.setValue(value!))
      ),
      // emit property onChange
      slice.getStore().pipe(
        op.distinctUntilChanged((a, b) => a.valid === b.valid && a.componentProps?.onChange === b.componentProps?.onChange),
        op.map((s) => {
          if (s.componentProps?.onChange) {
            s.componentProps.onChange(s.value);
          }
        })
      ),
      slice.getStore().pipe(op.map(s => s.componentProps?.sliceRef), op.distinctUntilChanged(),
        op.map(sliceRef => {
          if (sliceRef)
            sliceRef(slice);
        })
      ),
      actionStreams._willUnmount.pipe(
        op.map(() => {
          const cb = slice.getState().componentProps?.sliceRef;
          if (cb) {
            cb(null);
          }
        })
      )
      // ... more action async reactors: action$.pipe(ofType(...))
    ).pipe(op.ignoreElements());
  };
};

