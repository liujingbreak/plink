import React from 'react';
import classnames from 'classnames/bind';
import cln from 'classnames';
import 'github-markdown-css/github-markdown.css';
import {IconButton} from '@wfh/material-components-react/client/IconButton';
import {useRouter} from '../animation/AnimatableRoutes.hooks';
import {SwitchAnim} from '../animation/SwitchAnim';
import {useAppLayout} from '../components/appLayout.control';
import {FileInput} from '../components/file-widgets/file-input';
import {markdownsControl} from './markdownSlice';
import {createMarkdownViewControl} from './markdownViewComp.control';
import styles from './MarkdownViewComp.module.scss';
import {TableOfContents} from './toc/TableOfContents';

const cls = classnames.bind(styles);

export type MarkdownViewCompProps = {
  /** markdown file relative path, which is compiled by markdown-loader */
  mdKey?: string;
  onContent?: (dom: HTMLElement) => void;
};

export const MarkdownViewComp = React.memo<MarkdownViewCompProps>(function(props) {
  const [, touchState] = React.useState<unknown>(null); // enable React reconcilation/dirty-check
  const viewControl = React.useMemo(() => {
    const control = createMarkdownViewControl(touchState);
    control.i.dp.setMermaidClassName(styles.mermaidDiagram);
    return control;
  }, []);
  const {outputTable, i, dispose} = viewControl;

  const router = useRouter();
  React.useEffect(() => {
    if (router)
      i.dp.setRouter(router);
  }, [i.dp, router]);

  const layout = useAppLayout();
  React.useEffect(() => {
    if (layout) {
      i.dp.setLayoutControl(layout);
      i.dp.setScrollTopHandler(() => layout.i.dp.scrollTo(0, 0));
    }
  }, [i.dp, layout]);

  React.useEffect(() => {
    if (layout) {
      const sub = layout.inputTable.dataChange$.subscribe((v) => touchState(v));
      return () => sub.unsubscribe();
    }
  }, [layout]);

  React.useEffect(() => {
    if (props.mdKey) {
      i.dp.setMarkdownKey(props.mdKey);
      markdownsControl.i.dp.getHtml(props.mdKey);
    }
  }, [i.dp, props.mdKey]);

  // React.useEffect(() => {
  //   const sub = rx.merge(outputTable.dataChange$, inputTable.dataChange$).pipe(
  //     rx.tap(data => console.log('------------------touched', data)),
  //     rx.tap(() => touchState({}))
  //   ).subscribe();

  //   return () => sub.unsubscribe();
  // }, [inputTable.dataChange$, outputTable.dataChange$]);

  React.useEffect(() => () => dispose(), [dispose]);

  const switchAnimDataByKey = React.useMemo(() => new Map<string, {mdKey: string; onBodyRef(ref: HTMLDivElement | null): void}>(), []);
  React.useEffect(() => {
    if (props.mdKey && !switchAnimDataByKey.has(props.mdKey)) {
      switchAnimDataByKey.set(props.mdKey, {
        mdKey: props.mdKey,
        onBodyRef(ref) {
          if (ref && props.mdKey)
            i.dp.setMarkdownBodyRef(ref, props.mdKey);
        }
      });
    }
  }, [i.dp, props.mdKey, switchAnimDataByKey]);

  function templateRenderer({mdKey, onBodyRef}: typeof switchAnimDataByKey extends Map<string, infer V> ? V : unknown) {
    return <>
      <div ref={onBodyRef} className={cln(
        styles.markdownContent, 'markdown-body', 'mdc-layout-grid__cell', 'mdc-layout-grid__cell--span-8-desktop',
        'mdc-layout-grid__cell--span-6-tablet', 'mdc-layout-grid__cell--span-6'
      )}></div>
      {mdKey ? <TableOfContents className={cln(styles.toc, 'mdc-layout-grid__cell', 'mdc-layout-grid__cell--span-4-desktop', 'mdc-layout-grid__cell--span-2-tablet', {'mdc-layout-grid': layout?.inputTable.getData().setDeviceSize[0] === 'phone'}) } markdownKey={mdKey} markdownViewCtl={viewControl}/> : '...'}
      <IconButton className={styles.tocPopBtn}
        onToggle={i.dp.handleTogglePopup}
        materialIcon="toc"
        materialIconToggleOn="close"/>
    </>;
  }

  const tempalteData = props.mdKey ? switchAnimDataByKey.get(props.mdKey) : null;
  return <>
    {outputTable.getData().setFileInputVisible[0] ? <div><FileInput>Select markdown file</FileInput></div> : null}
    {props.mdKey && tempalteData ?
      <SwitchAnim type="translateY" debug={true} className={cls('switchAnim')} innerClassName={cln(styles.container, 'mdc-layout-grid__inner')}
        templateData={tempalteData} switchOnDistinct={props.mdKey} templateRenderer={templateRenderer} /> :
      null}
  </>;
});

