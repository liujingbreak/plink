const Path = require('path');
const config = require('./main/eslint-config').default;

config.addTsFiles('main/**/*.ts', Path.resolve(__dirname, 'tsconfig.json'), true);

module.exports = config.build();
