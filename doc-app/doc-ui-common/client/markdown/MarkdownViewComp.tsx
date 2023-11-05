import React from 'react';
import * as rx from 'rxjs';
import classnames from 'classnames/bind';
import cln from 'classnames';
import 'github-markdown-css/github-markdown.css';
import unescape from 'lodash/unescape';
import {IconButton} from '@wfh/material-components-react/client/IconButton';
import {SwitchAnim} from '../animation/SwitchAnim';
import {markdownsControl} from './markdownSlice';
import styles from './MarkdownViewComp.module.scss';
import {TableOfContents} from './toc/TableOfContents';

let mermaidIdSeed = 0;
const cls = classnames.bind(styles);

export type MarkdownViewCompProps = {
  /** markdown file relative path, which is compiled by markdown-loader */
  mdKey?: string;
  onContent?: (dom: HTMLElement) => void;
};

const {outputTable, i} = markdownsControl;

export const MarkdownViewComp = React.memo<MarkdownViewCompProps>(function(props) {
  const [, setLoaded] = React.useState<boolean>(false);
  const [containerDom, setContainerDom] = React.useState<HTMLElement>();

  const containerRefCb = React.useCallback((dom: HTMLDivElement | null) => {
    if (dom)
      setContainerDom(dom);
  }, []);

  React.useEffect(() => {
    setLoaded(false);
    if (props.mdKey && outputTable.getData().computedHtmlForReact[0]?.reactHtml[props.mdKey] == null) {
      i.dp.getHtml(props.mdKey);
    }
  }, [props.mdKey]);

  React.useEffect(() => {
    const computed = props.mdKey != null ? outputTable.getData().computedHtmlForReact[0]?.reactHtml[props.mdKey] : false;
    if (computed && containerDom) {
      // containerDom.innerHTML = getState().computed.reactHtml[props.mdKey].__html;
      setHtmlObj(computed);

      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        containerDom.querySelectorAll('.language-mermaid').forEach(async el => {
          el.id = 'mermaid-diagram-' + mermaidIdSeed++;
          const container = document.createElement('div');
          container.className = styles.mermaidDiagram;
          el.parentElement!.insertBefore(container, el);
          // Can not be moved to a Worker, mermaid relies on DOM
          const svgStr = await drawMermaidDiagram(el.id, unescape(el.innerHTML));
          container.innerHTML = svgStr;
        });

        setLoaded(true);
        if (props.onContent) {
          props.onContent(containerDom);
        }
      }, 20);

    }
  },    // eslint-disable-next-line react-hooks/exhaustive-deps
  [
    containerDom, props.mdKey,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (props.mdKey != null && outputTable.getData().computedHtmlForReact[0]) ? outputTable.getData().computedHtmlForReact[0]!.reactHtml[props.mdKey] : null,
    props.onContent
  ]);

  const [, touchState] = React.useState<unknown>(null); // enable React reconcilation/dirty-check
  React.useEffect(() => {
    if (props.mdKey == null)
      return;
    const sub = outputTable.dataChange$.pipe(
      rx.tap(() => touchState({}))
    ).subscribe();
    return () => sub.unsubscribe();
  }, [props.mdKey]);

  return (
    <SwitchAnim className={cls('switchAnim')} innerClassName={styles.container} contentHash={props.mdKey}>
      <>
        <div ref={containerRefCb} className={cln(styles.markdownContent, 'markdown-body')}></div>
        {props.mdKey ? <TableOfContents className={styles.toc} markdownKey={props.mdKey} /> : '...'}
        <IconButton className={styles.tocPopBtn} materialIcon="toc" materialIconToggleOn="close"/>
      </>
    </SwitchAnim>
  );
});


const mermaidInited = false;

async function drawMermaidDiagram(id: string, mermaidStr: string | null): Promise<string> {
  const mermaid = (await import('mermaid')).default;
  if (mermaidStr == null)
    return Promise.resolve('');
  if (!mermaidInited) {
    mermaid.initialize({
      securityLevel: 'loose',
      startOnLoad: false
    });
  }

  try {
    const {svg} = await mermaid.render(id, mermaidStr);
    return svg;
  } catch (err) {
    console.error('Failed to draw mermaid diagram', err);
    return '';
  }
}

