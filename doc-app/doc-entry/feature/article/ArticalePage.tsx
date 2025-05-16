import React, {useState, useCallback} from 'react';
import clsBinder from 'classnames/bind';
import {MarkdownViewComp, MarkdownViewCompProps} from '@wfh/doc-ui-common/client/markdown/MarkdownViewComp';
import {useRouter} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes.hooks';
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

  // mdc-layout-grid provides proper margin or padding space for page element
  return (
    <div className={cls('articale-page', 'mdc-layout-grid')}> {/* CSS class mdc-layout-grid provides proper margin or padding space for page element https://m2.material.io/develop/web/supporting/layout-grid*/}
      <MarkdownViewComp mdKey={matchedParams?.mdKey ? matchedParams.mdKey : undefined} onContent={onContentLoaded} />
      {portals}
    </div>
  );
});

export {ArticalePage};

