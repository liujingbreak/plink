## Configure routes and markdown pages

Inside a configure file:
Suppose `@bk/hfe-module-store-docs/ui/routes` and `@bk/hfe-module-store-docs/ui/markdown-setup` are the configuration override files.

```ts
import {ConfigHandler, DrcpSettings, InjectorConfigHandler, config} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const workspaceSetting: ConfigHandler & InjectorConfigHandler & ReactScriptsHandler = {
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
