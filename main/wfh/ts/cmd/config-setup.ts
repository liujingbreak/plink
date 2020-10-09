import chalk from 'chalk';
import log4js from 'log4js';
import _ from 'lodash';
import fs from 'fs';
import Path from 'path';
import * as packageUtils from '../package-utils';
import config from '../config';
const jsYaml = require('js-yaml');
const log = log4js.getLogger('wfh.cliAdvanced');


export function addupConfigs(onEachYaml: (file: string, configContent: string) => void) {
  const componentConfigs: {
    outputPathMap: {[k: string]: string};
    vendorBundleMap: {[k: string]: string[]};
    browserSideConfigProp: string[]
  } = {outputPathMap: {}, vendorBundleMap: {}, browserSideConfigProp: []};
  const vendorBundleMap = componentConfigs.vendorBundleMap;
  const browserSideConfigProp = componentConfigs.browserSideConfigProp;
  // var entryPageMapping = componentConfigs.entryPageMapping;
  const componentConfigs4Env = {}; // key is env:string, value is componentConfigs
  const trackOutputPath = {}; // For checking conflict
  for (const pkg of packageUtils.allPackages()) {
    const {name, json, shortName} = pkg;
  // packageUtils.findAllPackages(
  // (name: string, entryPath: string, parsedName: {name: string, scope: string}, json: any, packagePath: string) => {
    const dr = pkg.json.dr;
    if (!dr)
      continue;

    // component customized configuration properties
    _addupCompConfigProp(componentConfigs, name, browserSideConfigProp, dr.config);
    _.each(dr, (value, key) => {
      const m = /^config\.(.*)$/.exec(key);
      if (!m)
        return;
      const env = m[1];
      if (!_.has(componentConfigs4Env, env))
        componentConfigs4Env[env] = {browserSideConfigProp: []};
      _addupCompConfigProp(componentConfigs4Env[env], name, componentConfigs4Env[env].browserSideConfigProp, value);
    });

    // outputPath
    var outputPath = dr.outputPath;
    if (outputPath == null)
      outputPath = dr.ngRouterPath;
    if (outputPath == null)
      outputPath = _.get(json, 'dr.output.path', shortName);

    if (_.has(trackOutputPath, outputPath) && trackOutputPath[outputPath] !== name) {
      log.warn(chalk.yellow('[Warning] Conflict package level outputPath setting (aka "ngRouterPath" in package.json) "%s" for both %s and %s, resolve conflict by adding a config file,'), outputPath, trackOutputPath[outputPath], name);
      log.warn(chalk.yellow('%s\'s "outputPath" will be changed to %s'), name, shortName);
      outputPath = shortName;
    }
    trackOutputPath[outputPath] = name;
    componentConfigs.outputPathMap[name] = outputPath;
    // chunks
    var chunk = _.has(json, 'dr.chunk') ? dr.chunk : dr.bundle;
    if (!chunk) {
      if ((dr.entryPage || dr.entryView))
        chunk = shortName; // Entry package should have a default chunk name as its package short name
    }
    if (chunk) {
      if (_.has(vendorBundleMap, chunk))
        vendorBundleMap[chunk].push(name);
      else
        vendorBundleMap[chunk] = [name];
    }
  }

  const superConfig = require('../../config.yaml');
  deeplyMergeJson(superConfig, componentConfigs);
  if (onEachYaml) {
    onEachYaml('config.yaml', jsYaml.safeDump(superConfig));
  }
  // var res = {'config.yaml': jsYaml.safeDump(superConfig)};
  _.each(componentConfigs4Env, (configs, env) => {
    const tmplFile = Path.join(__dirname, 'templates', 'config.' + env + '-template.yaml');
    if (fs.existsSync(tmplFile)) {
      configs = Object.assign(jsYaml.safeLoad(fs.readFileSync(tmplFile, 'utf8'), {filename: tmplFile}), configs);
    }
    // res['config.' + env + '.yaml'] = jsYaml.safeDump(configs);
    if (onEachYaml) {
      onEachYaml('config.' + env + '.yaml', jsYaml.safeDump(configs));
    }
  });
  // cleanPackagesWalkerCache();
  config.reload();
  return Promise.resolve(null);
}

function _addupCompConfigProp(componentConfigs: {[k: string]: any}, compName: string, browserSideConfigProp: string[],
  configJson: {public: any, server: any}) {
  if (!configJson)
    return;
  // component customized configuration properties

  // JSON.parse(JSON.stringify()) is to clone original object which is
  // stored in a redux store as immutable state (by immerJS),
  // I tried lodash clone, but it still keeps "read only" protection on object,
  // so I have to use JSON.parse(JSON.stringify()) instead
  const componentConfig = JSON.parse(JSON.stringify(configJson.public || {}));
  deeplyMergeJson(componentConfig, JSON.parse(JSON.stringify(configJson.server)));

  if (_.size(componentConfig) > 0 )
    componentConfigs[compName] = componentConfig;

  // browserSideConfigProp
  browserSideConfigProp.push(..._.map(_.keys(configJson.public), key => compName + '.' + key));
}

function deeplyMergeJson(target: {[key: string]: any}, src: any,
  customizer?: (tValue: any, sValue: any, key: string) => any) {
  for (const [key, sValue] of Object.entries(src)) {
    const tValue = target[key];
    const c = customizer ? customizer(tValue, sValue, key) : undefined;
    if (c !== undefined)
      target[key] = c;
    else if (Array.isArray(tValue) && Array.isArray(sValue))
      target[key] = _.union(tValue, sValue);
    else if (_.isObject(tValue) && _.isObject(sValue)) {
      deeplyMergeJson(tValue, sValue);
    } else {
      target[key] = sValue;
    }
  }
}
