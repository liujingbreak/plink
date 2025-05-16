/// <import path="modules.d.ts" />
import reactAppCfg from 'eslint-config-react-app';
import { defineConfig } from 'eslint/config';
// import jsdocPlugin from 'eslint-plugin-jsdoc';
// import importPlugin from 'eslint-plugin-import';
// import preferArrow from 'eslint-plugin-prefer-arrow';
// import tseslint from 'typescript-eslint';
// import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
// import typescriptEslintTslint from '@typescript-eslint/eslint-plugin-tslint';
const reactOverride = reactAppCfg.overrides[0];
class Configurable {
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.common = Object.assign(Object.assign({ name: 'plink common', root: true }, reactAppCfg), { extends: [
                'eslint:recommended',
                ...reactAppCfg.extends
            ], ignorePatterns: [
                '**/dist/**/*',
                '**/*.d.ts',
                '**/*.d.mts',
                '**/*.d.cts',
                '**/node_modules/**'
            ], 
            // settings: {
            //   react: {
            //       version: reactVersion, // To override "detect" setting in CRA's eslint-config-react-app/base.js
            //   },
            // },
            overrides: [], rules: Object.assign(Object.assign({}, reactAppCfg.rules), { 'prefer-const': 'error', 'comma-dangle': ['error', 'never'], 'comma-spacing': ['warn', { before: false, after: true }], 'space-before-blocks': ['warn', 'always'], 'multiline-ternary': ['warn', 'always-multiline'], 'jsx-quotes': ['warn', 'prefer-double'], 
                // 'newline-per-chained-call': ['warn', {ignoreChainWithDepth: 3}],
                'key-spacing': ['warn', { afterColon: true }], 'array-bracket-newline': ['warn', { multiline: true }], 'object-curly-spacing': ['warn', 'never'], 'brace-style': [
                    'error', '1tbs', {
                        allowSingleLine: true
                    }
                ], 'no-extra-semi': 'off', 'prefer-rest-params': 'off', 'arrow-parens': [
                    'off',
                    'always'
                ], complexity: 'off', 'constructor-super': 'error', curly: [
                    'off',
                    'multi-line'
                ], 'default-case': 'error', 'dot-notation': 'error', 'eol-last': 'error', eqeqeq: [
                    'error',
                    'smart'
                ], 'guard-for-in': 'error', 'id-blacklist': 'off', 'id-match': 'off', 'import/order': ['warn', { groups: ['builtin', 'external', 'parent', 'sibling', 'index'] }], 'jsdoc/check-alignment': 'off', 'jsdoc/check-indentation': 'off', 'jsdoc/newline-after-description': 'off', 'linebreak-style': [
                    'error',
                    'unix'
                ], 'max-classes-per-file': 'off', 'new-parens': 'error', 'no-array-constructor': 'off', 'no-bitwise': 'off', 'no-caller': 'error', 'no-cond-assign': 'off', 'no-console': [
                    'error',
                    {
                        allow: [
                            'warn',
                            'dir',
                            'time',
                            'timeEnd',
                            'timeLog',
                            'trace',
                            'assert',
                            'clear',
                            'count',
                            'countReset',
                            'group',
                            'groupEnd',
                            'table',
                            'debug',
                            'info',
                            'dirxml',
                            'error',
                            'groupCollapsed',
                            'Console',
                            'profile',
                            'profileEnd',
                            'timeStamp',
                            'context'
                        ]
                    }
                ], 'no-constant-condition': 'off', 'no-debugger': 'error', 'no-empty': 'off', 'no-empty-function': 'off', 'no-eval': 'error', 'no-fallthrough': 'off', 'no-implied-eval': 'off', 'no-invalid-this': 'off', 'no-new-wrappers': 'off', 'no-shadow': 'off', 'no-throw-literal': 'error', 'no-trailing-spaces': [
                    'error',
                    {
                        ignoreComments: true
                    }
                ], 'no-undef-init': 'error', 'no-underscore-dangle': 'off', 'no-unsafe-finally': 'error', 'no-unused-expressions': 'error', 'no-unused-labels': 'error', 'no-unused-vars': 'off', 'no-use-before-define': 'off', 'no-var': 'off', 'object-shorthand': 'error', 'one-var': [
                    'off',
                    'never'
                ], 'prefer-arrow/prefer-arrow-functions': 'off', 'quote-props': [
                    'error',
                    'as-needed'
                ], quotes: ['warn', 'single', { avoidEscape: true }], radix: 'error', 'require-await': 'off', semi: 'error', 'space-before-function-paren': [
                    'error',
                    {
                        anonymous: 'never',
                        named: 'never'
                    }
                ], indent: ['warn', 2], 'spaced-comment': [
                    'error',
                    'always',
                    {
                        markers: ['/']
                    }
                ], 'use-isnan': 'error', 'valid-typeof': 'off', 'no-loop-func': 'warn', 'import/no-anonymous-default-export': 'off', 'array-callback-return': 'off', 'import/no-webpack-loader-syntax': 'off' // override rules from eslint-config-react-app
             }) });
        this.specifics = [];
    }
    addTsFiles(filePatterns, tsconfigFile) {
        this.specifics.push(createTsRulesOverride(filePatterns, tsconfigFile));
        return this;
    }
    build() {
        return defineConfig([this.common, ...this.specifics]);
    }
}
// To change default ignorePatterns
// config.ignorePatterns = ["**/*.d.ts"];
function createTsRulesOverride(filePatterns, tsconfigFile, debug = false) {
    return {
        files: filePatterns,
        extends: [
            'eslint:recommended',
            'plugin:@typescript-eslint/recommended',
            'plugin:@typescript-eslint/recommended-requiring-type-checking'
        ],
        excludedFiles: '*.d.ts',
        plugins: {
        // jsdoc: jsdocPlugin,
        // import: importPlugin,
        // preferArrow,
        // '@typescript-eslint': typescriptEslintPlugin
        },
        parser: '@typescript-eslint/parser',
        parserOptions: Object.assign(Object.assign({}, (reactOverride.parserOptions)), { debugLevel: debug, project: tsconfigFile }),
        rules: Object.assign(Object.assign({}, (reactOverride.rules)), { 'comma-dangle': 'off', '@typescript-eslint/comma-dangle': ['warn', 'never'], 'object-curly-spacing': 'off', '@typescript-eslint/prefer-optional-chain': 'warn', '@typescript-eslint/object-curly-spacing': ['warn', 'never'], '@typescript-eslint/no-unsafe-argument': 'off', 
            // '@typescript-eslint/tslint/config': [
            //   'warn', {
            //     rules: {
            //       whitespace: [
            //         true,
            //         'check-branch',
            //         'check-decl',
            //         'check-operator',
            //         // "check-module",
            //         'check-separator',
            //         'check-rest-spread',
            //         'check-type',
            //         'check-typecast',
            //         'check-type-operator'
            //         // "check-preblock",
            //         // "check-postbrace"
            //       ]
            //     }
            //   }
            // ],
            '@typescript-eslint/adjacent-overload-signatures': 'error', '@typescript-eslint/array-type': 'off', '@typescript-eslint/await-thenable': 'error', '@typescript-eslint/ban-ts-comment': 'error', '@typescript-eslint/ban-types': [
                'error',
                {
                    types: {
                        Object: {
                            message: 'Avoid using the `Object` type. Did you mean `object`?'
                        },
                        Function: {
                            message: 'Avoid using the `Function` type. Prefer a specific function type, like `() => void`.'
                        },
                        Boolean: {
                            message: 'Avoid using the `Boolean` type. Did you mean `boolean`?'
                        },
                        Number: {
                            message: 'Avoid using the `Number` type. Did you mean `number`?'
                        },
                        String: {
                            message: 'Avoid using the `String` type. Did you mean `string`?'
                        },
                        Symbol: {
                            message: 'Avoid using the `Symbol` type. Did you mean `symbol`?'
                        }
                    }
                }
            ], '@typescript-eslint/consistent-type-assertions': 'error', '@typescript-eslint/dot-notation': 'error', '@typescript-eslint/explicit-member-accessibility': [
                'error',
                {
                    accessibility: 'no-public'
                }
            ], '@typescript-eslint/explicit-module-boundary-types': 'off', indent: 'off', '@typescript-eslint/indent': [
                'warn',
                2
            ], '@typescript-eslint/member-delimiter-style': [
                'warn',
                {
                    multiline: {
                        delimiter: 'semi',
                        requireLast: true
                    },
                    singleline: {
                        delimiter: 'semi',
                        requireLast: false
                    }
                }
            ], '@typescript-eslint/naming-convention': 'off', '@typescript-eslint/no-array-constructor': 'error', '@typescript-eslint/no-empty-function': 'off', '@typescript-eslint/no-empty-interface': 'error', '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-extra-non-null-assertion': 'error', '@typescript-eslint/no-floating-promises': 'error', '@typescript-eslint/no-for-in-array': 'error', '@typescript-eslint/no-implied-eval': 'error', '@typescript-eslint/no-inferrable-types': 'error', '@typescript-eslint/no-misused-new': 'error', '@typescript-eslint/no-misused-promises': 'error', '@typescript-eslint/no-namespace': 'off', '@typescript-eslint/no-non-null-asserted-optional-chain': 'error', '@typescript-eslint/no-non-null-assertion': 'off', '@typescript-eslint/no-parameter-properties': 'off', '@typescript-eslint/no-shadow': [
                'off',
                {
                    hoist: 'all'
                }
            ], '@typescript-eslint/no-this-alias': 'warn', '@typescript-eslint/no-unnecessary-type-assertion': 'error', '@typescript-eslint/no-unsafe-assignment': 'warn', '@typescript-eslint/no-unsafe-call': 'warn', '@typescript-eslint/no-unsafe-member-access': 'warn', '@typescript-eslint/no-unsafe-return': 'warn', '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true
                }
            ], '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-use-before-define': 'off', '@typescript-eslint/no-var-requires': 'off', '@typescript-eslint/prefer-as-const': 'error', '@typescript-eslint/prefer-for-of': 'error', '@typescript-eslint/prefer-function-type': 'error', '@typescript-eslint/prefer-namespace-keyword': 'error', '@typescript-eslint/prefer-regexp-exec': 'error', '@typescript-eslint/quotes': [
                'error',
                'single',
                { avoidEscape: true }
            ], '@typescript-eslint/require-await': 'error', '@typescript-eslint/restrict-plus-operands': 'off', '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }], '@typescript-eslint/semi': [
                'error',
                'always'
            ], '@typescript-eslint/triple-slash-reference': [
                'off',
                {
                    path: 'always',
                    types: 'prefer-import',
                    lib: 'always'
                }
            ], '@typescript-eslint/no-extra-semi': 'error', '@typescript-eslint/unbound-method': ['off', { ignoreStatic: true }], '@typescript-eslint/unified-signatures': 'error' })
    };
}
const instance = new Configurable();
export default instance;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBQ2xDLE9BQU8sV0FBVyxNQUFNLHlCQUF5QixDQUFDO0FBQ2xELE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFFM0MsaURBQWlEO0FBQ2pELG1EQUFtRDtBQUNuRCx3REFBd0Q7QUFDeEQsNENBQTRDO0FBQzVDLHlFQUF5RTtBQUN6RSxnRkFBZ0Y7QUFFaEYsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUUvQyxNQUFNLFlBQVk7SUFBbEI7UUFDRSxtRUFBbUU7UUFDbkUsV0FBTSxpQ0FDSixJQUFJLEVBQUUsY0FBYyxFQUNwQixJQUFJLEVBQUUsSUFBSSxJQUNQLFdBQVcsS0FDZCxPQUFPLEVBQUU7Z0JBQ1Asb0JBQW9CO2dCQUNwQixHQUFHLFdBQVcsQ0FBQyxPQUFPO2FBQ3ZCLEVBQ0QsY0FBYyxFQUFFO2dCQUNkLGNBQWM7Z0JBQ2QsV0FBVztnQkFDWCxZQUFZO2dCQUNaLFlBQVk7Z0JBQ1osb0JBQW9CO2FBQ3JCO1lBQ0QsY0FBYztZQUNkLGFBQWE7WUFDYix3R0FBd0c7WUFDeEcsT0FBTztZQUNQLEtBQUs7WUFDTCxTQUFTLEVBQUUsRUFBRSxFQUNiLEtBQUssa0NBQ0EsV0FBVyxDQUFDLEtBQUssS0FDcEIsY0FBYyxFQUFFLE9BQU8sRUFDdkIsY0FBYyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUNsQyxlQUFlLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUN2RCxxQkFBcUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsRUFDekMsbUJBQW1CLEVBQUUsQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsRUFDakQsWUFB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LEVBQUMsQ0FBQyxFQUN0Ryx5QkFBeUIsRUFBRTtnQkFDekIsT0FBTztnQkFDUCxRQUFRO2FBQ1QsRUFDRCwyQ0FBMkMsRUFBRTtnQkFDM0MsS0FBSztnQkFDTDtvQkFDRSxJQUFJLEVBQUUsUUFBUTtvQkFDZCxLQUFLLEVBQUUsZUFBZTtvQkFDdEIsR0FBRyxFQUFFLFFBQVE7aUJBQ2Q7YUFDRixFQUNELGtDQUFrQyxFQUFFLE9BQU8sRUFDM0MsbUNBQW1DLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBQyxZQUFZLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFDbEUsdUNBQXVDLEVBQUUsT0FBTyxHQUNqRDtLQUNGLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztBQUVwQyxlQUFlLFFBQVEsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8aW1wb3J0IHBhdGg9XCJtb2R1bGVzLmQudHNcIiAvPlxuaW1wb3J0IHJlYWN0QXBwQ2ZnIGZyb20gJ2VzbGludC1jb25maWctcmVhY3QtYXBwJztcbmltcG9ydCB7ZGVmaW5lQ29uZmlnfSBmcm9tICdlc2xpbnQvY29uZmlnJztcbmltcG9ydCB7Q29uZmlnV2l0aEV4dGVuZHMsIFBsdWdpbn0gZnJvbSAnQGVzbGludC9jb25maWctaGVscGVycyc7XG4vLyBpbXBvcnQganNkb2NQbHVnaW4gZnJvbSAnZXNsaW50LXBsdWdpbi1qc2RvYyc7XG4vLyBpbXBvcnQgaW1wb3J0UGx1Z2luIGZyb20gJ2VzbGludC1wbHVnaW4taW1wb3J0Jztcbi8vIGltcG9ydCBwcmVmZXJBcnJvdyBmcm9tICdlc2xpbnQtcGx1Z2luLXByZWZlci1hcnJvdyc7XG4vLyBpbXBvcnQgdHNlc2xpbnQgZnJvbSAndHlwZXNjcmlwdC1lc2xpbnQnO1xuLy8gaW1wb3J0IHR5cGVzY3JpcHRFc2xpbnRQbHVnaW4gZnJvbSAnQHR5cGVzY3JpcHQtZXNsaW50L2VzbGludC1wbHVnaW4nO1xuLy8gaW1wb3J0IHR5cGVzY3JpcHRFc2xpbnRUc2xpbnQgZnJvbSAnQHR5cGVzY3JpcHQtZXNsaW50L2VzbGludC1wbHVnaW4tdHNsaW50JztcblxuY29uc3QgcmVhY3RPdmVycmlkZSA9IHJlYWN0QXBwQ2ZnLm92ZXJyaWRlc1swXTtcblxuY2xhc3MgQ29uZmlndXJhYmxlIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICBjb21tb246IENvbmZpZ1dpdGhFeHRlbmRzID0ge1xuICAgIG5hbWU6ICdwbGluayBjb21tb24nLFxuICAgIHJvb3Q6IHRydWUsXG4gICAgLi4ucmVhY3RBcHBDZmcsXG4gICAgZXh0ZW5kczogW1xuICAgICAgJ2VzbGludDpyZWNvbW1lbmRlZCcsXG4gICAgICAuLi5yZWFjdEFwcENmZy5leHRlbmRzXG4gICAgXSxcbiAgICBpZ25vcmVQYXR0ZXJuczogW1xuICAgICAgJyoqL2Rpc3QvKiovKicsXG4gICAgICAnKiovKi5kLnRzJyxcbiAgICAgICcqKi8qLmQubXRzJyxcbiAgICAgICcqKi8qLmQuY3RzJyxcbiAgICAgICcqKi9ub2RlX21vZHVsZXMvKionXG4gICAgXSxcbiAgICAvLyBzZXR0aW5nczoge1xuICAgIC8vICAgcmVhY3Q6IHtcbiAgICAvLyAgICAgICB2ZXJzaW9uOiByZWFjdFZlcnNpb24sIC8vIFRvIG92ZXJyaWRlIFwiZGV0ZWN0XCIgc2V0dGluZyBpbiBDUkEncyBlc2xpbnQtY29uZmlnLXJlYWN0LWFwcC9iYXNlLmpzXG4gICAgLy8gICB9LFxuICAgIC8vIH0sXG4gICAgb3ZlcnJpZGVzOiBbXSxcbiAgICBydWxlczoge1xuICAgICAgLi4ucmVhY3RBcHBDZmcucnVsZXMsXG4gICAgICAncHJlZmVyLWNvbnN0JzogJ2Vycm9yJyxcbiAgICAgICdjb21tYS1kYW5nbGUnOiBbJ2Vycm9yJywgJ25ldmVyJ10sXG4gICAgICAnY29tbWEtc3BhY2luZyc6IFsnd2FybicsIHtiZWZvcmU6IGZhbHNlLCBhZnRlcjogdHJ1ZX1dLFxuICAgICAgJ3NwYWNlLWJlZm9yZS1ibG9ja3MnOiBbJ3dhcm4nLCAnYWx3YXlzJ10sXG4gICAgICAnbXVsdGlsaW5lLXRlcm5hcnknOiBbJ3dhcm4nLCAnYWx3YXlzLW11bHRpbGluZSddLFxuICAgICAgJ2pzeC1xdW90ZXMnOiBbJ3dhcm4nLCAncHJlZmVyLWRvdWJsZSddLFxuICAgICAgLy8gJ25ld2xpbmUtcGVyLWNoYWluZWQtY2FsbCc6IFsnd2FybicsIHtpZ25vcmVDaGFpbldpdGhEZXB0aDogM31dLFxuICAgICAgJ2tleS1zcGFjaW5nJzogWyd3YXJuJywge2FmdGVyQ29sb246IHRydWV9XSxcbiAgICAgICdhcnJheS1icmFja2V0LW5ld2xpbmUnOiBbJ3dhcm4nLCB7bXVsdGlsaW5lOiB0cnVlfV0sXG4gICAgICAnb2JqZWN0LWN1cmx5LXNwYWNpbmcnOiBbJ3dhcm4nLCAnbmV2ZXInXSxcbiAgICAgICdicmFjZS1zdHlsZSc6IFtcbiAgICAgICAgJ2Vycm9yJywgJzF0YnMnLCB7XG4gICAgICAgICAgYWxsb3dTaW5nbGVMaW5lOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICAnbm8tZXh0cmEtc2VtaSc6ICdvZmYnLFxuICAgICAgJ3ByZWZlci1yZXN0LXBhcmFtcyc6ICdvZmYnLFxuICAgICAgJ2Fycm93LXBhcmVucyc6IFtcbiAgICAgICAgJ29mZicsXG4gICAgICAgICdhbHdheXMnXG4gICAgICBdLFxuICAgICAgY29tcGxleGl0eTogJ29mZicsXG4gICAgICAnY29uc3RydWN0b3Itc3VwZXInOiAnZXJyb3InLFxuICAgICAgY3VybHk6IFtcbiAgICAgICAgJ29mZicsXG4gICAgICAgICdtdWx0aS1saW5lJ1xuICAgICAgXSxcbiAgICAgICdkZWZhdWx0LWNhc2UnOiAnZXJyb3InLFxuICAgICAgJ2RvdC1ub3RhdGlvbic6ICdlcnJvcicsXG4gICAgICAnZW9sLWxhc3QnOiAnZXJyb3InLFxuICAgICAgZXFlcWVxOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgICdzbWFydCdcbiAgICAgIF0sXG4gICAgICAnZ3VhcmQtZm9yLWluJzogJ2Vycm9yJyxcbiAgICAgICdpZC1ibGFja2xpc3QnOiAnb2ZmJyxcbiAgICAgICdpZC1tYXRjaCc6ICdvZmYnLFxuICAgICAgJ2ltcG9ydC9vcmRlcic6IFsnd2FybicsIHtncm91cHM6IFsnYnVpbHRpbicsICdleHRlcm5hbCcsICdwYXJlbnQnLCAnc2libGluZycsICdpbmRleCddfV0sXG4gICAgICAnanNkb2MvY2hlY2stYWxpZ25tZW50JzogJ29mZicsXG4gICAgICAnanNkb2MvY2hlY2staW5kZW50YXRpb24nOiAnb2ZmJyxcbiAgICAgICdqc2RvYy9uZXdsaW5lLWFmdGVyLWRlc2NyaXB0aW9uJzogJ29mZicsXG4gICAgICAnbGluZWJyZWFrLXN0eWxlJzogW1xuICAgICAgICAnZXJyb3InLFxuICAgICAgICAndW5peCdcbiAgICAgIF0sXG4gICAgICAnbWF4LWNsYXNzZXMtcGVyLWZpbGUnOiAnb2ZmJyxcbiAgICAgICduZXctcGFyZW5zJzogJ2Vycm9yJyxcbiAgICAgICduby1hcnJheS1jb25zdHJ1Y3Rvcic6ICdvZmYnLFxuICAgICAgJ25vLWJpdHdpc2UnOiAnb2ZmJyxcbiAgICAgICduby1jYWxsZXInOiAnZXJyb3InLFxuICAgICAgJ25vLWNvbmQtYXNzaWduJzogJ29mZicsXG4gICAgICAnbm8tY29uc29sZSc6IFtcbiAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93OiBbXG4gICAgICAgICAgICAnd2FybicsXG4gICAgICAgICAgICAnZGlyJyxcbiAgICAgICAgICAgICd0aW1lJyxcbiAgICAgICAgICAgICd0aW1lRW5kJyxcbiAgICAgICAgICAgICd0aW1lTG9nJyxcbiAgICAgICAgICAgICd0cmFjZScsXG4gICAgICAgICAgICAnYXNzZXJ0JyxcbiAgICAgICAgICAgICdjbGVhcicsXG4gICAgICAgICAgICAnY291bnQnLFxuICAgICAgICAgICAgJ2NvdW50UmVzZXQnLFxuICAgICAgICAgICAgJ2dyb3VwJyxcbiAgICAgICAgICAgICdncm91cEVuZCcsXG4gICAgICAgICAgICAndGFibGUnLFxuICAgICAgICAgICAgJ2RlYnVnJyxcbiAgICAgICAgICAgICdpbmZvJyxcbiAgICAgICAgICAgICdkaXJ4bWwnLFxuICAgICAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgICAgICdncm91cENvbGxhcHNlZCcsXG4gICAgICAgICAgICAnQ29uc29sZScsXG4gICAgICAgICAgICAncHJvZmlsZScsXG4gICAgICAgICAgICAncHJvZmlsZUVuZCcsXG4gICAgICAgICAgICAndGltZVN0YW1wJyxcbiAgICAgICAgICAgICdjb250ZXh0J1xuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICduby1jb25zdGFudC1jb25kaXRpb24nOiAnb2ZmJyxcbiAgICAgICduby1kZWJ1Z2dlcic6ICdlcnJvcicsXG4gICAgICAnbm8tZW1wdHknOiAnb2ZmJyxcbiAgICAgICduby1lbXB0eS1mdW5jdGlvbic6ICdvZmYnLFxuICAgICAgJ25vLWV2YWwnOiAnZXJyb3InLFxuICAgICAgJ25vLWZhbGx0aHJvdWdoJzogJ29mZicsXG4gICAgICAnbm8taW1wbGllZC1ldmFsJzogJ29mZicsXG4gICAgICAnbm8taW52YWxpZC10aGlzJzogJ29mZicsXG4gICAgICAnbm8tbmV3LXdyYXBwZXJzJzogJ29mZicsXG4gICAgICAnbm8tc2hhZG93JzogJ29mZicsXG4gICAgICAnbm8tdGhyb3ctbGl0ZXJhbCc6ICdlcnJvcicsXG4gICAgICAnbm8tdHJhaWxpbmctc3BhY2VzJzogW1xuICAgICAgICAnZXJyb3InLFxuICAgICAgICB7XG4gICAgICAgICAgaWdub3JlQ29tbWVudHM6IHRydWVcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICduby11bmRlZi1pbml0JzogJ2Vycm9yJyxcbiAgICAgICduby11bmRlcnNjb3JlLWRhbmdsZSc6ICdvZmYnLFxuICAgICAgJ25vLXVuc2FmZS1maW5hbGx5JzogJ2Vycm9yJyxcbiAgICAgICduby11bnVzZWQtZXhwcmVzc2lvbnMnOiAnZXJyb3InLFxuICAgICAgJ25vLXVudXNlZC1sYWJlbHMnOiAnZXJyb3InLFxuICAgICAgJ25vLXVudXNlZC12YXJzJzogJ29mZicsXG4gICAgICAnbm8tdXNlLWJlZm9yZS1kZWZpbmUnOiAnb2ZmJyxcbiAgICAgICduby12YXInOiAnb2ZmJyxcbiAgICAgICdvYmplY3Qtc2hvcnRoYW5kJzogJ2Vycm9yJyxcbiAgICAgICdvbmUtdmFyJzogW1xuICAgICAgICAnb2ZmJyxcbiAgICAgICAgJ25ldmVyJ1xuICAgICAgXSxcbiAgICAgICdwcmVmZXItYXJyb3cvcHJlZmVyLWFycm93LWZ1bmN0aW9ucyc6ICdvZmYnLFxuICAgICAgJ3F1b3RlLXByb3BzJzogW1xuICAgICAgICAnZXJyb3InLFxuICAgICAgICAnYXMtbmVlZGVkJ1xuICAgICAgXSxcbiAgICAgIHF1b3RlczogWyd3YXJuJywgJ3NpbmdsZScsIHthdm9pZEVzY2FwZTogdHJ1ZX1dLFxuICAgICAgcmFkaXg6ICdlcnJvcicsXG4gICAgICAncmVxdWlyZS1hd2FpdCc6ICdvZmYnLFxuICAgICAgc2VtaTogJ2Vycm9yJyxcbiAgICAgICdzcGFjZS1iZWZvcmUtZnVuY3Rpb24tcGFyZW4nOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgIHtcbiAgICAgICAgICBhbm9ueW1vdXM6ICduZXZlcicsXG4gICAgICAgICAgbmFtZWQ6ICduZXZlcidcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIGluZGVudDogWyd3YXJuJywgMl0sXG4gICAgICAnc3BhY2VkLWNvbW1lbnQnOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgICdhbHdheXMnLFxuICAgICAgICB7XG4gICAgICAgICAgbWFya2VyczogWycvJ11cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICd1c2UtaXNuYW4nOiAnZXJyb3InLFxuICAgICAgJ3ZhbGlkLXR5cGVvZic6ICdvZmYnLFxuICAgICAgJ25vLWxvb3AtZnVuYyc6ICd3YXJuJyxcbiAgICAgICdpbXBvcnQvbm8tYW5vbnltb3VzLWRlZmF1bHQtZXhwb3J0JzogJ29mZicsIC8vIG92ZXJyaWRlIHJ1bGVzIGZyb20gZXNsaW50LWNvbmZpZy1yZWFjdC1hcHBcbiAgICAgICdhcnJheS1jYWxsYmFjay1yZXR1cm4nOiAnb2ZmJyxcbiAgICAgICdpbXBvcnQvbm8td2VicGFjay1sb2FkZXItc3ludGF4JzogJ29mZicgLy8gb3ZlcnJpZGUgcnVsZXMgZnJvbSBlc2xpbnQtY29uZmlnLXJlYWN0LWFwcFxuICAgIH1cbiAgfTtcblxuICBzcGVjaWZpY3MgPSBbXSBhcyBDb25maWdXaXRoRXh0ZW5kc1tdO1xuXG4gIGFkZFRzRmlsZXMoZmlsZVBhdHRlcm5zOiBzdHJpbmdbXSwgdHNjb25maWdGaWxlOiBzdHJpbmcpIHtcbiAgICB0aGlzLnNwZWNpZmljcy5wdXNoKGNyZWF0ZVRzUnVsZXNPdmVycmlkZShmaWxlUGF0dGVybnMsIHRzY29uZmlnRmlsZSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYnVpbGQoKSB7XG4gICAgcmV0dXJuIGRlZmluZUNvbmZpZyhbdGhpcy5jb21tb24sIC4uLnRoaXMuc3BlY2lmaWNzXSk7XG4gIH1cbn1cblxuLy8gVG8gY2hhbmdlIGRlZmF1bHQgaWdub3JlUGF0dGVybnNcbi8vIGNvbmZpZy5pZ25vcmVQYXR0ZXJucyA9IFtcIioqLyouZC50c1wiXTtcblxuZnVuY3Rpb24gY3JlYXRlVHNSdWxlc092ZXJyaWRlKGZpbGVQYXR0ZXJuczogc3RyaW5nW10sIHRzY29uZmlnRmlsZTogc3RyaW5nLCBkZWJ1ZyA9IGZhbHNlKSB7XG4gIHJldHVybiB7XG4gICAgZmlsZXM6IGZpbGVQYXR0ZXJucyxcbiAgICBleHRlbmRzOiBbXG4gICAgICAnZXNsaW50OnJlY29tbWVuZGVkJyxcbiAgICAgICdwbHVnaW46QHR5cGVzY3JpcHQtZXNsaW50L3JlY29tbWVuZGVkJyxcbiAgICAgICdwbHVnaW46QHR5cGVzY3JpcHQtZXNsaW50L3JlY29tbWVuZGVkLXJlcXVpcmluZy10eXBlLWNoZWNraW5nJ1xuICAgIF0sXG4gICAgZXhjbHVkZWRGaWxlczogJyouZC50cycsXG4gICAgcGx1Z2luczoge1xuICAgICAgLy8ganNkb2M6IGpzZG9jUGx1Z2luLFxuICAgICAgLy8gaW1wb3J0OiBpbXBvcnRQbHVnaW4sXG4gICAgICAvLyBwcmVmZXJBcnJvdyxcbiAgICAgIC8vICdAdHlwZXNjcmlwdC1lc2xpbnQnOiB0eXBlc2NyaXB0RXNsaW50UGx1Z2luXG4gICAgfSBhcyBSZWNvcmQ8c3RyaW5nLCBQbHVnaW4+LFxuICAgIHBhcnNlcjogJ0B0eXBlc2NyaXB0LWVzbGludC9wYXJzZXInLFxuICAgIHBhcnNlck9wdGlvbnM6IHtcbiAgICAgIC4uLihyZWFjdE92ZXJyaWRlLnBhcnNlck9wdGlvbnMpLFxuICAgICAgZGVidWdMZXZlbDogZGVidWcsXG4gICAgICBwcm9qZWN0OiB0c2NvbmZpZ0ZpbGVcbiAgICB9LFxuICAgIHJ1bGVzOiB7XG4gICAgICAuLi4ocmVhY3RPdmVycmlkZS5ydWxlcyksXG4gICAgICAnY29tbWEtZGFuZ2xlJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2NvbW1hLWRhbmdsZSc6IFsnd2FybicsICduZXZlciddLFxuICAgICAgJ29iamVjdC1jdXJseS1zcGFjaW5nJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1vcHRpb25hbC1jaGFpbic6ICd3YXJuJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvb2JqZWN0LWN1cmx5LXNwYWNpbmcnOiBbJ3dhcm4nLCAnbmV2ZXInXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50JzogJ29mZicsXG4gICAgICAvLyAnQHR5cGVzY3JpcHQtZXNsaW50L3RzbGludC9jb25maWcnOiBbXG4gICAgICAvLyAgICd3YXJuJywge1xuICAgICAgLy8gICAgIHJ1bGVzOiB7XG4gICAgICAvLyAgICAgICB3aGl0ZXNwYWNlOiBbXG4gICAgICAvLyAgICAgICAgIHRydWUsXG4gICAgICAvLyAgICAgICAgICdjaGVjay1icmFuY2gnLFxuICAgICAgLy8gICAgICAgICAnY2hlY2stZGVjbCcsXG4gICAgICAvLyAgICAgICAgICdjaGVjay1vcGVyYXRvcicsXG4gICAgICAvLyAgICAgICAgIC8vIFwiY2hlY2stbW9kdWxlXCIsXG4gICAgICAvLyAgICAgICAgICdjaGVjay1zZXBhcmF0b3InLFxuICAgICAgLy8gICAgICAgICAnY2hlY2stcmVzdC1zcHJlYWQnLFxuICAgICAgLy8gICAgICAgICAnY2hlY2stdHlwZScsXG4gICAgICAvLyAgICAgICAgICdjaGVjay10eXBlY2FzdCcsXG4gICAgICAvLyAgICAgICAgICdjaGVjay10eXBlLW9wZXJhdG9yJ1xuICAgICAgLy8gICAgICAgICAvLyBcImNoZWNrLXByZWJsb2NrXCIsXG4gICAgICAvLyAgICAgICAgIC8vIFwiY2hlY2stcG9zdGJyYWNlXCJcbiAgICAgIC8vICAgICAgIF1cbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH1cbiAgICAgIC8vIF0sXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2FkamFjZW50LW92ZXJsb2FkLXNpZ25hdHVyZXMnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9hcnJheS10eXBlJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2F3YWl0LXRoZW5hYmxlJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXRzLWNvbW1lbnQnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9iYW4tdHlwZXMnOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlczoge1xuICAgICAgICAgICAgT2JqZWN0OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdm9pZCB1c2luZyB0aGUgYE9iamVjdGAgdHlwZS4gRGlkIHlvdSBtZWFuIGBvYmplY3RgPydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBGdW5jdGlvbjoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQXZvaWQgdXNpbmcgdGhlIGBGdW5jdGlvbmAgdHlwZS4gUHJlZmVyIGEgc3BlY2lmaWMgZnVuY3Rpb24gdHlwZSwgbGlrZSBgKCkgPT4gdm9pZGAuJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEJvb2xlYW46IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0F2b2lkIHVzaW5nIHRoZSBgQm9vbGVhbmAgdHlwZS4gRGlkIHlvdSBtZWFuIGBib29sZWFuYD8nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTnVtYmVyOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdm9pZCB1c2luZyB0aGUgYE51bWJlcmAgdHlwZS4gRGlkIHlvdSBtZWFuIGBudW1iZXJgPydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTdHJpbmc6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0F2b2lkIHVzaW5nIHRoZSBgU3RyaW5nYCB0eXBlLiBEaWQgeW91IG1lYW4gYHN0cmluZ2A/J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFN5bWJvbDoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQXZvaWQgdXNpbmcgdGhlIGBTeW1ib2xgIHR5cGUuIERpZCB5b3UgbWVhbiBgc3ltYm9sYD8nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9jb25zaXN0ZW50LXR5cGUtYXNzZXJ0aW9ucyc6ICdlcnJvcicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvbic6ICdlcnJvcicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1lbWJlci1hY2Nlc3NpYmlsaXR5JzogW1xuICAgICAgICAnZXJyb3InLFxuICAgICAgICB7XG4gICAgICAgICAgYWNjZXNzaWJpbGl0eTogJ25vLXB1YmxpYydcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbW9kdWxlLWJvdW5kYXJ5LXR5cGVzJzogJ29mZicsXG4gICAgICBpbmRlbnQ6ICdvZmYnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQnOiBbXG4gICAgICAgICd3YXJuJyxcbiAgICAgICAgMlxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbWVtYmVyLWRlbGltaXRlci1zdHlsZSc6IFtcbiAgICAgICAgJ3dhcm4nLFxuICAgICAgICB7XG4gICAgICAgICAgbXVsdGlsaW5lOiB7XG4gICAgICAgICAgICBkZWxpbWl0ZXI6ICdzZW1pJyxcbiAgICAgICAgICAgIHJlcXVpcmVMYXN0OiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaW5nbGVsaW5lOiB7XG4gICAgICAgICAgICBkZWxpbWl0ZXI6ICdzZW1pJyxcbiAgICAgICAgICAgIHJlcXVpcmVMYXN0OiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb24nOiAnb2ZmJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tYXJyYXktY29uc3RydWN0b3InOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1mdW5jdGlvbic6ICdvZmYnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2UnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnknOiAnb2ZmJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXh0cmEtbm9uLW51bGwtYXNzZXJ0aW9uJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZmxvYXRpbmctcHJvbWlzZXMnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1mb3ItaW4tYXJyYXknOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1pbXBsaWVkLWV2YWwnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1pbmZlcnJhYmxlLXR5cGVzJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1uZXcnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1taXN1c2VkLXByb21pc2VzJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGVkLW9wdGlvbmFsLWNoYWluJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXBhcmFtZXRlci1wcm9wZXJ0aWVzJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXNoYWRvdyc6IFtcbiAgICAgICAgJ29mZicsXG4gICAgICAgIHtcbiAgICAgICAgICBob2lzdDogJ2FsbCdcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhcyc6ICd3YXJuJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1hc3NlcnRpb24nOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCc6ICd3YXJuJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGwnOiAnd2FybicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzJzogJ3dhcm4nLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuJzogJ3dhcm4nLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtZXhwcmVzc2lvbnMnOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd1Nob3J0Q2lyY3VpdDogdHJ1ZVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyc6ICdvZmYnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZSc6ICdvZmYnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXMnOiAnb2ZmJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWFzLWNvbnN0JzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWZvci1vZic6ICdlcnJvcicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1mdW5jdGlvbi10eXBlJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLW5hbWVzcGFjZS1rZXl3b3JkJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLXJlZ2V4cC1leGVjJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcXVvdGVzJzogW1xuICAgICAgICAnZXJyb3InLFxuICAgICAgICAnc2luZ2xlJyxcbiAgICAgICAge2F2b2lkRXNjYXBlOiB0cnVlfVxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcmVxdWlyZS1hd2FpdCc6ICdlcnJvcicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMnOiAnb2ZmJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnMnOiBbJ2Vycm9yJywge2FsbG93TnVtYmVyOiB0cnVlLCBhbGxvd0Jvb2xlYW46IHRydWV9XSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvc2VtaSc6IFtcbiAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgJ2Fsd2F5cydcbiAgICAgIF0sXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3RyaXBsZS1zbGFzaC1yZWZlcmVuY2UnOiBbXG4gICAgICAgICdvZmYnLFxuICAgICAgICB7XG4gICAgICAgICAgcGF0aDogJ2Fsd2F5cycsXG4gICAgICAgICAgdHlwZXM6ICdwcmVmZXItaW1wb3J0JyxcbiAgICAgICAgICBsaWI6ICdhbHdheXMnXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4dHJhLXNlbWknOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZCc6IFsnb2ZmJywge2lnbm9yZVN0YXRpYzogdHJ1ZX1dLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC91bmlmaWVkLXNpZ25hdHVyZXMnOiAnZXJyb3InXG4gICAgfVxuICB9O1xufVxuXG5jb25zdCBpbnN0YW5jZSA9IG5ldyBDb25maWd1cmFibGUoKTtcblxuZXhwb3J0IGRlZmF1bHQgaW5zdGFuY2U7XG4iXX0=