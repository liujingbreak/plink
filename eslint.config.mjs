import {createConfigObj} from './main/eslint-config/dist/eslint9config.js';
const config = createConfigObj(import.meta.dirname)({
  rules: {
    '@typescript-eslint/no-require-imports': 'warn'
  }
});
export default config;
