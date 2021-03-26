import React from 'react';
import classnames from 'classnames/bind';
import 'github-markdown-css/github-markdown.css';
import styles from './MarkdownViewComp.module.scss';
import {getState, dispatcher} from './markdownSlice';
import {connect} from 'react-redux';
import {useParams} from 'react-router-dom';
import unescape from 'lodash/unescape';
import {MarkdownIndex} from './MarkdownIndex';
// import mermaid from 'mermaid';
import 'highlight.js/scss/solarized-light.scss';
// import * as op from 'rxjs/operators';
const cx = classnames.bind(styles);
const cls = 'markdown-body';

let mermaidIdSeed = 0;
export interface MarkdownViewCompProps {
  /** markdown file relative path, which is compiled by markdown-loader */
  mdKey?: string;
  onContent?: (dom: HTMLDivElement) => void;
  scrollBodyRef: React.RefObject<HTMLDivElement>;
}

const MarkdownViewComp: React.FC<MarkdownViewCompProps> = function(props0) {
  const props = props0 as ReturnType<ReturnType<typeof mapToPropFactory>>;
  const routeParams = useParams<{mdKey: string}>();
 // {__html: props.contents[routeParams.mdKey]}

  React.useEffect(() => {}, []);

  const containerRef = React.createRef<HTMLDivElement>();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (props.mdKey) {
      setLoaded(false);
      dispatcher.getHtml(props.mdKey);
    }
  }, [props.mdKey]);

  React.useEffect(() => {
    if (props.mdKey != null && props.contents[routeParams.mdKey] && props.onContent && containerRef.current) {
      props.onContent(containerRef.current);
      containerRef.current.querySelectorAll('.language-mermaid').forEach(async el => {
        el.id = 'mermaid-diagram-' + mermaidIdSeed++;
        const container = document.createElement('div');
        el.parentElement!.insertBefore(container, el);
        // TODO: can been moved to a Worker !!
        const svgStr = await drawMermaidDiagram(el.id, unescape(el.innerHTML));
        container.innerHTML = svgStr;
        // el.innerHTML = svgStr;
      });
      setLoaded(true);
    }
  }, [containerRef.current,
    props.mdKey != null ? props.contents[routeParams.mdKey] : null
  ]);

  if (props.mdKey) {
    return (
      <div ref={contentRef}>
        {loaded ? <MarkdownIndex mdKey={props.mdKey} scrollRef={props.scrollBodyRef} contentRef={contentRef} /> : null}
        <div ref={containerRef} className={cls} dangerouslySetInnerHTML={props.contents[props.mdKey]}></div>
      </div>
    );
  }
  return <>Loading ...</>;
};

function mapToPropFactory() {
  return function(rootState: any, props: MarkdownViewCompProps) {
    return {
      ...props,
      contents: getState().computed.reactHtml
    };
  };
}
const connected = connect(mapToPropFactory)(MarkdownViewComp);

let mermaidInited = false;

async function drawMermaidDiagram(id: string, mermaidStr: string | null): Promise<string> {
  const mermaid = (await import('mermaid')).default;
  if (mermaidStr == null)
    return Promise.resolve('');
  if (!mermaidInited) {
    mermaid.initialize({
      securityLevel: 'loose',
      startOnLoad:false
    });
  }

  return new Promise<string>(resolve => {
    mermaid.render(id, mermaidStr, (svgCode, bindFn) => {
      resolve(svgCode);
    });
  })
  .catch(err => {
    console.error('Failed to draw mermaid diagram', err);
    return '';
  });
}

export {connected as MarkdownViewComp};

