import React from 'react';
import {Ripple, MDCRipple} from './Ripple';
import cls from 'classnames';
// import clsddp from 'classnames/dedupe';
// import './icons/icon-fonts.scss';
import './IconButton.scss';

export type IconButtonProps = React.PropsWithChildren<{
  onClick?(evt: any): void;
  className?: string;
  disabled?: boolean;
  dialogAction?: string;
  // isToggleOn?: boolean;
  materialIcon?: string;
  // materialIconOff?: string;
  // materialIconStyle?: 'regular' | 'outlined' | 'towtone'
}>;

interface IconButtonState {
  btnRef?: HTMLButtonElement;
  isToggleOn?: boolean;
}

/**
 * Prerequisite: `import '@material-icons/font/css/outline.css';` in your App level component
 * @param props 
 */
const IconButton: React.FC<IconButtonProps> = function(props) {
  const clickCb = React.useCallback<React.MouseEventHandler<HTMLButtonElement>>((event) => {
    if (props.onClick) {
      props.onClick(event);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onClick]);

  const [state, setState] = React.useState<IconButtonState>({});
  const btnRef = React.useCallback((btn: HTMLButtonElement | null) => {
    setState({
      ...state,
      btnRef: btn || undefined
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

  const onRippleRef = React.useCallback((mdcRipple: MDCRipple) => {
    mdcRipple.unbounded = true;
  }, []);
  const iconCls = 'material-icons'; // + (props.materialIconStyle != null ? '-' + props.materialIconStyle : '');
  return <button ref={btnRef} className={cls('mdc-icon-button', props.className)}
    disabled={!!props.disabled}
    onClick={clickCb}>
    { props.materialIcon ? <>
      {/* <i className={iconCls + ' mdc-icon-button__icon mdc-icon-button__icon--on'}>{props.materialIcon}</i> */}
      <i className={cls(iconCls, 'mdc-icon-button__icon', props.materialIcon ? 'md-' + props.materialIcon : '')}></i>
      </> : props.children
    }
    <Ripple className='ripple' getMdcRef={onRippleRef} />
  </button>;
};


export {IconButton};



