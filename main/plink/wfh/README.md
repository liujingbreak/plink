# Developing Plink

## tsconfig.json, tsconfig.orig.json
These 2 files are for Visual Code, not for actual build compilation.
## Share `node_modules` with multiple workspaces

Create the first workspace directory like normal, do `drcp init` in that directory. Then later on, create the second workspace directory, but create a symbolic link which links to workspace 1's folder `node_modules`.
```bash
ln -s ../workspace1/node_modules node_modules
``` 

### Mutiple configurations
For example, one workspace for responsive web projects which runs for all kinds of browser, and another workspace for advance projects which only support mobile browser. 

We can have different configuration like resolving setting, in workspace module `$` should be resolved to jQuery 1.x, but for workspace 2, it should be Zepto. Also chunk setting are probably different for 2 workspaces.

So that we can optimize our bundle and library for different client but also reuse some common components as much as possible.


