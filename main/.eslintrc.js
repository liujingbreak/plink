const config = require('@wfh/eslint-config-cra').create(
    require('path').resolve(__dirname, 'tsconfig.json'),
    '17.0.2' // React version
);

// To change default ignorePatterns
config.ignorePatterns = ["wfh/dist/**/*"];

module.exports = config;
