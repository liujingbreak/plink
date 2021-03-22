import React, {
  PropsWithChildren,
  ForwardRefRenderFunction,
  forwardRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle
} from 'react';
import './Drawer.scss';
import {MDCDrawer} from '@material/drawer';
import * as rx from 'rxjs';

export type DrawerProps = PropsWithChildren<{
  title?: string;
  subTitle?: string;
  open: boolean;
  content?: any;
  getMdcRef?: (ref: MDCDrawer) => void;
}>;

const Drawer: ForwardRefRenderFunction<Promise<MDCDrawer>, DrawerProps> = function({ title, subTitle, open, getMdcRef, content, children }, ref) {
  const [drawer, setDrawer] = useState<MDCDrawer | null>(null);
  const sub$ = useMemo(() => new rx.ReplaySubject<MDCDrawer>(), []);

  const onDivReady = useCallback((div: HTMLDivElement) => {
    const mdc = new MDCDrawer(div);
    sub$.next(mdc);
    sub$.complete();
    setDrawer(mdc);
    if (getMdcRef) {
      getMdcRef(mdc);
    }
  }, []);

  const onOpenChanged = useCallback(() => {
    if (drawer) {
      drawer.open = open;
    }
  }, [drawer, open]);

  useImperativeHandle(ref, () => sub$.toPromise(), [sub$]);

  useEffect(() => {
    return () => {
      sub$.subscribe({
        next(mdc) { mdc.destroy();}
      });
    };
  }, []);

  useEffect(() => {
    onOpenChanged();
  }, [drawer, open]);

  return (
    <>
      <aside className='mdc-drawer mdc-drawer--dismissible' ref={onDivReady}>
        {title || subTitle ? <div className='mdc-drawer__header'>
          {title ? <h3 className='mdc-drawer__title'>{title}</h3> : null}
          {subTitle ? <h6 className='mdc-drawer__subtitle'>email@material.io</h6> : null}
        </div> : null}
        <div className='mdc-drawer__content'>
          {content ? content : null}
        </div>
      </aside>
      <div className='mdc-drawer-app-content'>
        {children}
      </div>
    </>
  );
};
const Forwarded = forwardRef(Drawer);

export {Forwarded as Drawer};

