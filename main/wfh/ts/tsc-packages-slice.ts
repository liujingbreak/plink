import { PayloadAction } from '@reduxjs/toolkit';
import { stateFactory } from './store';
import fs from 'fs';
import Path from 'path';
import {map, mergeMap, distinctUntilChanged, catchError, ignoreElements, debounceTime, reduce,
  skip
} from 'rxjs/operators';
import {of, from, merge, ReplaySubject, Observable} from 'rxjs';
import {getStore as getPkgStore, PackageInfo} from './package-mgr';

export interface PackageJsonTscPropertyItem {
  rootDir: string;
  outDir: string;
  files?: string[];
  /** "references" in tsconfig https://www.typescriptlang.org/docs/handbook/project-references.html */
  references?: string[];
}

interface ConfigItemWithName {
  pkg: string;
  items: PackageJsonTscPropertyItem[];
}

export interface TscState {
  /** key is package name */
  configs: Map<string, PackageJsonTscPropertyItem[]>;
}

const initialState: TscState = {
  configs: new Map()
};

export const tscSlice = stateFactory.newSlice({
  name: 'tsc',
  initialState,
  reducers: {
    // normalizePackageJsonTscProperty(d, action: PayloadAction) {},
    putConfig(draft, {payload}: PayloadAction<{pkg: string, items: PackageJsonTscPropertyItem[]}[]>) {
      for (const {pkg, items} of payload)
        draft.configs.set(pkg, items);
    }
  }
});

export const tscActionDispatcher = stateFactory.bindActionCreators(tscSlice);

const releaseEpic = stateFactory.addEpic((action$) => {
  return merge(
    getPkgStore().pipe(
      map(s => s.srcPackages),
      distinctUntilChanged(),
      skip(1),
      debounceTime(500),
      mergeMap(pkgMap => {
        return merge(...Array.from(pkgMap.values())
          .map(pkg => normalizePackageJsonTscProperty$(pkg)))
          .pipe(
            reduce<ConfigItemWithName>((all, configs) => {
              all.push(configs);
              return all;
            }, [])
          );
      }),
      map(configs => tscActionDispatcher.putConfig(configs))
    )
  ).pipe(
    catchError(ex => {
      // tslint:disable-next-line: no-console
      console.error(ex);
      return of<PayloadAction>();
    }),
    ignoreElements()
  );
});

export function getState() {
  return stateFactory.sliceState(tscSlice);
}

export function getStore() {
  return stateFactory.sliceStore(tscSlice);
}

function normalizePackageJsonTscProperty$(pkg: PackageInfo) {

  const dr = pkg.json.dr;
  let rawConfigs: Observable<PackageJsonTscPropertyItem>;

  if (dr && dr.tsc) {
    const items: PackageJsonTscPropertyItem[] = Array.isArray(dr.tsc) ? dr.tsc : [dr.tsc];
    rawConfigs = from<PackageJsonTscPropertyItem[]>(items);
  } else {
    const rawConfigs2 = new ReplaySubject<PackageJsonTscPropertyItem>();
    rawConfigs = rawConfigs2;
    fs.exists(Path.resolve(pkg.realPath, 'isom'), exists => {
      if (exists) {
        const temp: PackageJsonTscPropertyItem = {rootDir: 'isom', outDir: 'dist'};
        rawConfigs2.next(temp);
      }
      const temp: PackageJsonTscPropertyItem = {
        rootDir: 'ts',
        outDir: 'dist'
      };
      rawConfigs2.next(temp);
      rawConfigs2.complete();
    });
  }
  return rawConfigs.pipe(
    reduce<PackageJsonTscPropertyItem>((all, item) => {
      all.push(item);
      return all;
    }, []),
    map(items => {
      return {pkg: pkg.name, items};
    })
  );
}

if (module.hot) {
  module.hot.dispose(data => {
    stateFactory.removeSlice(tscSlice);
    releaseEpic();
  });
}
