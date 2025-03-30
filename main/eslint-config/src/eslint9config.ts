import eslint from '@eslint/js';
import tseslint, {ConfigArray} from 'typescript-eslint';
import style from '@stylistic/eslint-plugin';

export function createConfigObj(tsconfigDir: string, tsconfigFileName = 'tsconfig.json'): ConfigArray {
  return tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,

    {
      languageOptions: {
        parserOptions: {
          projectService: {
            defaultProject: tsconfigFileName
          },
          tsconfigRootDir: tsconfigDir
        }
      },
      plugins: {
        '@stylistic': style
      },
      extends: [style.configs.customize({
        semi: true,
        blockSpacing: false,
        braceStyle: '1tbs',
        commaDangle: 'only-multiline'
      })],
      rules: {
        // To check original plugin's rules, read:
        // /node_modules/@stylistic/eslint-plugin/dist/configs.js
        // and https://eslint.style/rules/js/operator-linebreak#js-operator-linebreak
        '@stylistic/comma-dangle': ['warn', 'only-multiline'],
        '@stylistic/arrow-parens': ['error', 'as-needed'],
        '@stylistic/object-curly-spacing': ['warn', 'never'],
        '@stylistic/operator-linebreak': ['error', 'after'],
        '@stylistic/multiline-ternary': 'off',
        // Doc: https://typescript-eslint.io/rules
        '@typescript-eslint/prefer-optional-chain': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/restrict-template-expressions': ['warn', {allowNumber: true}],
        '@typescript-eslint/no-deprecated': 'warn'
        // 'no-unused-vars': 'off',
        // '@typescript-eslint/no-unused-vars': ['warn', ]
      }
    }
  );
}
