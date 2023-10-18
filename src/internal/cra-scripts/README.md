# Create a new React + Redux project with Plink

- [Create a new React + Redux project with Plink](#create-a-new-react--redux-project-with-plink)
    - [Prerequisition](#prerequisition)
  - [Create a React working space](#create-a-react-working-space)
    - [Build and watch](#build-and-watch)
    - [Customize Webpack configuration](#customize-webpack-configuration)
  - [Prepare environment](#prepare-environment)
  - [Creating a package skelaton](#creating-a-package-skelaton)
    - [Demo 开发](#demo-开发)
    - [build 输出 library](#build-输出-library)
    - [配置第三方依赖](#配置第三方依赖)
  - [在Angular App中使用组件](#在angular-app中使用组件)
    - [开发模式](#开发模式)
  - [开发 Trouble shooting](#开发-trouble-shooting)
  - [Examples: Subscribe Angular data state in React component](#examples-subscribe-angular-data-state-in-react-component)
      - [Render function `renderDom(dom, injector)` get `Injector` and render React Component `HomePage`.](#render-function-renderdomdom-injector-get-injector-and-render-react-component-homepage)
### Prerequisition
Knownledge of
create-react-app, Redux toolkit, Redux-observable.

## Create a React working space
1. copy .npmrc to root directory of repository, if you have an NPM registry preference to customize.

2. Suppose you are about to create a space directory named "react-space"
```bash
export npm_config_legacy_peer_deps=true # if your npm version is above 7.x (included)
export npm_config_registry=https://registry.npm.taobao.org/ # if you are in China
create-react-app react-space --template cra-template-typescript --use-npm --verbose
```

3. Add extra dependencies to `react-space/package.json` file.
   
Add dependencies, packages with `@wfh` are required by Plink, others should be your source code package and 3rd party libraries,
```json
"devDependencies": {
  "@wfh/cra-scripts": "1.0.21",
  "@wfh/webpack-common": "1.0.2",
  "@wfh/redux-toolkit-observable": "1.0.5",
  "react-app-polyfill": "^2.0.0",
  "@reduxjs/toolkit": "~1.5.0",
  "redux-observable": "~1.2.0",
  "@types/react-redux": "^7.1.16",
  "react-redux": "^7.2.2"
  "@foobar/your-feature-package": "1.0.0"
}
```
> You may also use Plink "add" command to add dependencies
```bash
plink sync react-space
plink add --to react-space --dev sass @wfh/cra-scripts @wfh/webpack-common @wfh/redux-toolkit-observable react-app-polyfill react-redux@^7.2.2 @types/react-redux@^7.1.16
```
### Build and watch
```bash
plink init reac-space
cd react-space

# To see command line help
# plink cra-build -h
plink cra-build app <package name>
```

checkout helper 
```bash
plink cra-build -h

Usage: plink cra-build [options] <app|lib> <package-name>

Compile react application or library, <package-name> is the target package name

Options:
  -w, --watch                                     Watch file changes and compile (default: false)
  --dev                                           set NODE_ENV to "development", enable react-scripts in dev mode (default: false)
  --purl, --publicUrl <string>                    set environment variable PUBLIC_URL for react-scripts (default: "/")
  -c, --config <config-file>                      Read config files, if there are multiple files, the latter one overrides previous one (default: [])
  --prop <property-path=value as JSON | literal>  <property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like
                                                  string
                                                   e.g.
                                                  --prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080
                                                  --prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080
                                                  --prop arraylike.prop[0]=foobar
                                                  --prop ["@wfh/foo.bar","prop",0]=true (default: [])
  -h, --help                                      display help for command
```

### Customize Webpack configuration
Create a TS file in your package directory

```ts
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const configHandler:ReactScriptsHandler = {
  webpack(cfg, env, cmdOpt) {
  }
};
export default configHandler;

```
## Prepare environment

- Remember to run `plink run` or `npm run plink -- init` to instal some of the updated dependencies when everytime source code is updated by pulling new updates from remote Git server.

- Node v12.x

## Creating a package skelaton
Install dependencies which you only need to do it once for the first time

```
cd <react-space-dir>
```
Run command
```bash
plink cra-gen-pkg ../packages/foobar-app
# or 
# plink run node_modules/@bk/cra-scripts/dist/cmd.js#genPackage portal-home
```
命令输出
```
[cra-scripts cmd] projects/cra-lib/foobar-app/.npmignore is created
[cra-scripts cmd] projects/cra-lib/foobar-app/config-overrides.ts is created
[cra-scripts cmd] projects/cra-lib/foobar-app/package.json is created
[cra-scripts cmd] projects/cra-lib/foobar-app/public_api.ts is created
[cra-scripts cmd] projects/cra-lib/foobar-app/start.tsx is created
[cra-scripts cmd] projects/cra-lib/foobar-app/my-component/MyComponent.module.scss is created
[cra-scripts cmd] projects/cra-lib/foobar-app/my-component/MyComponent.tsx is created
[cra-scripts cmd] projects/cra-lib/foobar-app/my-component/demo.assets.jpg is created
[cra-scripts cmd] You need to run `plink init`
```
`@bk/foobar-app` 是新创建的组件包名。

再次运行 `plink init`,\
可以查看项目中所有的包 `plink ls`


### Demo 开发
```
cd cra-studio
npm run start -- app foobar-app
```

### build 输出 library
```
cd cra-studio
npm run start -- lib foobar-app [--dev]
```
`--dev` 临时输出开发版的Library

### 配置第三方依赖
修改 `projects/cra-lib/foobar-app/package.json` **dependencies**

然后 运行 `plink init` 安装依赖

## 在Angular App中使用组件
### 开发模式

1. Build and watch React library
```bash
cd cra-studio
npm run build -- lib bigc-home --watch
```

2. 启动 Angular 开发命令
```bash
scripts/serve-bigc.sh jit:interceptor
```


3. 访问 http://localhost:4200/bigc
修改React library代码会刷新页面变化

## 开发 Trouble shooting
1. cra-studio 目录下 `npm run build -- build <package> ` 失败
```
Could not resolve package.json from path like:
...
```
原因一般是目标库的node 包在`node_modules`下软连接失效了， 所以node无法resolve 这个包名。

- 重试`plink init` 创建软连接
- 如果plink init后也不行(但是`plink init`没有报错)
- 尝试 `plink project add .`, 再次`plink init`，然后可以快速的看一眼`plink ls`的结果有没有列出那个目标库的node包



## Examples: Subscribe Angular data state in React component

#### Render function `renderDom(dom, injector)` get `Injector` and render React Component `HomePage`.

 1. Angular pass in `injector` to `renderDom()` function,
 2. React component use `Injector::get()` to get Data source state and subscribe to it's store.
 3. React component `setState()` whenever `store` changes.
 4. Unsubscribe when "unmount".
 

```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import {Injector} from '@angular/core';
import {Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {HomeStateAndUserService, HomeState} from '@bk/bigc/app/home/home-stat.service';

import styles from './HomePage.module.scss';

const HomePage: React.FC<{}> = function(prop) {

  const injector = React.useContext(InjectorCtx)!;
  const homeStateServcie = React.useMemo(() => injector.get(HomeStateAndUserService), []);
  // 获取初始状态
  const [state, setState] = React.useState<HomeState['bigc/home']>(homeStateServcie.getState());

  // 订阅状态变化,绑定react element
  React.useEffect(() => {
    const sub = homeStateServcie.getStore().pipe(
      map(data => {
        setState(data);
      })
    ).subscribe();
    return () => {sub.unsubscribe();};
  }, []);

  const navToOrder = React.useCallback((event: any) => {
    // tslint:disable-next-line: no-console
    // console.log(event, injector!.get(Router));
    injector.get(Router).navigateByUrl('/bigc/order');
  }, []);

  function navToProdCat() {
    injector.get(Router).navigateByUrl('/bigc/prod-catalog');
  }

  return <React.Fragment>
      <div className={styles.assets}></div>
      <div className={styles.red}>You component goes here</div>
      <a onClick={navToOrder}>navigate to /order</a><br/>
      <a onClick={navToProdCat}>navigate to /prod-catalog</a><br/>
      State:
      <pre>
        {JSON.stringify(state, null, '  ')}
      </pre>
    </React.Fragment>;
};

export default HomePage;

export const InjectorCtx = React.createContext<Injector|null>(null);

export function renderDom(dom: HTMLElement, injector: Injector) {

  ReactDOM.render(
    <InjectorCtx.Provider value={injector}><HomePage/></InjectorCtx.Provider>, dom);

  return {
    unmount() {
      ReactDOM.unmountComponentAtNode(dom);
    }
  };
}

```
