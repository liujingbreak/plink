import Path from 'path';
// import Selector from '../utils/ts-ast-query';
// import os from 'os';
import {PayloadAction} from '@reduxjs/toolkit';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {getLogger} from 'log4js';
import {getState as getPkgMgrState, PackageInfo} from '../package-mgr';
// import {Pool} from '@wfh/thread-promise-pool/dist';
import {stateFactory, ofPayloadAction, processExitAction$} from '../store';
import {PropertyMeta} from './config.types';
import {createMainWorkerAndBroker} from './config-view-slice-worker-main';
import {getPackageSettingFiles} from './index';
// import {ConfigHandlerMgr} from '../config-handler';
const log = getLogger('plink.config-view-slice');

export interface ConfigViewState {
  /** key is packageName + ',' + propertyName */
  propertyByName: Map<string, PropertyMeta>;
  /** key is package name */
  packageMetaByName: Map<string, {
    properties: string[];
    typeFile: string;
  }>;
  packageNames?: string[];
  updateChecksum: number;
}

const initialState: ConfigViewState = {
  propertyByName: new Map(),
  packageMetaByName: new Map(),
  updateChecksum: 0
};

export const configViewSlice = stateFactory.newSlice({
  name: 'configView',
  initialState,
  reducers: {
    loadPackageSettingMeta(_d, _action: PayloadAction<{workspaceKey: string; packageName?: string}>) {},
    _packageSettingMetaLoaded(s,
      {payload: [propMetas, dtsFile, pkg]}: PayloadAction<[PropertyMeta[], string, PackageInfo]>) {
      s.packageMetaByName.set(pkg.name, {
        typeFile: dtsFile,
        properties: propMetas.map(item => item.property)
      });

      for (const item of propMetas) {
        s.propertyByName.set(pkg.name + ',' + item.property, item);
      }
    },
    packageSettingsMetaLoaded(s) {
      // Sort packages to move Plink package to the first
      s.packageNames = Array.from(s.packageMetaByName.keys());
      const plinkIdx = s.packageNames.findIndex(name => name === '@wfh/plink');
      s.packageNames.splice(plinkIdx, 1);
      s.packageNames.unshift('@wfh/plink');
      s.updateChecksum++;
    }
  }
});

// type MapValue<M> = M extends Map<string, infer T> ? T : never;

export const dispatcher = stateFactory.bindActionCreators(configViewSlice);
const parallelService = createMainWorkerAndBroker();

stateFactory.addEpic<{configView: ConfigViewState}>((action$, _state$) => {
  return rx.merge(
    action$.pipe(ofPayloadAction(configViewSlice.actions.loadPackageSettingMeta),
      op.switchMap(({payload}) => {
        // const pool = new Pool(os.cpus().length - 1);
        const pkgState = getPkgMgrState();
        const plinkPkg = pkgState.linkedDrcp ? pkgState.linkedDrcp : pkgState.installedDrcp!;

        return Promise.all(Array.from(getPackageSettingFiles(
          payload.workspaceKey, payload.packageName ? new Set([payload.packageName]) : undefined)
        ).concat([ ['wfh/dist/config/config-slice', 'PlinkSettings', '', '', plinkPkg] ])
          .map(async ([typeFile, typeExport, , , pkg]) => {

            const dtsFileBase = Path.resolve(pkg.realPath, typeFile);
            const [, propMetas, dtsFile] = await rx.firstValueFrom(
              parallelService.s.ft.parseDtsInWorker(dtsFileBase, typeExport).do(parallelService.s.pt.parseDtsDone)
            );
            log.debug(propMetas);
            dispatcher._packageSettingMetaLoaded([propMetas, Path.relative(pkg.realPath, dtsFile), pkg]);
          }));
      }),
      op.tap(() => {
        dispatcher.packageSettingsMetaLoaded();
      })
    ),
    processExitAction$.pipe(
      op.tap(() => dispatcher._change(s => {
        s.packageMetaByName.clear();
        s.propertyByName.clear();
      }))
    )
  ).pipe(
    op.catchError((ex, src) => {
      log.error(ex);
      return src;
    }),
    op.ignoreElements()
  );
});

export function getState() {
  return stateFactory.sliceState(configViewSlice);
}

export function getStore() {
  return stateFactory.sliceStore(configViewSlice);
}
