import React, {useState, useCallback} from 'react';
import clsBinder from 'classnames/bind';
// import {TopAppBar} from '@wfh/material-components-react/client/TopAppBar';
// import {Drawer} from '@wfh/material-components-react/client/Drawer';
// import {useParams} from 'react-router-dom';
import {MarkdownViewComp, MarkdownViewCompProps} from '@wfh/doc-ui-common/client/markdown/MarkdownViewComp';
import {markdownsControl} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
// import {DocListComponents} from './DocListComponents';
import {useRouter} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes.hooks';
import * as rx from 'rxjs';
import {useAppLayout} from '@wfh/doc-ui-common/client/components/appLayout.control';
import {renderByMdKey} from './articaleComponents';
import styles from './ArticalePage.module.scss';

const cls = clsBinder.bind(styles);

const EMPTY_ARR: any[] = [];
export type ArticalePageProps = React.PropsWithChildren<Record<string, never>>;

const ArticalePage = React.memo<ArticalePageProps>(function() {
  const matchedRoute = useRouter();
  const matchedParams = matchedRoute?.matchedRoute?.matchedParams;
  const [portals, setPortals] = useState(EMPTY_ARR);

  const onContentLoaded = useCallback<NonNullable<MarkdownViewCompProps['onContent']>>((div) => {
    if (matchedParams?.mdKey) {
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
    }
  }, [matchedParams?.mdKey]);

  const layout = useAppLayout();

  React.useEffect(() => {
    if (matchedParams?.mdKey) {
      const sub = markdownsControl.outputTable.l.htmlByKey.pipe(
        rx.map(([, map]) => map.get(matchedParams.mdKey)),
        rx.filter((data): data is NonNullable<typeof data> => data != null),
        rx.distinctUntilChanged(),
        rx.filter(md => {
          if (md && layout) {
            layout.i.dp.updateBarTitle(md.toc[0]?.text || 'Document (untitled)');
            return true;
          }
          return false;
        })
      ).subscribe();
      return () => sub.unsubscribe();
    }
  }, [layout, matchedParams?.mdKey]);

  // mdc-layout-grid provides proper margin or padding space for page element
  return (
    <div className={cls('articale-page', 'mdc-layout-grid')}> {/* CSS class mdc-layout-grid provides proper margin or padding space for page element */}
      <MarkdownViewComp mdKey={matchedParams?.mdKey} onContent={onContentLoaded} />
      {portals}
    </div>
  );
});

export {ArticalePage};

