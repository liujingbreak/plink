# Changelog
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
