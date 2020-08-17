# Package Link core

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
