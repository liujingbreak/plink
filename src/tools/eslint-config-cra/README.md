## Usage
### 1. Add dependencies to project root
```json
"devDependencies": {
  "typescript": "^4.1.2",
  "@wfh/eslint-config-cra": "^1.0.0"
}
```
### 2. create a **.eslintrc** file in your project root directory
```js
const config = require('@wfh/eslint-config-cra').create(
  require('path').resolve(__dirname, 'tsconfig.json'),
  '17.0.2' // React version
);

// To change default ignorePatterns
config.ignorePatterns = ["**/*.d.ts"];

module.exports = config;
```
Default ignorePatterns:
```js
    "ignorePatterns": [
        "**/dist/**/*",
        "**/*.d.ts"
    ]
```


Do not use Eslint "extend" approach, since all the dependencies are installed under "@wfh/eslint-config-cra" directory, not current project level.
