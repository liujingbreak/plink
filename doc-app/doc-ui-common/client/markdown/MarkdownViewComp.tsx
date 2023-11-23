import React from 'react';
import * as rx from 'rxjs';
import classnames from 'classnames/bind';
import cln from 'classnames';
import 'github-markdown-css/github-markdown.css';
import {IconButton, IconButtonProps} from '@wfh/material-components-react/client/IconButton';
import {useRouter} from '../animation/AnimatableRoutes.hooks';
import {SwitchAnim} from '../animation/SwitchAnim';
import {useAppLayout} from '../components/appLayout.control';
import {markdownsControl} from './markdownSlice';
import {markdownViewControl} from './markdownViewComp.control';
import styles from './MarkdownViewComp.module.scss';
import {TableOfContents} from './toc/TableOfContents';

const cls = classnames.bind(styles);

export type MarkdownViewCompProps = {
  /** markdown file relative path, which is compiled by markdown-loader */
  mdKey?: string;
  onContent?: (dom: HTMLElement) => void;
};

const {inputTable, outputTable, i} = markdownViewControl;
i.dp.setMermaidClassName(styles.mermaidDiagram);

export const MarkdownViewComp = React.memo<MarkdownViewCompProps>(function(props) {
  const router = useRouter();
  React.useEffect(() => {
    if (router)
      i.dp.setRouter(router);
  }, [router]);

  const layout = useAppLayout();
  React.useEffect(() => {
    if (layout) {
      i.dp.setScrollTopHandler(() => layout.i.dp.scrollTo(0, 0));
    }
  }, [layout]);

  React.useEffect(() => {
    if (props.mdKey)
      markdownsControl.i.dp.getHtml(props.mdKey);
  }, [props.mdKey]);

  React.useEffect(() => () => markdownViewControl.destory(), []);

  const [, touchState] = React.useState<unknown>(null); // enable React reconcilation/dirty-check
  React.useEffect(() => {
    if (props.mdKey == null)
      return;
    const sub = rx.merge(outputTable.dataChange$, inputTable.dataChange$).pipe(
      rx.tap(() => touchState({}))
    ).subscribe();
    return () => sub.unsubscribe();
  }, [props.mdKey]);

  // const [containerDom, setContainerDom] = React.useState<HTMLDivElement | null>();
  const onbodyRef = React.useCallback((el: HTMLDivElement | null) => {
    if (el) {
      i.dp.setMarkdownBodyRef(el);
    }
  }, []);

  React.useEffect(() => {
    if (props.mdKey) {
      i.dp.setMarkdownKey(props.mdKey);
    }
  }, [props.mdKey]);

  const tocDp = inputTable.getData().setTocDispatcher[0];
  const tocPopupIconCb = React.useCallback<NonNullable<IconButtonProps['onToggle']>>((isOn, toggleIcon) => {
    if (tocDp)
      tocDp.togglePopup(isOn, toggleIcon);
  }, [tocDp]);

  return (
    <SwitchAnim debug={false} className={cls('switchAnim')} innerClassName={styles.container} contentHash={props.mdKey}>
      <>
        <div ref={onbodyRef} className={cln(styles.markdownContent, 'markdown-body')}></div>
        {props.mdKey ? <TableOfContents getDispatcher={i.dp.setTocDispatcher} className={styles.toc} markdownKey={props.mdKey} /> : '...'}
        <IconButton className={styles.tocPopBtn}
          onToggle={tocPopupIconCb}
          materialIcon="toc"
          materialIconToggleOn="close"/>
      </>
    </SwitchAnim>
  );
});

