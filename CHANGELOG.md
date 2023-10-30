# Changelog
## @wfh/reactivizer 0.1.1
- RxController supports new methods: groupControllerBy(), connect()
- ControllerCore supports new option property "autoConnect"
- ControllerCore supports new meta event observables: actionSubscribed$, actionUnsubscribed$
- new "Table"'s member fields "latestPayloadsByName$", "latestPayloadsSnapshot$"
 
## Plink 0.13.x
- Upgrade RxJS version to 7.x.x

## @wfh/reactivizer 0.1.0, @wfh/algorithms 1.0.0
- New Rx utilities library to replace @wfh/redux-toolkit-observable, which has zero 3rd-party dependency
- Common algorithms that Plink and reactivizer use

## Plink 0.12.1
- `plink pack` will retry twice in case encountering error due to incomplete `npm pack` command output.
- Bug fixes

## Plink 0.12.0
Big refactor to use symlinks instead of NODE_PATH hacking for monorepor module loading resolution approach.

## dr-comp-package@0.6.0
- Component's package.json property `dr.jsLoader` is no longer required,
`.ts`, `.tsx` file will be transformed by `ts-loader` by default.

- **Hot module replacement** can be enabled by providing command option "`--hmr`" in webpack watch command `node app watch <component...> --hmr`, when *Hot module replacement* is enabled, **live reload** will be disabled, and **extract-text-webpack-plugin** will also be disabled.

## dr-comp-package@0.5.7
Fix unit test commond `drcp test`

## dr-comp-package@0.5.3, @dr/internal-recipe@0.6.10
- Upgrade ts-loader to v3.1.1
- ### Server side typescript compilation command
	```bash
	drcp tsc [package...] [-w]
	```
	which compiles `<component-directory>/ts/**/*.ts` to `<component-directory>/dist` for each component.

	`-w` as start watch mode.
