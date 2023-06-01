/// <reference path="../../ts/mermaid-types.d.mts" />
import React from 'react';
import * as op from 'rxjs/operators';
import classnames from 'classnames/bind';
import 'github-markdown-css/github-markdown.css';
import unescape from 'lodash/unescape';
// import {MarkdownIndex} from './MarkdownIndex';
import {SwitchAnim} from '../animation/SwitchAnim';

import {getState, getStore, dispatcher} from './markdownSlice';
import styles from './MarkdownViewComp.module.scss';
import {TableOfContents} from './toc/TableOfContents';

let mermaidIdSeed = 0;
const cls = classnames.bind(styles);

export type MarkdownViewCompProps = {
  /** markdown file relative path, which is compiled by markdown-loader */
  mdKey?: string;
  onContent?: (dom: HTMLElement) => void;
};

// const ConnectHOC = connect((rootState: unknown, ownProps: MarkdownViewCompProps) => {
//   return function(rootState: any, props: MarkdownViewCompProps) {
//     return {
//       contents: getState().computed.reactHtml
//     };
//   };
// }, {}, null, {forwardRef: true});

const EMPTY_HTML_OBJ = {__html: ''};

export const MarkdownViewComp = React.memo<MarkdownViewCompProps>(function(props) {
  // const routeParams = useParams<{mdKey: string}>();
  // {__html: props.contents[routeParams.mdKey]}

  // const containerRef = React.createRef<HTMLDivElement>();
  // const contentRef = React.useRef<HTMLDivElement>(null);
  const [, setLoaded] = React.useState<boolean>(false);
  const [containerDom, setContainerDom] = React.useState<HTMLElement>();

  const containerRefCb = React.useCallback((dom: HTMLDivElement | null) => {
    if (dom)
      setContainerDom(dom);
  }, []);

  React.useEffect(() => {
    setLoaded(false);
    if (props.mdKey && getState().computed.reactHtml[props.mdKey] == null) {
      dispatcher.getHtml(props.mdKey);
    }
  }, [props.mdKey]);

  const [htmlObj, setHtmlObj] = React.useState<{__html: string}>(EMPTY_HTML_OBJ);

  React.useEffect(() => {
    if (props.mdKey != null && getState().computed.reactHtml[props.mdKey] && containerDom) {
      // containerDom.innerHTML = getState().computed.reactHtml[props.mdKey].__html;
      setHtmlObj(getState().computed.reactHtml[props.mdKey]);

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
    props.mdKey != null ? getState().computed.reactHtml[props.mdKey] : null,
    props.onContent
  ]);

  const [, touchState] = React.useState<unknown>(null); // enable React reconcilation/dirty-check
  React.useEffect(() => {
    if (props.mdKey == null)
      return;
    const state$ = getStore();
    const sub = state$.pipe(
      op.map(s => s.computed.reactHtml[props.mdKey!]?.__html),
      op.distinctUntilChanged()
    ).subscribe({next(s) {
      touchState({});
    }});
    return () => sub.unsubscribe();
  }, [props.mdKey]);

  return (
    <SwitchAnim className={cls('switchAnim')} innerClassName={styles.container} contentHash={props.mdKey}>
      <>
        <div ref={containerRefCb} className="markdown-body" dangerouslySetInnerHTML={htmlObj}></div>
        {props.mdKey ? <TableOfContents markdownKey={props.mdKey} /> : '...'}
      </>
    </SwitchAnim>
  );
});


const mermaidInited = false;

async function drawMermaidDiagram(id: string, mermaidStr: string | null): Promise<string> {
  const mermaid = (await import('mermaid/dist/mermaid.esm.mjs')).default;
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

