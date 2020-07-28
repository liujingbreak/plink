import fs from 'fs-extra';
import _ from 'lodash';
// import Path from 'path';
// import * as recipeManager from '../recipe-manager';
import {stateFactory} from '../store';
import scanNodeModules from '../utils/symlinks';
import {PayloadAction} from '@reduxjs/toolkit';

export default async function clean(onlySymlink = false) {
  // logConfig(config());
  await scanNodeModules('all');
  if (!onlySymlink) {
    const deleteFiles = [
      'dist', 'yarn.lock', 'package-lock.json', 'yarn-error.log',
      'dr.package.json.bak'
    ];
    await Promise.all(deleteFiles.map(target => fs.remove(target)));
  }
}
/**
 * Files needs to be clean
 */
export interface CleanState {
  workspace: {[path: string]: boolean};
  projectSource: {[project: string]: {[path: string]: boolean}};
}

const initialState: CleanState = {
  workspace: {},
  projectSource: {}
};

export const slice = stateFactory.newSlice({
  name: 'clean',
  initialState,
  reducers: {
    addWorkspaceFile(state, {payload: files}: PayloadAction<string[]>) {
      for (const file of files)
        state.workspace[file] = true;
    },
    addSourceFile(state, {payload: {project, files}}: PayloadAction<{project: string, files: string[]}>) {
      const nativeState = stateFactory.sliceState(slice)!;
      if (!_.has(nativeState.projectSource, project)) {
        state.projectSource[project] = {};
      }
      for (const file of files) {
        if (!_.has(nativeState.projectSource[project], file))
          state.projectSource[project][file] = true;
      }
    }
  }
});

// rootStore.addEpic<any, any, PayloadAction>((action$, state$) => {
//   return of<PayloadAction>(slice.actions.change(d => ));
// });

export function getState() {
  return stateFactory.sliceState(slice);
}

export function getStore() {
  return stateFactory.sliceStore(slice);
}
export const actions = stateFactory.bindActionCreators(slice);
export type ActionsType = typeof actions extends Promise<infer T> ? T : unknown;


