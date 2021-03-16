import React from 'react';
import classnames from 'classnames/bind';
import 'github-markdown-css/github-markdown.css';
import styles from './MarkdownViewComp.module.scss';
import {getState, dispatcher} from './markdownSlice';
import {connect} from 'react-redux';
import {useParams} from 'react-router-dom';
// import * as op from 'rxjs/operators';
const cx = classnames.bind(styles);
const cls = 'markdown-body';

export interface MarkdownViewCompProps {
  /** markdown file relative path, which is compiled by markdown-loader */
  mdKey?: string;
  onContent?: (dom: HTMLDivElement) => void;
}

const MarkdownViewComp: React.FC<MarkdownViewCompProps> = function(props0) {
  const props = props0 as ReturnType<ReturnType<typeof mapToPropFactory>>;
  const routeParams = useParams<{mdKey: string}>();

  const containerRef = React.createRef<HTMLDivElement>();

  React.useEffect(() => {
    if (props.mdKey) {
      dispatcher.getHtml(props.mdKey);
    }
  }, [props.mdKey]);

  React.useEffect(() => {
    if (props.mdKey != null && props.contents[routeParams.mdKey] && props.onContent && containerRef.current) {
      props.onContent(containerRef.current);
    }
  }, [containerRef.current,
    props.mdKey != null ? props.contents[routeParams.mdKey] : null
  ]);

  if (routeParams.mdKey) {
    return (
      <div ref={containerRef} className={cls} dangerouslySetInnerHTML={{__html: props.contents[routeParams.mdKey]}}></div>
    );
  }
  return <>Loading ...</>;
};

function mapToPropFactory() {
  return function(rootState: any, props: MarkdownViewCompProps) {
    return {
      ...props,
      contents: getState().contents
    };
  };
}
const connected = connect(mapToPropFactory)(MarkdownViewComp);

export {connected as MarkdownViewComp};

