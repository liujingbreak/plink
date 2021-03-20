
call dist/webpack-config in @wfh/cra-scripts's configuration file

e.g. config-overrides.ts

```ts
import {ReactScriptsHandler, CraScriptsPaths} from '@wfh/cra-scripts/dist/types';
import {default as docUiCommon} from '@wfh/doc-ui-common/dist/webpack-config';
const handler: ReactScriptsHandler = {
  changeCraPaths(craPaths: CraScriptsPaths) {
  },
  webpack(cfg, env, cmdOpt) {
    if (docUiCommon.webpack)
      docUiCommon.webpack(cfg, env, cmdOpt);
  }
};

export default handler;

```
