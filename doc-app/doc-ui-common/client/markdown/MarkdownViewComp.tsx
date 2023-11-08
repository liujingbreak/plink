import React from 'react';
import * as rx from 'rxjs';
import classnames from 'classnames/bind';
import cln from 'classnames';
import 'github-markdown-css/github-markdown.css';
import {IconButton} from '@wfh/material-components-react/client/IconButton';
import {SwitchAnim} from '../animation/SwitchAnim';
import {markdownsControl} from './markdownSlice';
import styles from './MarkdownViewComp.module.scss';
import {TableOfContents, TocInputDispatcher} from './toc/TableOfContents';

const cls = classnames.bind(styles);

export type MarkdownViewCompProps = {
  /** markdown file relative path, which is compiled by markdown-loader */
  mdKey?: string;
  onContent?: (dom: HTMLElement) => void;
};

const {outputTable, i} = markdownsControl;
i.dp.setMermaidClassName(styles.mermaidDiagram);

export const MarkdownViewComp = React.memo<MarkdownViewCompProps>(function(props) {

  React.useEffect(() => {
    if (props.mdKey)
      i.dp.getHtml(props.mdKey);
  }, [props.mdKey]);


  const [, touchState] = React.useState<unknown>(null); // enable React reconcilation/dirty-check
  React.useEffect(() => {
    if (props.mdKey == null)
      return;
    const sub = outputTable.dataChange$.pipe(
      rx.tap(() => touchState({}))
    ).subscribe();
    return () => sub.unsubscribe();
  }, [props.mdKey]);

  const [tocInputDp, setTocInputDp] = React.useState<TocInputDispatcher | undefined>();

  const onContainer = React.useCallback((dom: HTMLDivElement | null) => {
    if (props.mdKey) {
      i.dp.setMarkdownBodyRef(props.mdKey, dom);
      if (dom) {
        tocInputDp?.setMarkdownBodyRef(props.mdKey, dom);
      }
    }
  }, [props.mdKey, tocInputDp]);


  return (
    <SwitchAnim className={cls('switchAnim')} innerClassName={styles.container} contentHash={props.mdKey}>
      <>
        <div ref={onContainer} className={cln(styles.markdownContent, 'markdown-body')}></div>
        {props.mdKey ? <TableOfContents getDispatcher={setTocInputDp} className={styles.toc} markdownKey={props.mdKey} /> : '...'}
        <IconButton className={styles.tocPopBtn}
          onToggle={tocInputDp?.togglePopup}
          materialIcon="toc"
          materialIconToggleOn="close"/>
      </>
    </SwitchAnim>
  );
});

