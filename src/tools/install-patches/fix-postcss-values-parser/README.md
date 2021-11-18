# To workaround issue in postcss-values-parser 2.0.1
https://github.com/shellscape/postcss-values-parser/issues/138#issuecomment-973797755

It is meant to replace `postcss-values-parser/lib/parser.js`

### 1. Find the right **postcss-values-parser** to be replaced.
  Depended by **react-scripts -> postcss-preset-env**, therefore following location needs to be checked in order:
```
node_modules/react-scripts/node_modules/postcss-preset-env/node_modules/postcss-values-parser
node_modules/react-scripts/node_modules/postcss-values-parser
node_modules/postcss-values-parser
```

### 2. Confirm version is 2.0.1
checkout postcss-values-parser/package.json for version field.
