/* tslint:disable no-console */
import { BuilderContext, Target, targetFromTargetString } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { Schema as BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { Schema as ServerBuilderOptions } from '@angular-devkit/build-angular/src/server/schema';
import { packageAssetsFolders } from '@dr-core/assets-processer/dist/dev-serve-assets';
import chalk from 'chalk';
import { DrcpConfig } from 'dr-comp-package/wfh/dist/config-handler';
import { getLanIPv4 } from 'dr-comp-package/wfh/dist/utils/network-util';
// import { getTsDirsOfPackage } from 'dr-comp-package/wfh/dist/utils';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as Path from 'path';
import {Worker} from 'worker_threads';
import ts, { sys } from 'typescript';
import Url from 'url';
import replaceCode from '../utils/patch-text';
import TsAstSelector from '../utils/ts-ast-query';
import { AngularBuilderOptions } from './common';
import injectorSetup from './injector-setup';
import { DrcpBuilderOptions } from '../../dist/server';
import {Data} from './change-tsconfig-worker';
import memstats from 'dr-comp-package/wfh/dist/utils/mem-stats';
import {createTsConfig as _createTsConfig} from './change-tsconfig';
import {AngularConfigHandler} from '../configurable';

const {cyan, green, red} = chalk;
const currPackageName = require('../../package.json').name;
const log = require('log4js').getLogger('@dr-core/ng-app-builder.change-cli-options');

type ExtractPromise<P> = P extends Promise<infer T> ? T : unknown;


function hackAngularBuilderContext(context: BuilderContext, targetName: string,
  replacedOpts: any) {
  const getTargetOptions = context.getTargetOptions;

  context.getTargetOptions = async function(target: Target) {
    if (target.target === targetName) {
      // log.info('Angular cli build options', replacedOpts);
      return replacedOpts;
    }
    const origOption = await getTargetOptions.apply(context, arguments);
    return origOption;
  };
}
/**
 * For build (ng build)
 * @param config 
 * @param browserOptions 
 */
export async function changeAngularCliOptionsForBuild(config: DrcpConfig,
  browserOptions: BrowserBuilderSchema | ServerBuilderOptions, context: BuilderContext): Promise<AngularBuilderOptions> {
  return processBrowserBuiliderOptions(config, browserOptions, context);
}

/**
 * For dev server (ng serve)
 * @param config 
 * @param context 
 * @param builderConfig 
 */
export async function changeAngularCliOptions(config: DrcpConfig,
  context: BuilderContext,
  builderConfig: DevServerBuilderOptions) {

  const browserTarget = targetFromTargetString(builderConfig!.browserTarget);
  const rawBrowserOptions = await context.getTargetOptions(browserTarget) as any as BrowserBuilderSchema;
  if (!rawBrowserOptions.deployUrl)
    rawBrowserOptions.deployUrl = '/';

  const browserOptions = await processBrowserBuiliderOptions(
    config, rawBrowserOptions, context, builderConfig, true);
  hackAngularBuilderContext(context, 'build', browserOptions);
  return browserOptions;
}

async function processBrowserBuiliderOptions(
  config: DrcpConfig,
  rawBrowserOptions: BrowserBuilderSchema | ServerBuilderOptions,
  context: BuilderContext,
  devServerConfig?: DevServerBuilderOptions, hmr = false) {

  context.reportStatus('Change builder options');
  const browserOptions = rawBrowserOptions as AngularBuilderOptions;
  for (const prop of ['deployUrl', 'outputPath', 'styles']) {
    const value = config.get([currPackageName, prop]);
    if (value != null) {
      (rawBrowserOptions as any)[prop] = value;
      console.log(currPackageName + ' - override %s: %s', prop, value);
    }
  }

  await config.configHandlerMgr().runEach<AngularConfigHandler>((file, obj, handler) => {
    console.log(green('change-cli-options - ') + ' run', cyan(file));
    if (handler.angularJson)
      return handler.angularJson(browserOptions, devServerConfig);
    else
      return obj;
  });

  if (!browserOptions.deployUrl)
    browserOptions.deployUrl = '/';
  // if static assets's URL is not led by '/', it will be considered as relative path in ng-html-loader

  if (devServerConfig) {
    const parsedUrl = Url.parse(browserOptions.deployUrl, true, true);
    if (parsedUrl.host == null) {
      parsedUrl.hostname = getLanIPv4();
      parsedUrl.port = devServerConfig.port + '';
      parsedUrl.protocol = devServerConfig && devServerConfig.ssl ? 'https' : 'http';
      rawBrowserOptions.deployUrl = Url.format(parsedUrl);
      // TODO: print right after server is successfully started
      setTimeout(() =>
        console.log(chalk.red(`Current dev server resource is hosted on ${parsedUrl.hostname},\nif your network is reconnected or local IP address is ` +
        ' changed, you will need to restart this dev server!')), 5000);
    }
    if (parsedUrl.pathname)
      devServerConfig.servePath = parsedUrl.pathname; // In case deployUrl has host, ng cli will report error for null servePath
  }

  if (browserOptions.fileReplacements) {
    const cwd = process.cwd();
    browserOptions.fileReplacements
    .forEach(fr => {
      Object.keys(fr).forEach(field => {
        const value: string = fr[field];
        if (Path.isAbsolute(value)) {
          fr[field] = Path.relative(cwd, value);
        }
      });
    });
  }

  const pkJson = lookupEntryPackage(Path.resolve(browserOptions.main));
  if (pkJson) {
    console.log(green('change-cli-options - ') + `Set entry package ${cyan(pkJson.name)}'s output path to /`);
    config.set(['outputPathMap', pkJson.name], '/'); // static assets in entry package should always be output to root path
  }
  // Be compatible to old DRCP build tools
  const {deployUrl} = browserOptions;
  if (!config.get('staticAssetsURL'))
    config.set('staticAssetsURL', _.trimEnd(deployUrl, '/'));
  if (!config.get('publicPath'))
    config.set('publicPath', deployUrl);

  const mainHmr = createMainFileForHmr(browserOptions.main);
  if (hmr && devServerConfig) {
    devServerConfig.hmr = true;
    if (!browserOptions.fileReplacements)
      browserOptions.fileReplacements = [];
    browserOptions.fileReplacements.push({
      replace: browserOptions.main,
      with: Path.relative('.', mainHmr)
    });
  }
  if (browserOptions.drcpArgs == null) {
    browserOptions.drcpArgs = {};
  }

  browserOptions.commonChunk = false;

  const packagesInfo = await injectorSetup(config, browserOptions);
  await hackTsConfig(browserOptions, config, packagesInfo);


  context.reportStatus('setting up assets options');
  // Because dev-serve-assets depends on DRCP api, I have to lazy load it.
  const forEachAssetsDir: typeof packageAssetsFolders =
  require('@dr-core/assets-processer/dist/dev-serve-assets').packageAssetsFolders;
  forEachAssetsDir('/', (inputDir, outputDir) => {
    if (!browserOptions.assets) {
      browserOptions.assets = [];
    }
    let input = Path.relative(process.cwd(), inputDir).replace(/\\/g, '/');
    if (!input.startsWith('.')) {
      input = './' + input;
    }
    browserOptions.assets!.push({
      input,
      glob: '**/*',
      output: outputDir.endsWith('/') ? outputDir : outputDir + '/'
    });
  });
  fs.writeFile(config.resolve('destDir', 'ng-app-builder.report', 'angular-cli-options.json'),
  JSON.stringify(browserOptions, undefined, '  '), () => {});
  return browserOptions;
}

function createMainFileForHmr(mainFile: string): string {
  const dir = Path.dirname(mainFile);
  const writeTo = Path.resolve(dir, 'main-hmr.ts');
  if (fs.existsSync(writeTo)) {
    return writeTo;
  }
  const main = fs.readFileSync(mainFile, 'utf8');
  let mainHmr = '// tslint:disable\n' +
  `import hmrBootstrap from '@dr-core/ng-app-builder/src/hmr';\n${main}`;
  const query = new TsAstSelector(mainHmr, 'main-hmr.ts');
  // query.printAll();

  let bootCallAst: ts.Node;
  const statement = query.src.statements.find(statement => {
    // tslint:disable-next-line max-line-length
    const bootCall = query.findMapTo(statement, ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier',
      (ast: ts.Identifier, path, parents) => {
        if (ast.text === 'platformBrowserDynamic' &&
        (ast.parent.parent as ts.PropertyAccessExpression).name.getText(query.src) === 'bootstrapModule' &&
        ast.parent.parent.parent.kind === ts.SyntaxKind.CallExpression) {
          return ast.parent.parent.parent;
        }
      });
    if (bootCall) {
      bootCallAst = bootCall;
      return true;
    }
    return false;
  });

  if (statement == null)
    throw new Error(`${mainFile},` +
    `can not find statement like: platformBrowserDynamic().bootstrapModule(AppModule)\n${mainHmr}`);

  mainHmr = replaceCode(mainHmr, [{
    start: statement.getStart(query.src, true),
    end: statement.getEnd(),
    text: ''}]);
  mainHmr += `const bootstrap = () => ${bootCallAst!.getText()};\n`;
  mainHmr += `if (module[ 'hot' ]) {
	    hmrBootstrap(module, bootstrap);
	  } else {
	    console.error('HMR is not enabled for webpack-dev-server!');
	    console.log('Are you using the --hmr flag for ng serve?');
	  }\n`.replace(/^\t/gm, '');

  fs.writeFileSync(writeTo, mainHmr);
  log.info('Write ' + writeTo);
  log.info(mainHmr);
  return writeTo;
}

// Hack ts.sys, so far it is used to read tsconfig.json
async function hackTsConfig(browserOptions: AngularBuilderOptions, config: DrcpConfig,
  packagesInfo: ExtractPromise<ReturnType<typeof injectorSetup>>) {

  const oldReadFile = sys.readFile;
  const tsConfigFile = Path.resolve(browserOptions.tsConfig);

  const useThread = config.get(currPackageName + '.useThread', true);
  const newTsConfig = useThread ?
    await createTsConfigInWorker(tsConfigFile, browserOptions, config, packagesInfo) :
    createTsConfigSync(tsConfigFile, browserOptions, config, packagesInfo);
  fs.writeFile(config.resolve('destDir', 'ng-app-builder.report', 'tsconfig.json'), newTsConfig, () => {
  });

  sys.readFile = function(path: string, encoding?: string): string {
    const res: string = oldReadFile.apply(sys, arguments);
    if (Path.sep === '\\') {
      // Angular somehow reads tsconfig.json twice and passes in `path`
      // with different path seperator `\` and `/` in Windows 
      // `cachedTsConfigFor` is lodash memoize function which needs a
      // consistent `path` value as cache key
      path = path.replace(/\//g, Path.sep);
    }
    try {
      if (path === tsConfigFile)
        return newTsConfig;
      else
        return res;
    } catch (err) {
      console.error(red('change-cli-options - ') + `Read ${path}`, err);
    }
    return '';
  };
}

function lookupEntryPackage(lookupDir: string): any {
  while (true) {
    const pk = Path.join(lookupDir, 'package.json');
    if (fs.existsSync(pk)) {
      return require(pk);
    } else if (lookupDir === Path.dirname(lookupDir)) {
      break;
    }
    lookupDir = Path.dirname(lookupDir);
  }
  return null;
}

function createTsConfigSync(tsconfigFile: string,
  browserOptions: AngularBuilderOptions,
  config: DrcpConfig,
  packageInfo: ExtractPromise<ReturnType<typeof injectorSetup>>) {
  const {createTsConfig} = require('./change-tsconfig') as {createTsConfig: typeof _createTsConfig};
  memstats();
  return createTsConfig(tsconfigFile, browserOptions, config.get(currPackageName),
    packageInfo, config.resolve('destDir', 'ng-app-builder.report'));
}

function createTsConfigInWorker(tsconfigFile: string,
  browserOptions: AngularBuilderOptions,
  config: DrcpConfig,
  packageInfo: ExtractPromise<ReturnType<typeof injectorSetup>>) {

  const reportDir = config.resolve('destDir', 'ng-app-builder.report');

  memstats();
  const workerLog = require('log4js').getLogger('@dr-core/ng-app-builder.worker');

  return new Promise<string>((resolve, rej) => {

    const workerData: Data = {
      tsconfigFile,
      reportDir,
      config: config.get(currPackageName),
      ngOptions: {
        preserveSymlinks: browserOptions.preserveSymlinks,
        main: browserOptions.main,
        fileReplacements: JSON.parse(JSON.stringify(browserOptions.fileReplacements))
      },
      packageInfo,
      drcpBuilderOptions: JSON.parse(JSON.stringify({drcpArgs: browserOptions.drcpArgs, drcpConfig: browserOptions.drcpConfig})) as DrcpBuilderOptions,
      baseHref: browserOptions.baseHref,
      deployUrl: browserOptions.deployUrl
    };
    const worker = new Worker(require.resolve('./change-tsconfig-worker.js'), {workerData});
    worker.on('error', rej);
    worker.on('message', (msg) => {
      if (msg.log) {
        workerLog.info(msg.log);
      }
      if (msg.result) {
        resolve(msg.result);
      }
      // worker.off('error', rej);
    });
    worker.on('exit', () => {
      log.info('worker exits');
    });
  });
}


