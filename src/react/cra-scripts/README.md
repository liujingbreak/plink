## Create a new React + Redux project
copy .npmrc to home directory

`create-react-app <dir> --template cra-template-typescript --use-npm`

~~add dependencies to package.json file~~
~~```bash~~
~~"dependencies": {~~
~~  ...~~
~~  "log4js": ""~~
~~}~~
~~```~~


### Build and watch
```bash
npm run build -- lib bigc-home --watch
```




# Developing React library package
- [Developing React library package](#developing-react-library-package)
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
## Prepare environment

- Remember to run `drcp run` or `npm run drcp -- init` to instal some of the updated dependencies when everytime source code is updated by pulling new updates from remote Git server.

- Node v12.x

## Creating a package skelaton
Install dependencies which you only need to do it once for the first time

```
cd <cra-project-dir>
npm i
```
Run command
```bash
drcp run cra-scripts/dist/cmd.js#genPackage bigc-portal-home
# or 
# drcp run node_modules/@bk/cra-scripts/dist/cmd.js#genPackage portal-home
```
命令输出
```
[cra-scripts cmd] projects/cra-lib/bigc-portal-home/.npmignore is created
[cra-scripts cmd] projects/cra-lib/bigc-portal-home/config-overrides.ts is created
[cra-scripts cmd] projects/cra-lib/bigc-portal-home/package.json is created
[cra-scripts cmd] projects/cra-lib/bigc-portal-home/public_api.ts is created
[cra-scripts cmd] projects/cra-lib/bigc-portal-home/start.tsx is created
[cra-scripts cmd] projects/cra-lib/bigc-portal-home/my-component/MyComponent.module.scss is created
[cra-scripts cmd] projects/cra-lib/bigc-portal-home/my-component/MyComponent.tsx is created
[cra-scripts cmd] projects/cra-lib/bigc-portal-home/my-component/demo.assets.jpg is created
[cra-scripts cmd] You need to run `drcp init`
```
`@bk/bigc-portal-home` 是新创建的组件包名。

再次运行 `drcp init`,\
可以查看项目中所有的包 `drcp ls`


### Demo 开发
```
cd cra-studio
npm run start -- app bigc-portal-home
```

### build 输出 library
```
cd cra-studio
npm run start -- lib bigc-portal-home [--dev]
```
`--dev` 临时输出开发版的Library

### 配置第三方依赖
修改 `projects/cra-lib/bigc-portal-home/package.json` **dependencies**

然后 运行 `drcp init` 安装依赖

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

- 重试`drcp init` 创建软连接
- 如果drcp init后也不行(但是`drcp init`没有报错)
- 尝试 `drcp project add .`, 再次`drcp init`，然后可以快速的看一眼`drcp ls`的结果有没有列出那个目标库的node包



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
