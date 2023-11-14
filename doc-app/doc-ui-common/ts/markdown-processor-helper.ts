import * as rx from 'rxjs';
import type {DefaultTreeAdapterMap} from 'parse5';
import findLastIndex from 'lodash/findLastIndex';
import {TOC} from '../isom/md-types';

export type ChildNode = DefaultTreeAdapterMap['childNode'];
export type Element = DefaultTreeAdapterMap['element'];
export type TextNode = DefaultTreeAdapterMap['textNode'];

export function lookupTextNodeIn(el: Element) {
  const chr = new rx.BehaviorSubject<ChildNode[]>(el.childNodes || []);
  let text = '';
  chr.pipe(
    rx.mergeMap(children => rx.from(children))
  ).pipe(
    rx.map(node => {
      if (node.nodeName === '#text') {
        text += (node as TextNode).value;
      } else if ((node as Element).childNodes) {
        chr.next((node as Element).childNodes);
      }
    })
  ).subscribe();
  return text;
}

export function createTocTree(input: TOC[]) {
  const root: TOC = {level: -1, tag: 'h0', text: '', id: '', children: []};
  const byLevel: TOC[] = [root]; // a stack of previous TOC items ordered by level
  let prevHeaderWeight = Number(root.tag.charAt(1));
  for (const item of input) {
    const headerWeight = Number(item.tag.charAt(1));
    // console.log(`${headerWeight} ${prevHeaderWeight}, ${item.text}`);
    if (headerWeight < prevHeaderWeight) {
      const pIdx = findLastIndex(byLevel, toc => Number(toc.tag.charAt(1)) < headerWeight);
      byLevel.splice(pIdx + 1);
      addAsChild(byLevel[pIdx], item);
    } else if (headerWeight === prevHeaderWeight) {
      byLevel.pop();
      const parent = byLevel[byLevel.length - 1];
      addAsChild(parent, item);
    } else {
      const parent = byLevel[byLevel.length - 1];
      addAsChild(parent, item);
    }
    prevHeaderWeight = headerWeight;
  }

  function addAsChild(parent: TOC, child: TOC) {
    if (parent.children == null)
      parent.children = [child];
    else
      parent.children.push(child);
    child.level = byLevel[byLevel.length - 1] ? byLevel[byLevel.length - 1].level + 1 : 0;
    byLevel.push(child);
  }
  return root.children!;
}
