import React, { useState, useCallback } from 'react';
// import ReactDom from 'react-dom';
import classnames from 'classnames/bind';
import styles from './ArticalePage.module.scss';
// import {TopAppBar} from '@wfh/doc-ui-common/client/material/TopAppBar';
// import {Drawer} from '@wfh/doc-ui-common/client/material/Drawer';
// import {useParams} from 'react-router-dom';
import {MarkdownViewComp, MarkdownViewCompProps} from '@wfh/doc-ui-common/client/markdown/MarkdownViewComp';
import {getStore} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import {renderByMdKey} from './articaleComponents';
// import {DocListComponents} from './DocListComponents';
import {useParams} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import * as op from 'rxjs/operators';
import {useAppLayout} from '@wfh/doc-ui-common/client/components/appLayout.state';


const cx = classnames.bind(styles);
// const logoCls = cx('logo');
// const titleCls = cx('title');
const articaleCls = cx('articale-page');
// const contentCls = cx('main-content');
// const bkLogoCls = cx('bk-logo');
const EMPTY_ARR: any[] = [];
export type ArticalePageProps = React.PropsWithChildren<{
}>;

const ArticalePage: React.FC<ArticalePageProps> = function(props) {
  const routeParams = useParams<{mdKey: string}>();
  // const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [portals, setPortals] = useState(EMPTY_ARR);
  // const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const onContentLoaded = useCallback<NonNullable<MarkdownViewCompProps['onContent']>>((div) => {
    const renderers = renderByMdKey[routeParams.mdKey];
    if (!renderers) return;

    const els: any[] = [];
    for (const [id, render] of Object.entries(renderers)) {
        div.querySelectorAll('.comp-' + id).forEach(found => {
          try {
            if (found) {
              const dataKey = found.getAttribute('data-key');
              if (dataKey)
                els.push(render(id, found, dataKey));
            }
          } catch (e) {
            console.error(e);
          }
        });
    }
    setPortals(els);
  }, EMPTY_ARR);

  // const onDrawerToggle = useCallback(() => {
  //   setDrawerOpen(!drawerOpen);
  // }, [drawerOpen]);

  // const handleScroll = debounce(() => {
  //   dispatcher.scrollProcess();
  // }, 20);

  // useEffect(() => {
  //   if (scrollBodyRef.current) {
  //     dispatcher.setScrollBodyEl(scrollBodyRef.current);
  //     scrollBodyRef.current.addEventListener('scroll', handleScroll);
  //   }
  //   return () => {
  //     if (scrollBodyRef.current) {
  //       scrollBodyRef.current.removeEventListener('scroll', handleScroll);
  //     }
  //     dispatcher.clearScrollCallback();
  //   };
  // }, [scrollBodyRef.current]);

  // const title = (
  //   <div className={titleCls}>
  //     <div className={logoCls}></div>
  //     简介
  //   </div>
  // );
  const layout = useAppLayout();

  React.useEffect(() => {
    const sub = getStore().pipe(
      op.map(s => s.contents[routeParams.mdKey]),
      op.distinctUntilChanged(),
      op.filter(md => {
        if (md && layout) {
          layout.actionDispatcher.updateBarTitle('Document: ' + md.toc[0]?.text || 'Document: ');
          return true;
        }
        return false;
      })
    ).subscribe();
    return () => sub.unsubscribe();
  }, [routeParams.mdKey]);
  return (
    <div className={articaleCls}>
      <MarkdownViewComp mdKey={routeParams.mdKey} onContent={onContentLoaded} />
      {portals}
    </div>
  );
};

export {ArticalePage};

