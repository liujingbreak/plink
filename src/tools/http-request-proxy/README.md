HTTP 请求代理工具
------
Config your config.yaml or config.{env}.yaml

## 配置多个自启动代理
> 可以解决开发环境的ajax跨域问题
```yaml
@dr/http-request-proxy:
    proxies:
        demo: https://www-demo.api.com
        stage: https://www.stage.api.com
```

修改客户端代码的ajax请求的URL, 比如,
- 原来是请求 `http://www-demo.api.com/services/profile?userid=456`, 
改为 http://localhost:<port>/http-request-proxy`/demo/services/profile?userid=456`
- 原来是请求 `http://www.stage.api.com/services/profile?userid=456`, 
改为 http://localhost:<port>/http-request-proxy`/stage/services/profile?userid=456`

配置组件包server端的代码
package.json
```json
{
    "main": "server.js",
    "dr": {
        "type": "server"
    }
}
```

## Typescript support
```ts
import {forName, forEach, ProxyInstance} from '@dr/http-request-proxy';
```
## 代理Cookie时去掉 domain属性
```js
import {forName, forEach, ProxyInstance} from '@dr/http-request-proxy';

forEach((p: ProxyInstance) => addOptions({removeCookieDomain: true});
```

## 添加请求拦截function 跳过API请求, 直接返回客户端Mock响应
main server JS file `server.js`:
```js
exports.activate = function() {
    if (api.argv['mock-api'] == null) // If there is command line arguments "--mock-api"
        return;
    var proxy = require('@dr/http-request-proxy').forName('demo'); // For the proxy target URL configured with "demo"
    proxy.mockResponse('/api/v2/user/profile', (req, hackedReqHeaders, requestBody, lastResult) => {
        ...
        return mockResponseBody; // JSON object | string | Buffer
        // Or
        // return Promise.resolve(...);
    });
    proxy.mockResponse('*', (req, hackedReqHeaders, requestBody, lastResult) => {
        if (/\/api\/v2\/user\/plans\/([^\/]+)\/buy/.test(req.url))
            return mockResponseBody;
        // return null or undefined to doing nothing
	});
};
```
## 对所有配置的代理目标都拦截
比如要对**demo**, **stage** 两套配置的proxy都做拦截
```js
exports.activate = function() {
    if (api.argv['mock-api'] == null) // If there is command line arguments "--mock-api"
        return;
    require('@dr/http-request-proxy').forEach(proxy => {
        proxy.mockResponse('/api/v2/user/profile', (req, hackedReqHeaders, requestBody, lastResult) => {
            ...
            return mockResponseBody; // JSON object | string | Buffer
            // Or
            // return Promise.resolve(...);
        });
    });
};
```

## 添加响应拦截function 返回修改过的API响应body
main server JS file `server.js`:
```js
exports.activate = function() {
    if (api.argv['mock-api'] == null) // If there is command line arguments "--mock-api"
        return;
    var proxy = require('@dr/http-request-proxy').forName('demo');
    proxy.interceptResponse('/api/v2/user/profile', (req, hackedReqHeaders, responseBody, lastResult) => {
        ...
        return hackedResponseBody; // JSON object | string | Buffer
        // Or
        // return Promise.resolve(...);
    });
    proxy.interceptResponse('*', (req, hackedReqHeaders, responseBody, lastResult) => {
        if (/\/api\/v2\/user\/plans\/([^\/]+)\/buy/.test(req.url))
            return hackedResponseBody;
        // return null or undefined to doing nothing
	});
};
```
## 添加请求拦截function 修改请求发送的内容 (修改后的请求依然会发送到后端API)
main server JS file `server.js`:
```js
exports.activate = function() {
    if (api.argv['mock-api'] == null) // If there is command line arguments "--mock-api"
        return;
    var proxy = require('@dr/http-request-proxy').forName('demo');
    proxy.interceptRequest('/api/v2/user/profile', (req, hackedReqHeaders, requestBody, lastResult) => {
        return hackedRequestBody; // JSON object | string | Buffer
        // Or
        // return Promise.resolve(...);
        // return undefined or null meaning no changes to body
    });
    proxy.interceptRequest('*', (req, hackedReqHeaders, requestBody, lastResult) => {
        if (/\/api\/v2\/user\/plans\/([^\/]+)\/buy/.test(req.url))
            return hackedRequestBody;
        // return null or undefined to doing nothing
	});
};
```
