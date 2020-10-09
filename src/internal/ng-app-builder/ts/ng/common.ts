/* tslint:disable no-console max-line-length */
import { DevServerBuilderOptions  } from '@angular-devkit/build-angular';
import { Schema as NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { Schema as NormalizedServerBuilderServerSchema } from '@angular-devkit/build-angular/src/server/schema';
import {json} from '@angular-devkit/core';
import __changeWebpackConfig, {transformIndexHtml as _transformIndexHtml} from '../config-webpack';
// import type api from '__api';
import fs from 'fs-extra';
import nodeCheck from '@wfh/plink/wfh/dist/utils/node-version-check';
import config from '@wfh/plink/wfh/dist/config';
import type {DrcpConfig} from '@wfh/plink/wfh/dist';
import {initProcess, initConfigAsync} from '@wfh/plink/wfh/dist';

// export type DrcpConfig = typeof api.config;

export async function initCli(options: DrcpBuilderOptions): Promise<DrcpConfig> {
  await nodeCheck();
  const drcpConfigFiles = options.drcpConfig ? (options.drcpConfig as string).split(/\s*[,;:]\s*/) : [];
  const config = await initDrcp(options.drcpArgs, drcpConfigFiles);
  fs.mkdirpSync(config.resolve('destDir', 'ng-app-builder.report'));
  return config;
}
async function initDrcp(drcpArgs: any, drcpConfigFiles: string[]): Promise<DrcpConfig> {
  if (drcpArgs.c == null)
    drcpArgs.c = [];
  drcpArgs.c.push(...drcpConfigFiles);
  // console.log('~~~~~~~~~~~~~~~~~~~~~');
  initProcess();
  await import ('@wfh/plink/wfh/dist/package-mgr/index');
  await initConfigAsync({config: drcpArgs.c, prop: drcpArgs.p || drcpArgs.prop || []});

  return config;
}

export type buildWebpackConfigFunc = (browserOptions: AngularBuilderOptions) => any;

export interface AngularCliParam {
  builderConfig?: DevServerBuilderOptions;
  browserOptions: AngularBuilderOptions;
  ssr: boolean; // Is server side / prerender
  // webpackConfig: any;
  // projectRoot: string;
  // argv: any;
}

export type NormalizedAngularBuildSchema = NormalizedBrowserBuilderSchema | NormalizedServerBuilderServerSchema;
// NormalizedKarmaBuilderSchema;

export type AngularBuilderOptions =
  NormalizedBrowserBuilderSchema & NormalizedServerBuilderServerSchema &
  // NormalizedKarmaBuilderSchema &
  DrcpBuilderOptions & json.JsonObject;

export interface DrcpBuilderOptions {
  drcpArgs: any;
  drcpConfig: string;
}

import {BuilderContext, BuilderContextOptions} from './builder-context';

export function newContext(ngBuildOption: AngularCliParam, options?: BuilderContextOptions) {
  const constructor = require('./builder-context').BuilderContext as typeof BuilderContext;
  return new constructor(ngBuildOption, options);
}
