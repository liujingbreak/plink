
## Material Color theme configuration

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

## About lightReduxHooks
> It actually does not depends on Redux, no Redux is required to be packed with it.

This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
which is supposed to be used isolated within any React component in case your component has 
complicated and async state changing logic.

Redux + RxJs provides a better way to deal with complicated UI state related job.
 
 - it is small and supposed to be well performed
 - it does not use ImmerJS, you should take care of immutability of state by yourself
 - because there is no ImmerJS, you can put any type of Object in state including those are not supported by ImmerJS
