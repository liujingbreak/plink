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
  workspace: Set<string>;
  projectSource: Map<string, Set<string>>;
}

const initialState: CleanState = {
  workspace: new Set(),
  projectSource: new Map()
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
      const nativeState = getState();
      if (!nativeState.projectSource.has(project)) {
        state.projectSource.set(project, new Set());
      }
      for (const file of files) {
        if (!nativeState.projectSource.get(project)!.has(file))
          state.projectSource.get(project)!.add(file);
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


