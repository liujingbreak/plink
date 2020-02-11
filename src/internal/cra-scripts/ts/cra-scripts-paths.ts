
export interface CraScriptsPaths {
  dotenv: string; // resolveApp('.env'),
  appPath: string; // resolveApp('.'),
  appBuild: string; // resolveApp('build'),
  appPublic: string; // resolveApp('public'),
  appHtml: string; // resolveApp('public/index.html'),
  appIndexJs: string; // resolveModule(resolveApp, 'src/index'),
  appPackageJson: string; // resolveApp('package.json'),
  appSrc: string; // resolveApp('src'),
  appTsConfig: string; // resolveApp('tsconfig.json'),
  appJsConfig: string; // resolveApp('jsconfig.json'),
  yarnLockFile: string; // resolveApp('yarn.lock'),
  testsSetup: string; // resolveModule(resolveApp, 'src/setupTests'),
  proxySetup: string; // resolveApp('src/setupProxy.js'),
  appNodeModules: string; // resolveApp('node_modules'),
  publicUrlOrPath: string; // string;
}
