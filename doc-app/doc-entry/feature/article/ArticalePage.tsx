import React from 'react';
// import ReactDom from 'react-dom';

import classnames from 'classnames/bind';
import styles from './ArticalePage.module.scss';
import {TopAppBar} from '@wfh/doc-ui-common/client/material/TopAppBar';
import {useParams} from 'react-router-dom';
import {MarkdownViewComp, MarkdownViewCompProps} from '@wfh/doc-ui-common/client/markdown/MarkdownViewComp';
import {renderByMdKey} from './articaleComponents';
const cx = classnames.bind(styles);
const logoCls = cx('logo');
const titleCls = cx('title');
const EMPTY_ARR: any[] = [];
export type ArticalePageProps = React.PropsWithChildren<{
}>;

const ArticalePage: React.FC<ArticalePageProps> = function(props) {
  const routeParams = useParams<{mdKey: string}>();
  const [portals, setPortals] = React.useState(EMPTY_ARR);

  const onContentLoaded = React.useCallback<NonNullable<MarkdownViewCompProps['onContent']>>((div) => {
    const renderers = renderByMdKey[routeParams.mdKey];

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

  const title = <div className={titleCls}>
    <div className={logoCls}></div>
    用户技术业务前端架构简介
  </div>;

  return (
    <TopAppBar title={title} type='short'>
      <MarkdownViewComp mdKey={routeParams.mdKey} onContent={onContentLoaded}/>
      {portals}
    </TopAppBar>
  );
};

export {ArticalePage};

