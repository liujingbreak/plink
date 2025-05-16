# PLink 2 package, workspace, dependency management
## Features
- Monorepo of multile soure code packages, source code packages can be organized in arbitrary directory structure
- Multiple dependency installation space (the directory where contains package.json file and in which supposed to be run `npm instsll`, `npm run`), in this way , allow multiple scopes of dependency trees.
- Allow dependency reference to source packages which is located outside of current monorepo, so that as a developer, we don't need to install all packages during debugging or developing
  - Switch to "install" packages of _workspaces_ (change package.json and reinstall)
  - Switch back to _workspaces_ mode
- Extensible command line tool
~~- Source package symlinks generating.~~
- Typescript tsconfig.json file auto-generating
- Typescript composite project configutaion for each _workspace_ package

# --- Below is PLink 1 relevant ---

## Package Link core
### PLink 2
```mermaid
mindmap
((Root))
  Requirements
    add/remove project,src directory
    scan packages of repo
    install workspace<br>tree dependencies
  ORM
    project
      package.json
        patterns
>>>>>>> Stashed changes

```
### Entities

1. #### Source packages
   - directory
   - package.json file, dependencies

2. #### Workspaces
   - package.json, dependencies

3. #### Projects (repo)
   - package.json, property "packages"

### User cases

#### User operations on file system
- Add/delete source packages
- Update files:
  - package.json files in `Source package`, `workspace` and `project`

#### Command line cases
- [x] Hoist dependency in workspace package.json file, install dependency in workspace
- [x] Write `tsconfig.json` in each source packages, so that **Visual code** can work on TS file.
- [x] Set environment variable `NODE_PATH`
- [x] Link source packages to root workspace directory `node_modules`
- [ ] Add/delete project
