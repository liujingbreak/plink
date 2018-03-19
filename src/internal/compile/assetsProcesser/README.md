When `config.yaml`'s `devMode` has a `false` value or
you execute gulp command with arguments `--copyAssets`
```
gulp compile --copyAssets
```
this tool will copy all files from each package's `assets` folder to `dist/static/<package-name>`.

This tool will also started as Node service and routes `http://<server-host>:<port>/<package-name>/` to corresponding package's assets folder
