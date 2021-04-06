import React from 'react';
// import classnames from 'classnames/bind';
import 'github-markdown-css/github-markdown.css';
import './MarkdownViewComp.module.scss';
import {getState, dispatcher} from './markdownSlice';
import {connect} from 'react-redux';
import unescape from 'lodash/unescape';
import {MarkdownIndex} from './MarkdownIndex';
import {InjectedCompPropsType} from '@wfh/redux-toolkit-observable/es/react-redux-helper';
import {SwitchAnim} from '../animation/SwitchAnim';

// import mermaid from 'mermaid';
import 'highlight.js/scss/solarized-light.scss';
// import * as op from 'rxjs/operators';
// const cx = classnames.bind(styles);

let mermaidIdSeed = 0;
export interface MarkdownViewCompProps {
  /** markdown file relative path, which is compiled by markdown-loader */
  mdKey?: string;
  onContent?: (dom: HTMLElement) => void;
}

const ConnectHOC = connect(mapToPropsFactory, {}, null, {forwardRef: true});

const MarkdownViewComp: React.FC<InjectedCompPropsType<typeof ConnectHOC>> = function(props) {
  // const routeParams = useParams<{mdKey: string}>();
 // {__html: props.contents[routeParams.mdKey]}

  React.useEffect(() => {}, []);

  // const containerRef = React.createRef<HTMLDivElement>();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [containerDom, setContainerDom] = React.useState<HTMLElement>();

  const containerRefCb = React.useCallback((dom: HTMLDivElement) => {
    setContainerDom(dom);
  }, []);

  React.useEffect(() => {
    setLoaded(false);
    // console.log(props.mdKey);
    if (props.mdKey) {
      dispatcher.getHtml(props.mdKey);
    }
  }, [props.mdKey]);

  React.useEffect(() => {
    // console.log(props.contents[props.mdKey!], containerDom, props.mdKey);
    if (props.mdKey != null && props.contents[props.mdKey] && containerDom) {
      containerDom.innerHTML = props.contents[props.mdKey].__html;

      setTimeout(() => {
        containerDom.querySelectorAll('.language-mermaid').forEach(async el => {
          el.id = 'mermaid-diagram-' + mermaidIdSeed++;
          const container = document.createElement('div');
          el.parentElement!.insertBefore(container, el);
          // TODO: can been moved to a Worker !!
          const svgStr = await drawMermaidDiagram(el.id, unescape(el.innerHTML));
          container.innerHTML = svgStr;
          // el.innerHTML = svgStr;
        });

        setLoaded(true);
        if (props.onContent) {
          props.onContent(containerDom);
        }
      }, 20);

    }
  }, [
    containerDom,
    props.mdKey != null ? props.contents[props.mdKey] : null,
    props.onContent
  ]);

  if (props.mdKey) {
    return (
      <div ref={contentRef}>
        {loaded ? <MarkdownIndex mdKey={props.mdKey} contentRef={contentRef} /> : <>Loading ...</>}
        <SwitchAnim contentHash={props.mdKey}>
          <div ref={containerRefCb} className='markdown-body'></div>
        </SwitchAnim>
      </div>
    );
  }
  return <></>;
};

function mapToPropsFactory(rootState: unknown, ownProps: MarkdownViewCompProps) {
  return function(rootState: any, props: MarkdownViewCompProps) {
    return {
      contents: getState().computed.reactHtml
    };
  };
}
const connected = ConnectHOC(MarkdownViewComp);

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

