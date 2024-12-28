import {BaseWidget} from './base';

export function findLowestCommonAncestor(...comps: BaseWidget[]): BaseWidget | null | undefined {
  if (comps.length === 1)
    return comps[0];
  else if (comps.length === 0)
    throw new Error('Empty parameters');
  else if (comps.length > 2) {
    const a = findLowestCommonAncestor(comps[0], comps[1]);
    if (a == null)
      return null;
    const b = findLowestCommonAncestor(a, ...comps.slice(2));
    return b;
  } else {
    // comps.length === 2
    let [a, deeper] = comps;
    if (a.table.getData().depth[0]! > deeper.table.getData().depth[0]!) {
      const temp = a;
      a = deeper;
      deeper = temp;
    }
    let depth = deeper.table.getData().depth[0]!;
    const aDepth = a.table.getData().depth[0]!;
    while (depth > 0 && depth > aDepth) {
      deeper = deeper.table.getData().setParent[0]!;
      depth--;
    }
    // same depth
    let pa: typeof a | undefined | null = a;
    let pb: typeof deeper | undefined | null = deeper;
    while (pa != null && pb != null && pa !== pb) {
      pa = pa.table.getData().setParent[0];
      pb = pb.table.getData().setParent[0];
    }
    if (pa === pb) {
      return pa;
    }
    return null;
  }
}
