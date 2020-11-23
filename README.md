# Package and project link toolkit

```
 ██████╗  ██╗      ██╗ ███╗   ██╗ ██╗  ██╗ 
 ██╔══██╗ ██║      ██║ ████╗  ██║ ██║ ██╔╝ 
 ██████╔╝ ██║      ██║ ██╔██╗ ██║ █████╔╝  
 ██╔═══╝  ██║      ██║ ██║╚██╗██║ ██╔═██╗  
 ██║      ███████╗ ██║ ██║ ╚████║ ██║  ██╗ 
 ╚═╝      ╚══════╝ ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═╝ 
```
> New version of readme and other documentation are still in-progress.

If heard about **Lerna** and **Yarn**'s workspace concept, yes this tool is a little bit in the same category.
> [Yarn's workspaces feature](https://yarnpkg.com/features/workspaces)

(This document is still at work-in-progress)

- [Package and project link toolkit](#package-and-project-link-toolkit)
  - [Purpose](#purpose)
  - [A command line tool](#a-command-line-tool)
    - [Plink monorepo style](#plink-monorepo-style)
    - [Directory structure may look like:](#directory-structure-may-look-like)
      - [Dependency installation space](#dependency-installation-space)
      - [Project and Packages directory](#project-and-packages-directory)
    - [How it works](#how-it-works)
  - [Features](#features)
  - [Unlike Yarn workspaces](#unlike-yarn-workspaces)
  - [Plink toolkit packages](#plink-toolkit-packages)
## Purpose
Web (or Node.js) frameworks or libraries like Angular, React, Vue, NestJS, they all come up with command line tools which help developer to initialize web projects, most of them are like scaffolding tool.

'Quick and easy' is how they please developers. but 'Quick and easy' shouldn't mean that a resulting application will suffer from a maintainability, extendibility issue. Especially for enterprise.

A naive scaffolding tool based application is kinda single project application with very limited way to share reusable module, architecture and configuration. Hard to having long term maintainance and hard to benefit future projects.

## A command line tool
 > to manipulate monorepo style projects
### Plink monorepo style
- You may have multiple web (Node.js) projects, some are based on Node.js Express.js framework, some are based on React and Redux, and some are based on Angular.

- You may have a single source code directory contains reusable (partially) modules, some Redux code could be shared in React projects and Angular project, some Node.js code may be reused on all web projects as backend server or build process enhancement.

- Source code is organized in form of Node packages, so that they can be shared cross repositaries. Projects in the same repo can directly reference relative source code. Other project can install them as node package to their build and deploy environment.

### Directory structure may look like:
```
Plink style monorepo
/- < Repository root directory >
  |- react-space (created with create-react-app)
  |     |- package.json
  |     |- node_modules/
  |
  |- angular-space/ (created with @angular/cli )
  |     |- package.json
  |     |- node_modules/
  |
  |- node-space/
  |     |- package.json
  |     |- node_modules/
  |
  |- package.json
  |- node_modules/
  |     |- @wfh/plink
  |     |- ... (symlinks to package directories)
  |     
  +- packages/
        |- redux-slice-A/
        |     |- src/
        |     |- package.json
        |
        |- redux-slice-B/
        |     |- src/
        |     |- package.json
        |
        |- ng-components/
        |     |- src/
        |     |- package.json
        |
        |- react-widgets/
        |     |- src/
        |     |- package.json
        |
        |- server-feature-A
        |     |- src/
        |     |- package.json
        |
        |- server-feature-B
        |     |- src/
        |     |- package.json
        |
        |- app-entry-1
        |     |- src/
        |     |- package.json
        |
        |- app-entry-2
        |     |- src/
        |     |- package.json
        |
        |- commons/
             |- animation/
             |    |- package.json
             |- isomophic-utils/
             |    |- package.json
             |- other-nested-package...
                  |- package.json

```
#### Dependency installation space
`react-space`, `angular-space`, `node-space` are quite like Yarn's workspace tree concept. Basically, these are the places where we install dependency, build client side application and run web server or tools.

#### Project and Packages directory
`packages/` are where Plink scans for source code packages, we organize raw source code in form of packages, reference each other like a regular package module:
```js
import something from '@foobar/redux-slice-A';
```

**Project** is a repository which contains `packages/` like directory.

### How it works
> Relationship, symlinks, NODE_PATH, Webpack module.resolve...
(WIP)

## Features
 - Support monorepo project structure.
 - Hoist and merge dependencies of nested packages.
 - Work with tools like `create-react-app` and `@angular/cli`
 - Share reusable component, features, functions between different projects.
 - Share file structure, configurations between different projects.
 - Easy to upgrade.
 - Opinionated cross framework solutions, web components, libraries, tools.

## Unlike Yarn workspaces
(WIP)

## Plink toolkit packages
(WIP)
- @wfh/plink
- @wfh/cra-scripts
- @wfh/ng-app-builder
- @wfh/webpack-common
- @wfh/translate-generator
- @wfh/webpack2-builder
- @wfh/assets-processer
- @wfh/express-app
- @wfh/http-server
- @wfh/http-request-proxy
- @wfh/jasmine-helper
- @wfh/json-schema-gen
- @wfh/log4js-pm2intercom
- @wfh/prebuild
- @wfh/tool-misc
- @wfh/vendor-binary
- @wfh/plink-cli
- @wfh/redux-toolkit-observable
- @wfh/thread-promise-pool
- @wfh/plink-global-types
