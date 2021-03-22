import React, { useState, useCallback } from 'react';
// import ReactDom from 'react-dom';

// import classnames from 'classnames/bind';
import './ArticalePage.scss';
import {TopAppBar} from '@wfh/doc-ui-common/client/material/TopAppBar';
import {Drawer} from '@wfh/doc-ui-common/client/material/Drawer';
import {useParams} from 'react-router-dom';
import {MarkdownViewComp, MarkdownViewCompProps} from '@wfh/doc-ui-common/client/markdown/MarkdownViewComp';
import {renderByMdKey} from './articaleComponents';
import {DocListComponents} from './DocListComponents';

const EMPTY_ARR: any[] = [];
export type ArticalePageProps = React.PropsWithChildren<{
}>;

const ArticalePage: React.FC<ArticalePageProps> = function(props) {
  const routeParams = useParams<{mdKey: string}>();
  const [portals, setPortals] = useState(EMPTY_ARR);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);

  const onContentLoaded = useCallback<NonNullable<MarkdownViewCompProps['onContent']>>((div) => {
    const renderers = renderByMdKey[routeParams.mdKey];
    if (!renderers) return;

    const els: any[] = [];
    for (const [id, render] of Object.entries(renderers)) {
      try {

        const found = div.querySelector('#comp-' + id);
        if (found) {
          els.push(render(id, found));
        }
      } catch (e) {
        console.error(e);
      }
    }
    setPortals(els);
  }, EMPTY_ARR);

  const onDrawerToggle = useCallback(() => {
    setDrawerOpen(!drawerOpen);
  }, [drawerOpen]);

  return (
    <div className='articale-page'>
      <Drawer title='文档' open={drawerOpen} content={<DocListComponents currentKey={routeParams.mdKey} />}>
        <TopAppBar title='前端架构简介' type='short' onDrawerMenuClick={onDrawerToggle} />
        <main className='main-content'>
          <div className='mdc-top-app-bar--fixed-adjust'>
            <MarkdownViewComp mdKey={routeParams.mdKey} onContent={onContentLoaded}/>
            {portals}
          </div>
        </main>
      </Drawer>
    </div>
  );
};

export {ArticalePage};

