// tslint:disable: prefer-const
import _ from 'lodash';
import fs from 'fs';
import Path from 'path';
import chalk from 'chalk';
import {ConfigHandlerMgr, DrcpSettings, DrcpConfig, ConfigHandler} from './config-handler';
import {GlobalOptions as CliOptions} from './cmd/types';
import {getLanIPv4} from './utils/network-util';
import {getRootDir} from './utils';
// import {getStore as getPckStore} from './package-mgr';
// import {map, distinctUntilChanged} from 'rxjs/operators';

const {cyan} = chalk;
const yamljs = require('yamljs');
let argv: CliOptions | undefined;
// var argv = require('yargs').argv;
require('yamlify/register');
// var publicPath = require('./publicPath');
let handlers: ConfigHandlerMgr;
let rootPath = getRootDir();

let setting: DrcpSettings;
// let localDisabled = false;
let localConfigPath: string[];

(Promise as any).defer = defer;

function defer() {
  var resolve, reject;
  var promise = new Promise(function() {
    resolve = arguments[0];
    reject = arguments[1];
  });
  return {
    resolve,
    reject,
    promise
  };
}

/**
 * read and return configuration
 * @name config
 * @return {object} setting
 */
const config: Partial<DrcpConfig> = (): DrcpSettings => {
  return setting;
};

let initResolve: (value: DrcpSettings) => void;
config.done = new Promise<DrcpSettings>(resolve => {
  initResolve = resolve;
});

config.init = async (_argv: CliOptions) => {
  argv = _argv;
  localConfigPath = argv.config.length > 0 ? argv.config : [Path.join(rootPath, 'dist', 'config.local.yaml')];
  const res = await load();
  initResolve(res);
  return res;
};

config.reload = function reload() {
  setting = {} as DrcpSettings;
  return load();
};

config.set = function(path: string, value: any) {
  _.set(setting, path, value);
  return setting;
};

config.get = function(propPath: string, defaultValue: any) {
  return _.get(setting, propPath, defaultValue);
};

config.setDefault = function(propPath: string, value: any) {
  if (!_.has(setting, propPath)) {
    _.set(setting, propPath, value);
  }
  return setting;
};

/**
 * Resolve a path based on `rootPath`
 * @name resolve
 * @memberof config
 * @param  {string} property name or property path, like "name", "name.childProp[1]"
 * @return {string}     absolute path
 */
config.resolve = function(pathPropName: 'destDir'|'staticDir'|'serverDir', ...paths: string[]) {
  const args = [rootPath, _.get(setting, pathPropName), ...paths];
  return Path.resolve(...args);
};

config.load = load;

config.configHandlerMgr = () => handlers;
/**
 * Load configuration from config.yaml.
 * Besides those properties in config.yaml, there are extra available properties:
 * - rootPath {string} root path, normally it is identical as process.cwd()
 * 	resolved to relative path to this platform package folder, even it is under node_modules
 * 	folder loaded as dependency
 * - projectList
 * - nodePath <workspace>/node_modules
 * - wfhSrcPath meaning wfh source code is linked, it is not installed
 * - _package2Chunk a hash object whose key is `package name`, value is `chunk name`
 */
async function load(fileList?: string[], cliOption?: CliOptions): Promise<DrcpSettings> {
  if (fileList)
    localConfigPath = fileList;

  let cliOpt = cliOption == null ? argv! : cliOption;

  try {
    // log.debug('root Path: ' + rootPath);
    setting = setting || {};
    // setting.projectList = [];
    // some extra config properties
    _.assign(setting, {
      /** @name rootPath
			* @memberof setting
			*/
      rootPath,
      nodePath: Path.join(rootPath, 'node_modules'),
      wfhSrcPath: wfhSrcPath(),
      _package2Chunk: {}
    });

    // Merge from <root>/config.yaml
    var configFileList = [
      Path.resolve(__dirname, '..', 'config.yaml')
    ];
    var rootConfig = Path.resolve(rootPath, 'dist', 'config.yaml');
    if (fs.existsSync(rootConfig))
      configFileList.push(rootConfig);

    configFileList.push(...localConfigPath);

    configFileList.forEach(localConfigPath => mergeFromYamlJsonFile(setting, localConfigPath));
    handlers = new ConfigHandlerMgr(configFileList.filter(name => /\.[tj]s$/.test(name)), rootPath);

    await handlers.runEach<ConfigHandler>((_file, obj, handler) => {
      if (handler.onConfig)
        return handler.onConfig(obj || setting, cliOpt);
    });
    if (setting.recipeFolder) {
      setting.recipeFolderPath = Path.resolve(rootPath, setting.recipeFolder);
    }
    validateConfig();

    // var defaultEntrySet = setting.defaultEntrySet = {};
    // if (setting.defaultEntryPackages) {
    //   [].concat(setting.defaultEntryPackages).forEach(function(entryFile) {
    //     defaultEntrySet[entryFile] = true;
    //   });
    // }
    setting.port = normalizePort(setting.port);

    if (!setting.devMode)
      process.env.NODE_ENV = 'production';
    setting.publicPath = _.trimEnd(setting.staticAssetsURL || '', '/') + '/'; // always ends with /
    setting.localIP = getLanIPv4();
    // setting.hostnamePath = publicPath.getHostnamePath(setting);
    mergeFromCliArgs(setting, cliOpt);
    if (setting.devMode) {
      // tslint:disable-next-line: no-console
      console.log(cyan('[config]') + ' Development mode');
    } else {
      // tslint:disable-next-line: no-console
      console.log(cyan('[config]') + ' Production mode');
    }
    return setting;
  } catch (err) {
    console.error(__filename + ' failed to read config files', err.stack);
    throw err;
  }
}

function mergeFromYamlJsonFile(setting: DrcpSettings, localConfigPath: string) {
  if (!fs.existsSync(localConfigPath)) {
    // tslint:disable-next-line: no-console
    console.log(cyan('[config]') + ' File does not exist: %s', localConfigPath);
    return;
  }
  // tslint:disable-next-line: no-console
  console.log(cyan('[config]') + ` Read ${localConfigPath}`);
  // var package2Chunk = setting._package2Chunk;
  var configObj: {[key: string]: any};

  const matched = /\.([^.]+)$/.exec(localConfigPath);

  let suffix = matched ? matched[1] : null;
  if (suffix === 'yaml' || suffix === 'yml') {
    configObj = yamljs.parse(fs.readFileSync(localConfigPath, 'utf8'));
  } else if (suffix === 'json') {
    configObj = require(Path.resolve(localConfigPath));
  } else {
    return;
  }

  _.assignWith(setting, configObj, (objValue, srcValue, key, object, source) => {
    // if (key === 'vendorBundleMap') {
    //   if (!_.isObject(objValue) || !_.isObject(srcValue))
    //     return;
    //   _.each(srcValue, (packageList, chunk) => {
    //     if (!_.isArray(packageList))
    //       return;
    //     for (const p of packageList) {
    //       package2Chunk[p] = chunk;
    //     }
    //   });
    // } else if (key === 'outputPathMap') {
    //   if (!objValue)
    //     objValue = object.outputPathMap = {};
    //   return _.assign(objValue, srcValue);
    // } else 
    if (_.isObject(objValue) && !Array.isArray(objValue)) {
      // We only merge 2nd level properties
      return _.assign(objValue, srcValue);
    }
  });
}

function mergeFromCliArgs(setting: DrcpSettings, cliOpt: CliOptions) {
  if (!cliOpt.prop)
    return;
  for (let propPair of cliOpt.prop) {
    const propSet = propPair.split('=');
    let propPath = propSet[0];
    if (_.startsWith(propSet[0], '['))
      propPath = JSON.parse(propSet[0]);
    let value;
    try {
      value = JSON.parse(propSet[1]);
    } catch (e) {
      value = propSet[1] === 'undefined' ? undefined : propSet[1];
    }
    _.set(setting, propPath, value);
    // tslint:disable-next-line: no-console
    console.log(`[config] set ${propPath} = ${value}`);
  }
}

config.wfhSrcPath = wfhSrcPath;

function wfhSrcPath() {
  var wfhPath = Path.dirname(require.resolve('dr-comp-package/package.json'));
  // log.debug('wfhPath: %s', wfhPath);
  return (Path.basename(Path.dirname(wfhPath)) !== 'node_modules') ? wfhPath : false;
}

function validateConfig() {
  if (!setting.nodeRoutePath) {
    console.error('[config error]: ' + ('"nodeRoutePath" must be set in config.yaml'));
    throw new Error('Invalid configuration');
  }

  ['staticAssetsURL',
    'nodeRoutePath',
    'compiledDir'].forEach(function(prop) {
      setting[prop] = trimTailSlash(setting[prop]);
    });

  var contextMapping = setting.packageContextPathMapping;
  if (contextMapping) {
    _.forOwn(contextMapping, function(path, key) {
      contextMapping[key] = trimTailSlash(path);
    });
  }
}

function trimTailSlash(url: string) {
  if (url === '/') {
    return url;
  }
  return _.endsWith(url, '/') ? url.substring(0, url.length - 1) : url;
}

function normalizePort(val: string | number) {
  let port: number = typeof val === 'string' ? parseInt(val, 10) : val;

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return 8080;
}
export = (config as DrcpConfig);