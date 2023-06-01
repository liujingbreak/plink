import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {getStore as getMarkdownStore} from '../markdownSlice';
import {TOC} from '../../../isom/md-types';

export type ItemState = {
  expanded?: boolean;
  highlighted?: boolean;
  children?: string[]; // hashes
} & Omit<TOC, 'children'>;

export type TocUIState = {
  expanded: boolean;
  topLevelItems: string[];
  itemByHash?: Map<string, ItemState>;
};

type TocUIActions = {
  setDataKey(key: string): void;
  expand(isExpand: boolean): void;
  clicked(titleHasg: string): void;
  onContentScroll(): void;
  unmount(): void;
};

export function createControl(uiDirtyCheck: (immutableObj: any) => any) {
  const state$ = new rx.BehaviorSubject<TocUIState>({
    expanded: false,
    topLevelItems: [],
    itemByHash: new Map()
  });
  const tocUiControl = createActionStreamByType<TocUIActions>({debug: 'tocUiControl'});
  rx.merge(
    tocUiControl.actionOfType('setDataKey').pipe(
      op.switchMap(({payload: key}) => {
        const toc$ = new rx.Subject<[toc: TOC, isTop: boolean]>();
        const itemByHash = new Map<string, ItemState>();

        return rx.merge(
          toc$.pipe(
            op.observeOn(rx.queueScheduler),
            op.map(([toc, isTop]) => {
              if (toc.children) {
                // Do not display top level title element, if there is only 1 top level, instead we display 2nd level titles
                toc.children.forEach(chr => toc$.next([chr, !isTop && toc.level === 0]));
              }
              const tocState = {...toc} as ItemState;
              const childToc = (tocState as TOC).children;
              if (childToc) {
                delete tocState.children;
                tocState.children = childToc.map(toc => toc.id);
              }
              itemByHash.set(toc.id, tocState);
              if (isTop) {
                state$.getValue().topLevelItems.push(toc.id);
              }
            })
          ),
          getMarkdownStore().pipe(
            op.map(s => s.contents[key]),
            op.distinctUntilChanged(),
            op.filter(data => data != null),
            op.take(1),
            op.map(data => {
              const topLevelItems = [] as string[];
              state$.getValue().topLevelItems = topLevelItems;
              for (const toc of data.toc) {
                const multipleTopLevelTitles = data.toc.length > 1;
                // Do not display top level title element, if there is only 1 top level, instead we display 2nd level titles
                toc$.next([toc, multipleTopLevelTitles]);
              }
              toc$.complete();
              state$.getValue().itemByHash = itemByHash;
              state$.next(state$.getValue());
            })
          )
        );
      })
    ),
    tocUiControl.actionOfType('expand').pipe(
      op.map(({payload}) => {
        const s = state$.getValue();
        s.expanded = payload;
        state$.next(s);
      })
    ),
    state$.pipe(
      op.map(s => {
        uiDirtyCheck({});
      })
    )
  ).pipe(
    op.takeUntil(tocUiControl.actionOfType('unmount')),
    op.catchError((err, src) => {
      console.error(err);
      void Promise.resolve().then(() => {
        throw new Error(`TableOfContents error ${(err as Error).stack ?? err as string}`);
      });
      return src;
    })
  ).subscribe();

  return [tocUiControl, state$] as const;
}
