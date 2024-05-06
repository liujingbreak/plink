# More than package and project link toolkit

```
 ██████╗  ██╗      ██╗ ███╗   ██╗ ██╗  ██╗ 
 ██╔══██╗ ██║      ██║ ████╗  ██║ ██║ ██╔╝ 
 ██████╔╝ ██║      ██║ ██╔██╗ ██║ █████╔╝  
 ██╔═══╝  ██║      ██║ ██║╚██╗██║ ██╔═██╗  
 ██║      ███████╗ ██║ ██║ ╚████║ ██║  ██╗ 
 ╚═╝      ╚══════╝ ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═╝ 
```

## 0. The repositity of this package itself is not only a toolkit, but also a gathering of projects in form of monorepo

Some of the top important projects it involves are:

- @wfh/reactivizer - [an Reactive programming library based on top of RxJS](./packages/reactivizer/README.md)
- @wfh/algorithms - [Extensible algorithms and data structure that Plink's project depends on](./packages/algorithms/README.md)

If heard about **Lerna**, **Yarn**'s workspace concept and [Nx](https://nx.dev), yes this tool is a little bit in the same category.

<!-- vscode-markdown-toc -->
* 1. [Purpose](#Purpose)
* 2. [A command line tool](#Acommandlinetool)
	* 2.1. [Why Monorepos ?](#WhyMonorepos)
	* 2.2. [Plink monorepo multiple-repo style](#Plinkmonorepomultiple-repostyle)
	* 2.3. [Directory structure may look like:](#Directorystructuremaylooklike:)
		* 2.3.1. [Dependency installation space](#Dependencyinstallationspace)
		* 2.3.2. [Project and Packages directory](#ProjectandPackagesdirectory)
	* 2.4. [How it works](#Howitworks)
* 3. [Features](#Features)
* 4. [Environment variables and working directories](#Environmentvariablesandworkingdirectories)
		* 4.1. [Change `dist` to other directory](#Changedisttootherdirectory)
* 5. [Unlike Yarn workspaces](#UnlikeYarnworkspaces)
* 6. [Dependency Hoist](#DependencyHoist)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

##  1. <a name='Purpose'></a>Purpose
To embrace **Monorepo** and **Multiple-repo** at same time.

Web (or Node.js) frameworks or libraries like Angular, React, Vue, NestJS, they all come up with command line tools which help developer to initialize web projects, most of them are like scaffolding tool. Most of the tools are limited at or totally not supporting monorepo/library authoring. Which brings a lot room for enterprise developer to improve for sharing and maintaining resuable modules or functions cross multiple projects.

We want to offer similar experience of developing Web appliactions like authoring Chrome extension for a Chrome browser, composing extension for Visual studio code. Easy to extend under certain standards.

We want our appliactions be able to share fundations of UI, state management, server side functions and tools while different application goes separate CI/CD process like microservice.

##  2. <a name='Acommandlinetool'></a>A command line tool
- to manipulate monorepo style projects and also connect multiple repos.

- to resue and share packages/components/tools between multiple projects or repos.

  <h4>Extensible sub commands</h4>
  <div class="round-corner">
    <img src="doc-app/doc-entry/docs/zh/architecture/plink-cli-screenshot-01-min.png">
  </div>
  <div class="round-corner">
    <img src="doc-app/doc-entry/docs/zh/architecture/plink-cli-screenshot-02-min.png">
  </div>
  <h4>Configuration visualization for each package</h4>
  <div class="round-corner">
    <img src="doc-app/doc-entry/docs/zh/architecture/plink-cli-screenshot-07-min.png">
  </div>
  <h4>Configuration visualization for each package</h4>
  <div class="round-corner">
    <img src="doc-app/doc-entry/docs/zh/architecture/plink-cli-screenshot-04-min.png">
  </div>
  <div class="round-corner">
    <img src="doc-app/doc-entry/docs/zh/architecture/plink-cli-screenshot-05-min.png">
  </div>
  <div class="round-corner">
    <img src="doc-app/doc-entry/docs/zh/architecture/plink-cli-screenshot-06-min.png">
  </div>

###  2.1. <a name='WhyMonorepos'></a>Why Monorepos ?
[A perfect monorepo pitch in Nx](https://nx.dev/latest/node/core-concepts/why-monorepos)

A monorepo is a single git repository that holds the source code for multiple applications and libraries, along with the tooling for them.

What are the benefits of a monorepo?
- **Shared code** - Keep your code DRY across your entire organization. Reuse validation code, UI components and types across the code base. Reuse code between the backend and the frontend.

- **Atomic changes** - Change a server API and modify the clients that consume that API in the same commit. You can change a button component in a shared library and the applications that use that component in the same commit. This saves the pain of trying to coordinate commits across multiple repositories.

- **Developer mobility** - Get a consistent way of building and testing applications written using different tools and technologies. Developers can confidently contribute to other teams’ applications and verify that their changes are safe.

- **Single set of dependencies** - Use a single version of third party dependencies for all your apps. Less frequently used applications don’t get left behind with a 3 year old version of a framework library or an old version of webpack.
###  2.2. <a name='Plinkmonorepomultiple-repostyle'></a>Plink monorepo multiple-repo style
> Node packages are first class citizen in Plink project. Plink enforce project source code structure in form of multiple packages.

- You may have multiple web (Node.js) projects, some are based on Node.js Express.js framework, some are based on React and Redux, and some are based on Angular.

- You may have a single source code directory contains reusable (partially) modules, some Redux code could be shared cross React projects and Angular project, some isomophic Node.js code may be reused on all web projects as backend server or build process enhancement.

- Source code is organized in form of Node packages at first place, so that they can be shared cross repositaries. Projects in the same repo can directly reference relative source code. Other project can install them as node package to their build and deploy environment.

- **You may link multiple projects that is inside or outside current repository, build them together, run them together, without**

###  2.3. <a name='Directorystructuremaylooklike:'></a>Directory structure may look like:
- A simple Plink style repo is basically same as Lerna project structure
```
/- < Repository root directory >
  |- package.json
  |- node_modules
  |- dist/
  |   |- plink-state.json
  |
  |- packages/
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

- A Plink style monorepo with multiple dependency installation space
```
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
  |- dist/
  |   |- plink-state.json
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
####  2.3.1. <a name='Dependencyinstallationspace'></a>Dependency installation space
`react-space`, `angular-space`, `node-space` are quite like Yarn's workspace tree concept. Basically, these are the places where we install dependency, build client side application and run web server or tools.

####  2.3.2. <a name='ProjectandPackagesdirectory'></a>Project and Packages directory
`packages/` are where Plink scans for source code packages, we organize raw source code in form of packages, reference each other like a regular package module:
```js
import something from '@foobar/redux-slice-A';
```

**Project** is a repository which contains `packages/` like directory.

###  2.4. <a name='Howitworks'></a>How it works
> Relationship, symlinks, NODE_PATH, Webpack module.resolve...
(WIP)

##  3. <a name='Features'></a>Features
 - Support monorepo project structure.
 - Hoist and merge dependencies of nested packages.
 - Work with tools like `create-react-app` and `@angular/cli`
 - Share reusable component, features, functions cross different projects.
 - Share file structure, configurations cross different projects.
 - Easy to upgrade.
 - Opinionated cross framework solutions, web components, libraries, tools.
 - Automation code generator for configuration, UI components, state management slice...
 - Source code dependency analysis tool

##  4. <a name='Environmentvariablesandworkingdirectories'></a>Environment variables and working directories
- **dist**

  Plink needs a directory to save cached state file, generated files, report and any other temporary data.
  Such a directory should not be checked in Git repo, by default this directory is named "dist", and Plink will assign an
  environment vararible `PLINK_DATA_DIR` with this default directory path `dist`, all pluggable command line extension modules and
  forked process (or thread worker) can access this variable `process.env.PLINK_DATA_DIR`.
####  4.1. <a name='Changedisttootherdirectory'></a>Change `dist` to other directory

  Simple assign environment variable PLINK_DATA_DIR to any relative path name before start plink command.
  > PLINK_DATA_DIR must be a relative path, not absolute path.

##  5. <a name='UnlikeYarnworkspaces'></a>Unlike Yarn workspaces
(WIP)

##  6. <a name='DependencyHoist'></a>Dependency Hoist

The idea is a bit like Java Maven's Dependency Mechanism (Transitive dependencies)
https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html

Like Maven, we treat dependencies of linked packages as "Transitive dependencies", linked packages do not need to
install their dependencies in their own `node_modules`, instead we install all dependencies of all related linked
packages in current space's node_modules directory as being shared.

Unlike Maven, to resolve the conflict of transitive dependency, we only use "the highest version" of conflict dependencies, not the first version. https://dzone.com/articles/solving-dependency-conflicts-in-maven
