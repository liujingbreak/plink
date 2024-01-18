import React from 'react';
import {Button, ButtonProps} from '@wfh/material-components-react/client/Button';
import styles from './file-input.module.scss';

export type FileInputProps = {
  name?: string;
  onChange?: (file: FileList) => void;
} & Omit<ButtonProps, 'dialogAction'>;

export const FileInput = React.memo<React.PropsWithChildren<FileInputProps>>(props => {

  const [input, setInput] = React.useState<HTMLInputElement | null>();
  const [changeCount, setChange] = React.useState<number>(0);

  const onRef = React.useCallback((el: HTMLInputElement | null) => {
    setInput(el);
  }, []);

  const onChange = React.useCallback(() => {
    setChange(s => ++s);
  }, []);

  React.useEffect(() => {
    if (input && props.onChange && changeCount > 0 && input.files) {
      props.onChange(input.files);
    }
  }, [changeCount, input, props, props.onChange]);

  const onClick = React.useCallback((evt: unknown) => {
    if (input) {
      input.click();
    }
    if (props.onClick)
      props.onClick(evt);
  }, [input, props]);

  return <><Button onClick={onClick}><label>{props.children}</label></Button>
    <input ref={onRef} onChange={onChange} name={props.name ?? 'unknown'} type="file" className={styles.inputField}/>
  </>;
});
