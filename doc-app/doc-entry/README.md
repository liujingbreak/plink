## Configure routes and markdown pages

Inside a configure file
(Suppose `@bk/hfe-module-store-docs/ui/routes` and `@bk/hfe-module-store-docs/ui/markdown-setup` are the configuration override files): 

```ts
import {ConfigHandler, DrcpSettings, InjectorConfigHandler, config} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const workspaceSetting: ConfigHandler & InjectorConfigHandler & ReactScriptsHandler = {
  changeCraPaths(craPaths, env, cmdOpt) {
    // change CRA paths:

    // output directory will be dist/static/main
    if (cmdOpt.buildType === 'app')
      craPaths.appBuild = config().staticDir + '/hfe';
    // webpack output.publicPath will be /main/, same as set environment variable PUBLIC_URL,
    // can not contain "host:port", otherwise react-dev-utils/WebpackDevServerUtils won't work correctly.
    craPaths.publicUrlOrPath = '/hfe/';
  },

  onConfig(setting: DrcpSettings, cliOpt: NonNullable<DrcpSettings['cliOptions']>): void {
    process.env.REACT_APP_routeBasename = '/hfe';

  },

  setupWebInjector(factory, setting) {
    factory.fromPlinkPackage('@wfh/doc-entry')
    .alias('@wfh/doc-entry/configurable/routes', (file) => {
      return '@bk/hfe-module-store-docs/ui/routes';
    })
    .alias('@wfh/doc-entry/configurable/markdown-setup', (file) => {
      return '@bk/hfe-module-store-docs/ui/markdown-setup';
    });
  },
  // ...
  
};
```
