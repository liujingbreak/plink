import React, {
  PropsWithChildren,
  ForwardRefRenderFunction,
  forwardRef,
  useMemo,
  useEffect,
  useCallback,
  useImperativeHandle
} from 'react';
import classnames from 'classnames/bind';
import * as rx from 'rxjs';
import {MDCList} from '@material/list';
import {MDCRipple} from '@material/ripple';
import './List.scss';

export type ListItem = {
  key: string;
  title?: string;
  subTitle?: string;
};
export type ListProps = PropsWithChildren<{
  twoLine?: boolean
  items: ListItem[]
  activatedKey?: string
  onItemClick?: (item: ListItem) => void;
  getMdcRef?: (ref: MDCList) => void;
}>;

const List: ForwardRefRenderFunction<Promise<MDCList>, ListProps> = function({
  twoLine,
  items = [],
  activatedKey,
  getMdcRef,
  onItemClick
}, ref) {
  const sub$ = useMemo(() => new rx.ReplaySubject<MDCList>(), []);
  const subRipple$ = useMemo(() => new rx.ReplaySubject<MDCRipple>(), []);

  const onDivReady = useCallback((div: any) => {
    const mdc = new MDCList(div);
    sub$.next(mdc);
    sub$.complete();
    if (getMdcRef) {
      getMdcRef(mdc);
    }
  }, []);

  const onRippleReady = useCallback((div: any) => {
    const mdc = new MDCRipple(div);
    subRipple$.next(mdc);
    subRipple$.complete();
  }, []);

  const handleItemClick = (item: ListItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  useImperativeHandle(ref, () => sub$.toPromise(), [sub$]);

  useEffect(() => {
    return () => {
      sub$.subscribe({
        next(mdc) { mdc.destroy();}
      });
    };
  }, []);

  return items.length > 0 ? (
    <ul className={classnames({
      'mdc-list': true,
      'mdc-list--two-line': twoLine
    })} ref={onDivReady}>
      {items.map(item => (
        <li
          key={item.key}
          className={classnames({
            'mdc-list-item': true,
            'mdc-list-item--activated': item.key === activatedKey
          })}
          onClick={() => handleItemClick(item)}
        >
          <span className='mdc-list-item__ripple' ref={onRippleReady}></span>
          <span className='mdc-list-item__text'>
            {twoLine ? (
              <>
              <span className='mdc-list-item__primary-text'>{item.title}</span>
                <span className='mdc-list-item__secondary-text'>{item.subTitle}</span>
              </>
            ) : item.title}
          </span>
        </li>
      ))}
    </ul>
  ) : null;
};
const Forwarded = forwardRef(List);

export {Forwarded as List};

