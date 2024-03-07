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
import {createMarkdownViewControl, Actions} from './markdownViewComp.control';
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
    control.i.ft.setMermaidClassName(styles.mermaidDiagram).dp();
    return control;
  }, []);
  const {outputTable, i, dispose, inputTable} = viewControl;

  const router = useRouter();
  React.useEffect(() => {
    if (router)
      i.ft.setRouter(router).dp();
  }, [i.ft, router]);

  const layout = useAppLayout();
  React.useEffect(() => {
    if (layout) {
      i.ft.setLayoutControl(layout).dp();
      i.ft.setScrollTopHandler(() => layout.i.dp.scrollTo(0, 0)).dp();
    }
  }, [i.ft, layout]);

  React.useEffect(() => {
    if (layout) {
      const sub = layout.inputTable.dataChange$.subscribe((v) => touchState(v));
      return () => sub.unsubscribe();
    }
  }, [layout]);

  React.useEffect(() => {
    if (props.mdKey) {
      i.ft.setMarkdownKey(props.mdKey).dp();
      markdownsControl.i.ft.getHtml(props.mdKey).dp();
    }
  }, [i.ft, props.mdKey]);

  React.useEffect(() => () => dispose(), [dispose]);

  const switchAnimDataByKey = React.useMemo(() => new Map<string, {mdKey: string; onBodyRef(ref: HTMLDivElement | null): void}>(), []);
  React.useEffect(() => {
    if (props.mdKey && !switchAnimDataByKey.has(props.mdKey)) {
      switchAnimDataByKey.set(props.mdKey, {
        mdKey: props.mdKey,
        onBodyRef(ref) {
          if (ref && props.mdKey)
            i.ft.setMarkdownBodyRef(ref, props.mdKey).dp();
        }
      });
    }
  }, [i.ft, props.mdKey, switchAnimDataByKey]);

  const handleTogglePopup = React.useCallback((...args: Parameters<Actions['handleTogglePopup']>) => {
    i.ft.handleTogglePopup(...args).dp();
  }, [i.ft]);
  const templateRenderer = React.useCallback(function({mdKey, onBodyRef}: typeof switchAnimDataByKey extends Map<string, infer V> ? V : unknown) {
    return <>
      <div ref={onBodyRef} className={cln(
        styles.markdownContent, 'markdown-body', 'mdc-layout-grid__cell', 'mdc-layout-grid__cell--span-9-desktop',
        'mdc-layout-grid__cell--span-6-tablet', 'mdc-layout-grid__cell--span-6'
      )}></div>
      {
        mdKey ?
          <TableOfContents className={cln(
            styles.toc, 'mdc-layout-grid__cell', 'mdc-layout-grid__cell--span-3-desktop', 'mdc-layout-grid__cell--span-2-tablet', {'mdc-layout-grid': layout?.inputTable.getData().setDeviceSize[0] === 'phone'}
          ) }
          markdownKey={mdKey}
          markdownViewCtl={viewControl}/> :
          '...'
      }
      {
        inputTable.getData().hasToc ?
          <IconButton className={styles.tocPopBtn}
            onToggle={handleTogglePopup}
            materialIcon="toc"
            materialIconToggleOn="close"/> :
          null
      }
    </>;
  }, [handleTogglePopup, layout?.inputTable, viewControl]);

  const [updatedKey, templateDataMap] = outputTable.getData().setSwitchAnimTemplates;

  return <>
    {outputTable.getData().setFileInputVisible[0] ? <div><FileInput>Select markdown file</FileInput></div> : null}
    {updatedKey && templateDataMap ?
      <SwitchAnim type="translateY" debug={true} className={cls('switchAnim')}
        superSlow={false}
        innerClassName={cln(styles.container, 'mdc-layout-grid__inner')}
        templateData={templateDataMap.get(updatedKey)} switchOnDistinct={updatedKey} templateRenderer={templateRenderer} /> :
      null}
  </>;
});

