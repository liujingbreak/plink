import React, { useState, useCallback } from 'react';
import cls from 'classnames';
// import {TopAppBar} from '@wfh/material-components-react/client/TopAppBar';
// import {Drawer} from '@wfh/material-components-react/client/Drawer';
// import {useParams} from 'react-router-dom';
import {MarkdownViewComp, MarkdownViewCompProps} from '@wfh/doc-ui-common/client/markdown/MarkdownViewComp';
import {getStore} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
// import {DocListComponents} from './DocListComponents';
import {useMatchedRoute} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import * as op from 'rxjs/operators';
import {useAppLayout} from '@wfh/doc-ui-common/client/components/appLayout.state';
import {renderByMdKey} from './articaleComponents';
import styles from './ArticalePage.module.scss';


const EMPTY_ARR: any[] = [];
export type ArticalePageProps = React.PropsWithChildren<Record<string, never>>;

const ArticalePage: React.FC<ArticalePageProps> = function(props) {
  const matchedParams = useMatchedRoute()!.matchedRoute!.matchedParams;
  const [portals, setPortals] = useState(EMPTY_ARR);

  const onContentLoaded = useCallback<NonNullable<MarkdownViewCompProps['onContent']>>((div) => {
    const renderers = renderByMdKey[matchedParams?.mdKey];
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
  }, [matchedParams?.mdKey]);

  const layout = useAppLayout();

  React.useEffect(() => {
    const sub = getStore().pipe(
      op.map(s => s.contents[matchedParams.mdKey]),
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
  }, [layout, matchedParams.mdKey]);
  return (
    <div className={cls(styles['articale-page'], 'mdc-layout-grid')}>
      <MarkdownViewComp mdKey={matchedParams.mdKey} onContent={onContentLoaded} />
      {portals}
    </div>
  );
};

export {ArticalePage};

