/* eslint-disable multiline-ternary */
import React from 'react';
import cls from 'classnames';
import {MDCIconButtonToggle} from '@material/icon-button';
import {Ripple, MDCRipple} from './Ripple';
// import clsddp from 'classnames/dedupe';
// import './icons/icon-fonts.scss';
import './IconButton.scss';

export type IconButtonProps = React.PropsWithChildren<{
  onClick?(evt: any): void;
  className?: string;
  disabled?: boolean;
  dialogAction?: string;
  materialIcon?: string;
  materialIconToggleOn?: string;
  onMdcInstance?(instance: MDCIconButtonToggle): void;
  onToggle?(isOn: boolean): void;
}>;

interface IconButtonState {
  btnRef?: HTMLButtonElement;
  mdcInstance?: MDCIconButtonToggle;
}

/**
 * Prerequisite: `import '@material-icons/font/css/outline.css';` in your App level component
 * @param props 
 */
const IconButton: React.FC<IconButtonProps> = function(props) {
  const {onClick} = props;
  const [state, setState] = React.useState<IconButtonState>({});
  const clickCb = React.useCallback<React.MouseEventHandler<HTMLButtonElement>>((event) => {
    if (onClick) {
      onClick(event);
    }
    if (props.onToggle && props.materialIconToggleOn) {
      setTimeout(() => {
        props.onToggle!(state.mdcInstance!.on);
      }, 0);
    }
  }, [onClick, props.materialIconToggleOn, props.onToggle, state.mdcInstance]);

  const btnRef = React.useCallback((btn: HTMLButtonElement | null) => {
    setState(state => {
      return {
        ...state,
        btnRef: btn || undefined
      };
    });
  }, []);

  React.useEffect(() => {
    if (state.btnRef) {
      if (props.dialogAction) {
        state.btnRef.setAttribute('data-mdc-dialog-action', props.dialogAction);
      } else {
        state.btnRef.removeAttribute('data-mdc-dialog-action');
      }
    }
  }, [props.dialogAction, state.btnRef]);

  // create MDC toggleIconButton instance
  React.useEffect(() => {
    if (props.materialIconToggleOn && state.btnRef) {
      const mdc = new MDCIconButtonToggle(state.btnRef);
      setState(s => {
        return {...s, mdcInstance: mdc};
      });
    }
  }, [props.materialIconToggleOn, state.btnRef]);

  // Invoke MDC toggleIconButton instance callback
  React.useEffect(() => {
    if (state.mdcInstance && props.onMdcInstance) {
      props.onMdcInstance(state.mdcInstance);
    }
  }, [props, state.mdcInstance]);

  const onRippleRef = React.useCallback((mdcRipple: MDCRipple) => {
    mdcRipple.unbounded = true;
  }, []);
  const iconCls = 'material-icons'; // + (props.materialIconStyle != null ? '-' + props.materialIconStyle : '');

  const iconClassName = cls(iconCls, 'material-icons', 'mdc-icon-button__icon');
  return <button ref={btnRef} className={cls('mdc-icon-button', props.className)}
    disabled={!!props.disabled}
    onClick={clickCb}>
    <span className="mdc-icon-button__focus-ring"></span>
    { props.materialIcon ?
      <>
        { props.materialIconToggleOn ?
          <i className={cls(iconClassName, 'md-' + props.materialIconToggleOn, 'mdc-icon-button__icon--on')}></i> :
          null
        }
        <i className={cls(iconClassName, 'md-' + props.materialIcon)}></i>
      </> : props.children
    }
    <Ripple className="ripple" getMdcRef={onRippleRef} />
  </button>;
};


export {IconButton};



