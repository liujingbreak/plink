Text Translation & i18n
=======
- Package 结构 - 哪里存放i18n资源
- 使用国际化文件资源
- 全局配置文件config.yaml
- 打包编译命令
- 打包后的输出bundle目录结构
- 客户端Javascript API，自动跳转不同语言页面]
- 自动收集可翻译文字并生成可翻译文件的命令
	- 扫描的规则
- 自动替换翻译的文字到不同的语言
- NodeJS 端i18n

### Package 结构 - 哪里存放i18n资源
为你的package添加本地化的文件,可以是各种能被require()的类型文件，比如`.js`, `.json`, `.yaml`, `.yml`， 统一放在一个目录下，推荐是 `<package-folder>/i18n`，这样大家可以达成共识，方便代码阅读。
```
package root folder
	├─ browser/
	├─ server/
	├─ i18n/
	|	├─ index.js
	|	├─ message-en.yaml
	|	├─ message-zh.yaml
	|	├─ message-zh-CN.yaml
	|	├─ feature-en.js
	|	├─ styles-en/
	|	|	├─ foobar.less
	|	... ...
	├─ README.md
	└─ package.json

```
文件名或者子目录名需要带有locale的标识，比如"en", "zh-CN"等。
### 使用国际化文件资源
e.g. JS files
```js
require('<package-name>/i18n/message-{locale}.yaml');
require('./i18n/message-{locale}.yaml'); //可以相对路径
require('<package-name>/i18n/feature-{locale}.js');
require('./i18n/feature-{locale}.js'); //可以相对路径
```
LESS files
```LESS
// LESS i18n resource的import 路径必须是"npm://<package-name>"开始，不能是相对路径
import "npm://<package-name>/i18n/foo-{locale}-bar.less";
import "npm://<package-name>/i18n/styles-{locale}/foobar.less";
```
`{locale}` 会在编译时被替换成相应的locale string 如"en", "zh"等，只要对应的文件路径是存在。


### 全局配置文件config.yaml
用来告诉我们的自动化可翻译文字扫描工具，已经`drcp compile`命令我们有多少locale语言当前支持\
config.yaml文件
```
locales:
    - zh # 放在第一个的是默认locale
    - en
```
以上也是默认的配置，所以相应package如果支持i18n至少提供这些locale的文件。

### 打包编译命令
打包，并且用默认locale "zh" 替换所有JS, LESS中的require, import语句中的`{locale}`
```
drcp compile
# same as:
drcp compile --locale zh
```
打包，并且用非默认的locale "en" 替换所有JS, LESS中的require, import语句中的`{locale}`
```
drcp compile --locale en
```
所以当在开发环境`drcp compile`的实际编译目标仅仅是当前配置的默认locale。在生产环境时我们需要对多个locale分别执行多次打包命令。

### 打包后的输出bundle目录结构
默认locale的drcp compile输出的JS bundle, CSS bundle, 入口Html文件在
`dist/static/`下。非默认locale的JS bundle, CSS bundle, 入口Html文件在`dist/static/<locale>`下，e.g.
```
dist/
	└─ static/
		├─ js/
		├─ css/
		├─ foo-package/
		|		└─  index.Html
		├─ index.html
		└─ en/
			├─ js/
			├─ css/
			├─ foo-package/
			|		└─  index.Html
			└─ index.html
```
所以假设某个默认locale语言的页面访问路径是`http://localhost:8080/foo-package/index.html`,\
对应非默认locale语言的(假设是"en")页面则是 `http://localhost:8080/en/foo-package/index.html`


### 客户端Javascript API，自动跳转不同语言页面
这些API可以帮助判断当前locale和为切换locale提供信息
```js
var api = require('__api');
var lang = api.urlSearchParam().lang; // Get URL search param "lang"
lang = api.getPrefLanguage() // Get perferred language from Browser's user setting
var locales = api.config().locales; // Get all supported locale list from config.yaml
var currLocale = api.config().buildLocale; // Get current built-out locale
```

其中`api.getPrefLanguage()` 会根据浏览器语言设置匹配一个config.yaml `locales`中的一个, 浏览器语言的判断优先顺序是根据:
- navigator.languages[0]
- navigator.language
- navigator.browserLanguage
- navigator.systemLanguage
- navigator.userLanguage
- navigator.languages[1]

页面切换语言可以通过Server 端redirect URL地址或者，浏览器端HTML Anchor <a> element, JS `window.location=`等跳转的方式实现, e.g. 切换"en"

简单的来说就是:
```js
window.location='http://localhost:8080/en/foo-package/index.html';
```
或者一个更全面的API
```js
var api = require('__api');
// If your web page runs inside DR company's mobile phone app
// We have a special component "@dr/dr-js-bridge" to work with language setting
var appInfo = require('@dr/dr-js-bridge').getAppInfo();
if (api.entryPackage === api.packageName) {
	// 确保在访问你的组件内的入口页面，做语言跳转，如果有时候你的组件正在
	// 被另一个组件当成library调用，这种情况不应该做语言切换
	var lang = appInfo.isCompanyApp || api.urlSearchParam().lang || api.getPrefLanguage();
	if (!api.reloadToLocale(lang)) // 如果当前页面语言不是首选语言 api.reloadToLocale 跳转到页面，并返true
		require('./browser.js');
} else {
	require('./browser.js');
}
var lang = api.urlSearchParam().lang || api.getPrefLanguage();
// Get URL parameter "?lang=<locale>" or Browser perferred language.
if (!api.reloadToLocale(lang)) {
	// If current page shows default language and the URL is like
	// "<staticAssetsURL>/pagePath", then we switch to target "lang" by
	// executing `window.location = "<staticAssetsURL>/<lang>/pagePath"`
	require('./main.js');
	// Render page and do business logic...
}
```
判断当前URL parameter “lang” 或浏览器首选语言， 如果当前页面是默认配置语言，切换到目标语言的URL上

如果是Node Server端, 可以通过Request "Accept-Language" header, redirect 到相应的URL

### 自动收集可翻译文字并生成可翻译文件的命令
使用**translate-generator** 工具

```
drcp compile <package-name..> --translate
```
扫描`.js`, `.html` 文件，自动生成可翻译的文件
```
	<package-dir>/i18n/
		├─ index.js
		├─ messages-en.yaml
		├─ messages-zh.yaml
		└─ ... other locale files in form of messages-{locale}.yaml
```
`message-en.yaml`里已经自动填满了message key, 从此你就不用手工为每个text label添加key到locale文件了。

#### 扫描的规则
`drcp compile --translate` 会扫描指定package下的所有`.js, .html`文件
- `.html` 文件，会使用**cheerio** 查找所有符合query `[dr-translate]`, `[t]`的element, 也就是带有属性translate的element:
	```html
	<any-element dr-translate>KEY1</any-element>
	<any-element class="dr-translate">KEY2</any-element>
	<any-element t>KEY3</any-element>
	<any-element class="t">KEY4</any-element>
	```
	class, attribute中有名为"t", "dr-translate"的element的html内容
	`KEY1`，`KEY2`都会被认为是locale message key。可以翻译的文字没有字符限制，比如可以是包含html, 甚至是AngularJS之类的浏览器端template engine
	```html
	<any-element dr-translate>Hellow <b>\{\{ name \}\}</b></any-element>
	```
	`Hellow <b>\{\{ name \}\}'</b>` 整个都是key。

	另外是对可翻译HTML元素属性值的扫描
	所有带有属性`t-a="<attribute-name> <attribute-name> ..."`的HTML element， 的指定属性(标注多个属性可以用空格或`,`间隔)， `<img alt>`和`placeholder`属性被默认为可以国际化翻译的值，不需要`t-a=""`的属性标注, 例如,
	```html
	<meta name="mymeta" content="translatableContent" t-a="content">
	<input type="text" placeholder="translatable"/>
	<img src="" alt="translatableAlt">
	```
	以上例子中`translatableContent`, `translatable`, `translatableAlt`都会在扫描和打包时被提取出来作为可以翻译文字的key

	> 注意，i18n工具增强`@dr/translate-generator`是一个Webpack loader，对html, js[x]的处理方式是不同的，React JSX中的HTML被视为JS文件处理i18n, 目前被当成html处理`t`, `t-a`等特殊属性，该功能还为开发，鼓励贡献

- `.js` 文件, 会在**Acorn** Javascript语法分析器生成的AST里查找function name是
	`drTranslate` 的call expression, 第一个参数被识别收集为message key：
	```javascript
	drTranslate('KEY1');
	```
	> 请不要使用其他的表达式作为drTranslate的参数, 只能使用String literal, 无法识别收集
	如 drTranslate('foo' + 'bar' + x) 等复杂表达式，对于有特定format的表达式可以使用lodash template等方式，比如,
	`_.template(drTranslate('foobar<%=x%>'))({x: x})` 将string模板作为可以翻译的文字


	除了`drTranslate` 还可以配置增加自定义的被扫描function name， 比如增加"myText()"， 添加到config.yaml:
	```yaml
	translate-generator:
		scanMethodNames:
				- myText
	```

### 自动替换翻译的文字到不同的语言
> 替换文件仅包括浏览器端Browserify会打包的JS + HTML bundle文件，entry page 文件，不包含NodeJS端的JS文件，或者是ExpressJS template HTML文件！
打包时替换可翻译文字的好处是，不会与Browser端framework template engine冲突，开发国际化更简单，对搜索引擎友好，对browser的性能没有损耗。

`drcp compile [--locale <locale>]` 时会替换所有Entry Page, JS文件中的
`drTranslate('some text')` html中`<any-element class="t"></any-element>` 等原先符合扫描收集规则的地方将会被替换为`/i18n/message-{locale}.yaml`所配置的内容，依然是通过Cheerio,
Acorn来实现的。
e.g.

```js
var text = drTranslate('中文');
doSomething(drTranslate('中文'));
```
替换后会是
```
var text = '中文';
doSomething('中文');
```

通过组件@dr/translate-generator, @dr-core/browserify-builder .addTransform()等实现的，简单的说就是Browserify的一个transform插件，有兴趣的可以自行扩展。

### NodeJS 端i18n
需要自行实现，简单的说就是基于
```js
require('./i18n/foobar-' + locale + '.js');
```
