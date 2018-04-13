# Developing dr-comp-package

dr-comp-package is written partially in plain Javascript and partially in Typescript.
 > I am trying to migrate legacy JS file to Typescript, still in progress.
```
/
  ├─ wfh
  │   ├─ bin/
  │   ├─ dist/
  │   │    ├─ Compild files...
  │   ├─ doc/
  │   ├─ lib/
  │   ├─ spec/
  │   ├─ ts/
  │   │    ├─ Typescript source files...
  │   ├─ types/
  │   ├─ tsconfig.json
  ├─ package.json
```
To compile Typescript part, go to `wfh` folder where `tsconfig.json` is, run `tsc`


# Below doc is deprecated
--------------------

# @dr web platform command tool

This is core part of a web pluggable component platform project run by foobar.com, which includes a command line tool for developer and deployer, a couple of node packages as internal components and a private NPM registry server.

Main purpose of this platform or tool is helping web developers, a team or a company to
- decouple and modularize their NodeJS based web project or web app product
- share and reuse pluggable components between different web project or product in a smarter way than git branching or file copy
- easily deploy and reassamble web products by plugging different components and configurations

in a way of packing and run mutiple web apps on one platform.

Refer to the offcial doc in Chinese at [http://dr-web-house.github.io](http://dr-web-house.github.io), English version is still in progress [http://dr-web-house.github.io/en](http://dr-web-house.github.io/en)


If you are contributor, please read [Contributor doc](http://dr-web-house.github.io/#/doc/drcp-developer.md)

## Directories

- ### Project directory
  Which is your local cloned git repository folder 
  ```
  <project directory>
    |- src
    |- .gitignore
    |- e2etest
    |- ...
    
  ```

- ### Workspace directory
  An empty folder at beginning, where we will install or link all components to and put configuration files in later on.

  The `process.cwd()` directory where we pack web resource and run Node sever.
  ```
  <workspace directory>
    |- node_modules/
    |- config.yaml
    |- logs/
    |- package.json
    |- ....
  ```

- ### Src directory
  `<project directory>/src`, holds components source code.

- ### End-to-end test directory
  `<project directory>/e2etest`

## Create local workspace

1. Install command line tool, create an empty **container** folder in somewhere.

  ```shell
  npm install -g dr-comp-package-cli # Only need to install once

  mkdir workspace
  cd workspace

  yarn add dr-comp-package

  drcp project -a <project1-dir> [-a <project2-dir> ...]

  yarn install

  # For development mode, compile web static resource to memory and start node web server
  node app watch
  # For production mode, compile web static resource to dist/
  drcp compile
  ```
  It creates files: `package.json`, `config.yaml`, `config.local.yaml`, ...
  and folders

 ## Component configuration property
 In each component's package.json file
 ```json
 {
   ...
   "dr": {
      "chunk": "chunkName",
      "entryPage": "*-index.html", // Could be glob format path or array like ["index.html", "other.html"]
      "entryView": "home-view.html", // Node rendering view file
      "compiler": "webpack", // Must be set
      "outputPath": "",
      // Consider it as Webpack's `output.path` setting, but only affects entry page path,
      // and it is relative to global `output.path`, empty string meaning it is output to root directory of
      // `dist/static`
      "cssScope": true, // By default CSS scope will be used
      "config": { // default setting which will be added up to <workspace>/config.yaml
          "public": {
              // Exposed to Browser by `webpack.DefinePlugin`,
              // it can be programmatically accessed from both NodeJS and Browser side API:
              //    `api.config()[api.packageName]anyCustomizedProperty' and `api.config()[api.packageName].hierarchicalProperty.childProperty`
              // or lodash.get() like format `api.config.get(api.packageName + '.hierarchicalProperty.childProperty', 'defaultValue')
            "anyCustomizedProperty": "anyTypeValue",
            "hierarchicalProperty": {
                "childProperty": ["complexTypeValue"]
            }
          },
          "server": { // Same as "config", but it can only be accessed by NodeJS program, not Browser side program,
              // Stuff like DB connection password kind sensitive data, you would not want them to be
              // exposed to Browser side
            "dbUser": "admin",
            "dbPass": "dontTellOthers"
          }
      },
      "config.local": {"public": {}, "server": {}}, // Settings which will be added up to <workspace>/config.local.yaml
      "config.demo": {"public": {}, "server": {}} // Settings which will be added up to <workspace>/config.demo.yaml
      // Any property in form of "config.<environment>"
     }
 }

 ```

 ## Module resolve
 Like Webpack configuration `module.resolve`, we have even more fine-grained resolve control files:
 - `module-resolve.browser.js`
 - `module-resolve.server.js`
 
 We even support NodeJS side module resolve.


## Share `node_modules` with multiple workspaces

Create the first workspace directory like normal, do `drcp init` in that directory. Then later on, create the second workspace directory, but create a symbolic link which links to workspace 1's folder `node_modules`.
```shell
ln -s ../workspace1/node_modules node_modules
``` 

### Mutiple configurations
For example, one workspace for responsive web projects which runs for all kinds of browser, and another workspace for advance projects which only support mobile browser. 

We can have different configuration like resolving setting, in workspace module `$` should be resolved to jQuery 1.x, but for workspace 2, it should be Zepto. Also chunk setting are probably different for 2 workspaces.

So that we can optimize our bundle and library for different client but also reuse some common components as much as possible.


