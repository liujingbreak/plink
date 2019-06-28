/* tslint:disable no-console max-line-length */
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { Schema as NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { Schema as NormalizedServerBuilderServerSchema } from '@angular-devkit/build-angular/src/server/schema';
import {json} from '@angular-devkit/core';
import __changeWebpackConfig from '../config-webpack';
import webpack from 'webpack';
import api from '__api';

export type DrcpConfig = typeof api.config;

export async function initCli(options: any) {
  const drcpConfigFiles = options.drcpConfig ? (options.drcpConfig as string).split(/\s*[,;:]\s*/) : [];
  return initDrcp(options.drcpArgs, drcpConfigFiles);
}
async function initDrcp(drcpArgs: any, drcpConfigFiles: string[]): Promise<DrcpConfig> {
  var config = require('dr-comp-package/wfh/lib/config');

  if (drcpArgs.c == null)
    drcpArgs.c = [];
  drcpArgs.c.push(...drcpConfigFiles);
  await config.init(drcpArgs);
  require('dr-comp-package/wfh/lib/logConfig')(config());
  return config;
}

export function configWebpack(param: AngularCliParam, webpackConfig: webpack.Configuration,
  drcpConfigSetting: {devMode: boolean}) {
  const changeWebpackConfig: typeof __changeWebpackConfig = require('../config-webpack').default;
  changeWebpackConfig(param, webpackConfig, drcpConfigSetting);
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
