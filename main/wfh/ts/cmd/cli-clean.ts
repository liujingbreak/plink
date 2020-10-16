import { from, merge, of } from 'rxjs';
import { catchError, concatMap, ignoreElements } from 'rxjs/operators';
// import Path from 'path';
// import * as recipeManager from '../recipe-manager';
import { ofPayloadAction, stateFactory } from '../store';
import scanNodeModules from '../utils/symlinks';

/**
 * Files needs to be clean
 */
// tslint:disable-next-line: no-empty-interface
export interface CleanState {
  // workspace: Set<string>;
  // projectSource: Map<string, Set<string>>;
}

const initialState: CleanState = {
  // workspace: new Set(),
  // projectSource: new Map()
};

export const slice = stateFactory.newSlice({
  name: 'clean',
  initialState,
  reducers: {
    deleteSymlinks() {
    }
  }
});

const {deleteSymlinks} = stateFactory.bindActionCreators(slice);
export { deleteSymlinks };

stateFactory.addEpic((action$, state$) => {
  return merge(
    action$.pipe(
      ofPayloadAction(slice.actions.deleteSymlinks),
      concatMap(() => {
        return from(scanNodeModules('all'));
      })
    )
  ).pipe(
    ignoreElements(),
    catchError(err => {
      console.error('[package-mgr.index]', err.stack ? err.stack : err);
      return of();
    })
  );
});

export function getState() {
  return stateFactory.sliceState(slice);
}

export function getStore() {
  return stateFactory.sliceStore(slice);
}
export const actions = stateFactory.bindActionCreators(slice);


