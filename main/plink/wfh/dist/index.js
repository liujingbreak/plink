"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <import path="modules.d.ts" />
const eslint_config_react_app_1 = __importDefault(require("eslint-config-react-app"));
const reactOverride = eslint_config_react_app_1.default.overrides[0];
class Configurable {
    constructor() {
        this.rule = Object.assign(Object.assign({ root: true }, eslint_config_react_app_1.default), { extends: [
                'eslint:recommended',
                ...eslint_config_react_app_1.default.extends
            ], ignorePatterns: [
                '**/dist/**/*',
                '**/*.d.ts',
                '**/*.d.mts',
                '**/*.d.cts'
            ], 
            // settings: {
            //   react: {
            //       version: reactVersion, // To override "detect" setting in CRA's eslint-config-react-app/base.js
            //   },
            // },
            overrides: [], rules: Object.assign(Object.assign({}, eslint_config_react_app_1.default.rules), { 'prefer-const': 'error', 'comma-dangle': ['error', 'never'], 'comma-spacing': ['warn', { before: false, after: true }], 'space-before-blocks': ['warn', 'always'], 'multiline-ternary': ['warn', 'always-multiline'], 'jsx-quotes': ['warn', 'prefer-double'], 
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
    }
    addTsFiles(files, tsconfigFile) {
        this.rule.overrides.push(createTsRulesOverride(files, tsconfigFile));
        return this;
    }
    build() {
        return this.rule;
    }
}
// To change default ignorePatterns
// config.ignorePatterns = ["**/*.d.ts"];
function createTsRulesOverride(files, tsconfigFile) {
    return {
        files,
        extends: [
            'eslint:recommended',
            'plugin:@typescript-eslint/recommended',
            'plugin:@typescript-eslint/recommended-requiring-type-checking'
        ],
        excludedFiles: '*.d.ts',
        plugins: [
            'jsdoc',
            'import',
            'prefer-arrow',
            '@typescript-eslint',
            '@typescript-eslint/tslint'
        ],
        parser: '@typescript-eslint/parser',
        parserOptions: Object.assign(Object.assign({}, (reactOverride.parserOptions)), { 
            // debugLevel: true,
            project: tsconfigFile }),
        rules: Object.assign(Object.assign({}, (reactOverride.rules)), { 'comma-dangle': 'off', '@typescript-eslint/comma-dangle': ['warn', 'never'], 'object-curly-spacing': 'off', '@typescript-eslint/prefer-optional-chain': 'warn', '@typescript-eslint/object-curly-spacing': ['warn', 'never'], '@typescript-eslint/no-unsafe-argument': 'off', '@typescript-eslint/tslint/config': [
                'warn', {
                    rules: {
                        whitespace: [
                            true,
                            'check-branch',
                            'check-decl',
                            'check-operator',
                            // "check-module",
                            'check-separator',
                            'check-rest-spread',
                            'check-type',
                            'check-typecast',
                            'check-type-operator'
                            // "check-preblock",
                            // "check-postbrace"
                        ]
                    }
                }
            ], '@typescript-eslint/adjacent-overload-signatures': 'error', '@typescript-eslint/array-type': 'off', '@typescript-eslint/await-thenable': 'error', '@typescript-eslint/ban-ts-comment': 'error', '@typescript-eslint/ban-types': [
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
exports = instance;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9lc2xpbnQtY29uZmlnL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGtDQUFrQztBQUNsQyxzRkFBa0Q7QUFFbEQsTUFBTSxhQUFhLEdBQUcsaUNBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFL0MsTUFBTSxZQUFZO0lBQWxCO1FBQ0UsU0FBSSxpQ0FDRixJQUFJLEVBQUUsSUFBSSxJQUNQLGlDQUFXLEtBQ2QsT0FBTyxFQUFFO2dCQUNQLG9CQUFvQjtnQkFDcEIsR0FBRyxpQ0FBVyxDQUFDLE9BQU87YUFDdkIsRUFDRCxjQUFjLEVBQUU7Z0JBQ2QsY0FBYztnQkFDZCxXQUFXO2dCQUNYLFlBQVk7Z0JBQ1osWUFBWTthQUNiO1lBQ0QsY0FBYztZQUNkLGFBQWE7WUFDYix3R0FBd0c7WUFDeEcsT0FBTztZQUNQLEtBQUs7WUFDTCxTQUFTLEVBQUUsRUFBRSxFQUNiLEtBQUssa0NBQ0EsaUNBQVcsQ0FBQyxLQUFLLEtBQ3BCLGNBQWMsRUFBRSxPQUFPLEVBQ3ZCLGNBQWMsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFDbEMsZUFBZSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFDdkQscUJBQXFCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLEVBQ3pDLG1CQUFtQixFQUFFLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLEVBQ2pELFlBQVksRUFBRSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUM7Z0JBQ3ZDLG1FQUFtRTtnQkFDbkUsYUFBYSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDLEVBQzNDLHVCQUF1QixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUMsU0FBUyxFQUFFLElB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LHVDQUF1QyxFQUFFLE9BQU8sR0FDakQ7S0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sUUFBUSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7QUFFcEMsT0FBTyxHQUFHLFFBQVEsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8aW1wb3J0IHBhdGg9XCJtb2R1bGVzLmQudHNcIiAvPlxyXG5pbXBvcnQgcmVhY3RBcHBDZmcgZnJvbSAnZXNsaW50LWNvbmZpZy1yZWFjdC1hcHAnO1xyXG5cclxuY29uc3QgcmVhY3RPdmVycmlkZSA9IHJlYWN0QXBwQ2ZnLm92ZXJyaWRlc1swXTtcclxuXHJcbmNsYXNzIENvbmZpZ3VyYWJsZSB7XHJcbiAgcnVsZSA9IHtcclxuICAgIHJvb3Q6IHRydWUsXHJcbiAgICAuLi5yZWFjdEFwcENmZyxcclxuICAgIGV4dGVuZHM6IFtcclxuICAgICAgJ2VzbGludDpyZWNvbW1lbmRlZCcsXHJcbiAgICAgIC4uLnJlYWN0QXBwQ2ZnLmV4dGVuZHNcclxuICAgIF0sXHJcbiAgICBpZ25vcmVQYXR0ZXJuczogW1xyXG4gICAgICAnKiovZGlzdC8qKi8qJyxcclxuICAgICAgJyoqLyouZC50cycsXHJcbiAgICAgICcqKi8qLmQubXRzJyxcclxuICAgICAgJyoqLyouZC5jdHMnXHJcbiAgICBdLFxyXG4gICAgLy8gc2V0dGluZ3M6IHtcclxuICAgIC8vICAgcmVhY3Q6IHtcclxuICAgIC8vICAgICAgIHZlcnNpb246IHJlYWN0VmVyc2lvbiwgLy8gVG8gb3ZlcnJpZGUgXCJkZXRlY3RcIiBzZXR0aW5nIGluIENSQSdzIGVzbGludC1jb25maWctcmVhY3QtYXBwL2Jhc2UuanNcclxuICAgIC8vICAgfSxcclxuICAgIC8vIH0sXHJcbiAgICBvdmVycmlkZXM6IFtdLFxyXG4gICAgcnVsZXM6IHtcclxuICAgICAgLi4ucmVhY3RBcHBDZmcucnVsZXMsXHJcbiAgICAgICdwcmVmZXItY29uc3QnOiAnZXJyb3InLFxyXG4gICAgICAnY29tbWEtZGFuZ2xlJzogWydlcnJvcicsICduZXZlciddLFxyXG4gICAgICAnY29tbWEtc3BhY2luZyc6IFsnd2FybicsIHtiZWZvcmU6IGZhbHNlLCBhZnRlcjogdHJ1ZX1dLFxyXG4gICAgICAnc3BhY2UtYmVmb3JlLWJsb2Nrcyc6IFsnd2FybicsICdhbHdheXMnXSxcclxuICAgICAgJ211bHRpbGluZS10ZXJuYXJ5JzogWyd3YXJuJywgJ2Fsd2F5cy1tdWx0aWxpbmUnXSxcclxuICAgICAgJ2pzeC1xdW90ZXMnOiBbJ3dhcm4nLCAncHJlZmVyLWRvdWJsZSddLFxyXG4gICAgICAvLyAnbmV3bGluZS1wZXItY2hhaW5lZC1jYWxsJzogWyd3YXJuJywge2lnbm9yZUNoYWluV2l0aERlcHRoOiAzfV0sXHJcbiAgICAgICdrZXktc3BhY2luZyc6IFsnd2FybicsIHthZnRlckNvbG9uOiB0cnVlfV0sXHJcbiAgICAgICdhcnJheS1icmFja2V0LW5ld2xpbmUnOiBbJ3dhcm4nLCB7bXVsdGlsaW5lOiB0cnVlfV0sXHJcbiAgICAgICdvYmplY3QtY3VybHktc3BhY2luZyc6IFsnd2FybicsICduZXZlciddLFxyXG4gICAgICAnYnJhY2Utc3R5bGUnOiBbXHJcbiAgICAgICAgJ2Vycm9yJywgJzF0YnMnLCB7XHJcbiAgICAgICAgICBhbGxvd1NpbmdsZUxpbmU6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgICduby1leHRyYS1zZW1pJzogJ29mZicsXHJcbiAgICAgICdwcmVmZXItcmVzdC1wYXJhbXMnOiAnb2ZmJyxcclxuICAgICAgJ2Fycm93LXBhcmVucyc6IFtcclxuICAgICAgICAnb2ZmJyxcclxuICAgICAgICAnYWx3YXlzJ1xyXG4gICAgICBdLFxyXG4gICAgICBjb21wbGV4aXR5OiAnb2ZmJyxcclxuICAgICAgJ2NvbnN0cnVjdG9yLXN1cGVyJzogJ2Vycm9yJyxcclxuICAgICAgY3VybHk6IFtcclxuICAgICAgICAnb2ZmJyxcclxuICAgICAgICAnbXVsdGktbGluZSdcclxuICAgICAgXSxcclxuICAgICAgJ2RlZmF1bHQtY2FzZSc6ICdlcnJvcicsXHJcbiAgICAgICdkb3Qtbm90YXRpb24nOiAnZXJyb3InLFxyXG4gICAgICAnZW9sLWxhc3QnOiAnZXJyb3InLFxyXG4gICAgICBlcWVxZXE6IFtcclxuICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgICdzbWFydCdcclxuICAgICAgXSxcclxuICAgICAgJ2d1YXJkLWZvci1pbic6ICdlcnJvcicsXHJcbiAgICAgICdpZC1ibGFja2xpc3QnOiAnb2ZmJyxcclxuICAgICAgJ2lkLW1hdGNoJzogJ29mZicsXHJcbiAgICAgICdpbXBvcnQvb3JkZXInOiBbJ3dhcm4nLCB7Z3JvdXBzOiBbJ2J1aWx0aW4nLCAnZXh0ZXJuYWwnLCAncGFyZW50JywgJ3NpYmxpbmcnLCAnaW5kZXgnXX1dLFxyXG4gICAgICAnanNkb2MvY2hlY2stYWxpZ25tZW50JzogJ29mZicsXHJcbiAgICAgICdqc2RvYy9jaGVjay1pbmRlbnRhdGlvbic6ICdvZmYnLFxyXG4gICAgICAnanNkb2MvbmV3bGluZS1hZnRlci1kZXNjcmlwdGlvbic6ICdvZmYnLFxyXG4gICAgICAnbGluZWJyZWFrLXN0eWxlJzogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAgJ3VuaXgnXHJcbiAgICAgIF0sXHJcbiAgICAgICdtYXgtY2xhc3Nlcy1wZXItZmlsZSc6ICdvZmYnLFxyXG4gICAgICAnbmV3LXBhcmVucyc6ICdlcnJvcicsXHJcbiAgICAgICduby1hcnJheS1jb25zdHJ1Y3Rvcic6ICdvZmYnLFxyXG4gICAgICAnbm8tYml0d2lzZSc6ICdvZmYnLFxyXG4gICAgICAnbm8tY2FsbGVyJzogJ2Vycm9yJyxcclxuICAgICAgJ25vLWNvbmQtYXNzaWduJzogJ29mZicsXHJcbiAgICAgICduby1jb25zb2xlJzogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWxsb3c6IFtcclxuICAgICAgICAgICAgJ3dhcm4nLFxyXG4gICAgICAgICAgICAnZGlyJyxcclxuICAgICAgICAgICAgJ3RpbWUnLFxyXG4gICAgICAgICAgICAndGltZUVuZCcsXHJcbiAgICAgICAgICAgICd0aW1lTG9nJyxcclxuICAgICAgICAgICAgJ3RyYWNlJyxcclxuICAgICAgICAgICAgJ2Fzc2VydCcsXHJcbiAgICAgICAgICAgICdjbGVhcicsXHJcbiAgICAgICAgICAgICdjb3VudCcsXHJcbiAgICAgICAgICAgICdjb3VudFJlc2V0JyxcclxuICAgICAgICAgICAgJ2dyb3VwJyxcclxuICAgICAgICAgICAgJ2dyb3VwRW5kJyxcclxuICAgICAgICAgICAgJ3RhYmxlJyxcclxuICAgICAgICAgICAgJ2RlYnVnJyxcclxuICAgICAgICAgICAgJ2luZm8nLFxyXG4gICAgICAgICAgICAnZGlyeG1sJyxcclxuICAgICAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICAgICAgJ2dyb3VwQ29sbGFwc2VkJyxcclxuICAgICAgICAgICAgJ0NvbnNvbGUnLFxyXG4gICAgICAgICAgICAncHJvZmlsZScsXHJcbiAgICAgICAgICAgICdwcm9maWxlRW5kJyxcclxuICAgICAgICAgICAgJ3RpbWVTdGFtcCcsXHJcbiAgICAgICAgICAgICdjb250ZXh0J1xyXG4gICAgICAgICAgXVxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ25vLWNvbnN0YW50LWNvbmRpdGlvbic6ICdvZmYnLFxyXG4gICAgICAnbm8tZGVidWdnZXInOiAnZXJyb3InLFxyXG4gICAgICAnbm8tZW1wdHknOiAnb2ZmJyxcclxuICAgICAgJ25vLWVtcHR5LWZ1bmN0aW9uJzogJ29mZicsXHJcbiAgICAgICduby1ldmFsJzogJ2Vycm9yJyxcclxuICAgICAgJ25vLWZhbGx0aHJvdWdoJzogJ29mZicsXHJcbiAgICAgICduby1pbXBsaWVkLWV2YWwnOiAnb2ZmJyxcclxuICAgICAgJ25vLWludmFsaWQtdGhpcyc6ICdvZmYnLFxyXG4gICAgICAnbm8tbmV3LXdyYXBwZXJzJzogJ29mZicsXHJcbiAgICAgICduby1zaGFkb3cnOiAnb2ZmJyxcclxuICAgICAgJ25vLXRocm93LWxpdGVyYWwnOiAnZXJyb3InLFxyXG4gICAgICAnbm8tdHJhaWxpbmctc3BhY2VzJzogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWdub3JlQ29tbWVudHM6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgICduby11bmRlZi1pbml0JzogJ2Vycm9yJyxcclxuICAgICAgJ25vLXVuZGVyc2NvcmUtZGFuZ2xlJzogJ29mZicsXHJcbiAgICAgICduby11bnNhZmUtZmluYWxseSc6ICdlcnJvcicsXHJcbiAgICAgICduby11bnVzZWQtZXhwcmVzc2lvbnMnOiAnZXJyb3InLFxyXG4gICAgICAnbm8tdW51c2VkLWxhYmVscyc6ICdlcnJvcicsXHJcbiAgICAgICduby11bnVzZWQtdmFycyc6ICdvZmYnLFxyXG4gICAgICAnbm8tdXNlLWJlZm9yZS1kZWZpbmUnOiAnb2ZmJyxcclxuICAgICAgJ25vLXZhcic6ICdvZmYnLFxyXG4gICAgICAnb2JqZWN0LXNob3J0aGFuZCc6ICdlcnJvcicsXHJcbiAgICAgICdvbmUtdmFyJzogW1xyXG4gICAgICAgICdvZmYnLFxyXG4gICAgICAgICduZXZlcidcclxuICAgICAgXSxcclxuICAgICAgJ3ByZWZlci1hcnJvdy9wcmVmZXItYXJyb3ctZnVuY3Rpb25zJzogJ29mZicsXHJcbiAgICAgICdxdW90ZS1wcm9wcyc6IFtcclxuICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgICdhcy1uZWVkZWQnXHJcbiAgICAgIF0sXHJcbiAgICAgIHF1b3RlczogWyd3YXJuJywgJ3NpbmdsZScsIHthdm9pZEVzY2FwZTogdHJ1ZX1dLFxyXG4gICAgICByYWRpeDogJ2Vycm9yJyxcclxuICAgICAgJ3JlcXVpcmUtYXdhaXQnOiAnb2ZmJyxcclxuICAgICAgc2VtaTogJ2Vycm9yJyxcclxuICAgICAgJ3NwYWNlLWJlZm9yZS1mdW5jdGlvbi1wYXJlbic6IFtcclxuICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFub255bW91czogJ25ldmVyJyxcclxuICAgICAgICAgIG5hbWVkOiAnbmV2ZXInXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBpbmRlbnQ6IFsnd2FybicsIDJdLFxyXG4gICAgICAnc3BhY2VkLWNvbW1lbnQnOiBbXHJcbiAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICAnYWx3YXlzJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBtYXJrZXJzOiBbJy8nXVxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ3VzZS1pc25hbic6ICdlcnJvcicsXHJcbiAgICAgICd2YWxpZC10eXBlb2YnOiAnb2ZmJyxcclxuICAgICAgJ25vLWxvb3AtZnVuYyc6ICd3YXJuJyxcclxuICAgICAgJ2ltcG9ydC9uby1hbm9ueW1vdXMtZGVmYXVsdC1leHBvcnQnOiAnb2ZmJywgLy8gb3ZlcnJpZGUgcnVsZXMgZnJvbSBlc2xpbnQtY29uZmlnLXJlYWN0LWFwcFxyXG4gICAgICAnYXJyYXktY2FsbGJhY2stcmV0dXJuJzogJ29mZicsXHJcbiAgICAgICdpbXBvcnQvbm8td2VicGFjay1sb2FkZXItc3ludGF4JzogJ29mZicgLy8gb3ZlcnJpZGUgcnVsZXMgZnJvbSBlc2xpbnQtY29uZmlnLXJlYWN0LWFwcFxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGFkZFRzRmlsZXMoZmlsZXM6IHN0cmluZ1tdLCB0c2NvbmZpZ0ZpbGU6IHN0cmluZykge1xyXG4gICAgdGhpcy5ydWxlLm92ZXJyaWRlcy5wdXNoKGNyZWF0ZVRzUnVsZXNPdmVycmlkZShmaWxlcywgdHNjb25maWdGaWxlKSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGJ1aWxkKCkge1xyXG4gICAgcmV0dXJuIHRoaXMucnVsZTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFRvIGNoYW5nZSBkZWZhdWx0IGlnbm9yZVBhdHRlcm5zXHJcbi8vIGNvbmZpZy5pZ25vcmVQYXR0ZXJucyA9IFtcIioqLyouZC50c1wiXTtcclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRzUnVsZXNPdmVycmlkZShmaWxlczogc3RyaW5nW10sIHRzY29uZmlnRmlsZTogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGZpbGVzLFxyXG4gICAgZXh0ZW5kczogW1xyXG4gICAgICAnZXNsaW50OnJlY29tbWVuZGVkJyxcclxuICAgICAgJ3BsdWdpbjpAdHlwZXNjcmlwdC1lc2xpbnQvcmVjb21tZW5kZWQnLFxyXG4gICAgICAncGx1Z2luOkB0eXBlc2NyaXB0LWVzbGludC9yZWNvbW1lbmRlZC1yZXF1aXJpbmctdHlwZS1jaGVja2luZydcclxuICAgIF0sXHJcbiAgICBleGNsdWRlZEZpbGVzOiAnKi5kLnRzJyxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgJ2pzZG9jJyxcclxuICAgICAgJ2ltcG9ydCcsXHJcbiAgICAgICdwcmVmZXItYXJyb3cnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50JyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC90c2xpbnQnXHJcbiAgICBdLFxyXG4gICAgcGFyc2VyOiAnQHR5cGVzY3JpcHQtZXNsaW50L3BhcnNlcicsXHJcbiAgICBwYXJzZXJPcHRpb25zOiB7XHJcbiAgICAgIC4uLihyZWFjdE92ZXJyaWRlLnBhcnNlck9wdGlvbnMpLFxyXG4gICAgICAvLyBkZWJ1Z0xldmVsOiB0cnVlLFxyXG4gICAgICBwcm9qZWN0OiB0c2NvbmZpZ0ZpbGVcclxuICAgIH0sXHJcbiAgICBydWxlczoge1xyXG4gICAgICAuLi4ocmVhY3RPdmVycmlkZS5ydWxlcyksXHJcbiAgICAgICdjb21tYS1kYW5nbGUnOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9jb21tYS1kYW5nbGUnOiBbJ3dhcm4nLCAnbmV2ZXInXSxcclxuICAgICAgJ29iamVjdC1jdXJseS1zcGFjaW5nJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLW9wdGlvbmFsLWNoYWluJzogJ3dhcm4nLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L29iamVjdC1jdXJseS1zcGFjaW5nJzogWyd3YXJuJywgJ25ldmVyJ10sXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50JzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvdHNsaW50L2NvbmZpZyc6IFtcclxuICAgICAgICAnd2FybicsIHtcclxuICAgICAgICAgIHJ1bGVzOiB7XHJcbiAgICAgICAgICAgIHdoaXRlc3BhY2U6IFtcclxuICAgICAgICAgICAgICB0cnVlLFxyXG4gICAgICAgICAgICAgICdjaGVjay1icmFuY2gnLFxyXG4gICAgICAgICAgICAgICdjaGVjay1kZWNsJyxcclxuICAgICAgICAgICAgICAnY2hlY2stb3BlcmF0b3InLFxyXG4gICAgICAgICAgICAgIC8vIFwiY2hlY2stbW9kdWxlXCIsXHJcbiAgICAgICAgICAgICAgJ2NoZWNrLXNlcGFyYXRvcicsXHJcbiAgICAgICAgICAgICAgJ2NoZWNrLXJlc3Qtc3ByZWFkJyxcclxuICAgICAgICAgICAgICAnY2hlY2stdHlwZScsXHJcbiAgICAgICAgICAgICAgJ2NoZWNrLXR5cGVjYXN0JyxcclxuICAgICAgICAgICAgICAnY2hlY2stdHlwZS1vcGVyYXRvcidcclxuICAgICAgICAgICAgICAvLyBcImNoZWNrLXByZWJsb2NrXCIsXHJcbiAgICAgICAgICAgICAgLy8gXCJjaGVjay1wb3N0YnJhY2VcIlxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2FkamFjZW50LW92ZXJsb2FkLXNpZ25hdHVyZXMnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2FycmF5LXR5cGUnOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9hd2FpdC10aGVuYWJsZSc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXRzLWNvbW1lbnQnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlcyc6IFtcclxuICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHR5cGVzOiB7XHJcbiAgICAgICAgICAgIE9iamVjdDoge1xyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdm9pZCB1c2luZyB0aGUgYE9iamVjdGAgdHlwZS4gRGlkIHlvdSBtZWFuIGBvYmplY3RgPydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgRnVuY3Rpb246IHtcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnQXZvaWQgdXNpbmcgdGhlIGBGdW5jdGlvbmAgdHlwZS4gUHJlZmVyIGEgc3BlY2lmaWMgZnVuY3Rpb24gdHlwZSwgbGlrZSBgKCkgPT4gdm9pZGAuJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBCb29sZWFuOiB7XHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0F2b2lkIHVzaW5nIHRoZSBgQm9vbGVhbmAgdHlwZS4gRGlkIHlvdSBtZWFuIGBib29sZWFuYD8nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIE51bWJlcjoge1xyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdm9pZCB1c2luZyB0aGUgYE51bWJlcmAgdHlwZS4gRGlkIHlvdSBtZWFuIGBudW1iZXJgPydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgU3RyaW5nOiB7XHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0F2b2lkIHVzaW5nIHRoZSBgU3RyaW5nYCB0eXBlLiBEaWQgeW91IG1lYW4gYHN0cmluZ2A/J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBTeW1ib2w6IHtcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnQXZvaWQgdXNpbmcgdGhlIGBTeW1ib2xgIHR5cGUuIERpZCB5b3UgbWVhbiBgc3ltYm9sYD8nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvY29uc2lzdGVudC10eXBlLWFzc2VydGlvbnMnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvbic6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbWVtYmVyLWFjY2Vzc2liaWxpdHknOiBbXHJcbiAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBhY2Nlc3NpYmlsaXR5OiAnbm8tcHVibGljJ1xyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tb2R1bGUtYm91bmRhcnktdHlwZXMnOiAnb2ZmJyxcclxuICAgICAgaW5kZW50OiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQnOiBbXHJcbiAgICAgICAgJ3dhcm4nLFxyXG4gICAgICAgIDJcclxuICAgICAgXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9tZW1iZXItZGVsaW1pdGVyLXN0eWxlJzogW1xyXG4gICAgICAgICd3YXJuJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBtdWx0aWxpbmU6IHtcclxuICAgICAgICAgICAgZGVsaW1pdGVyOiAnc2VtaScsXHJcbiAgICAgICAgICAgIHJlcXVpcmVMYXN0OiB0cnVlXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgc2luZ2xlbGluZToge1xyXG4gICAgICAgICAgICBkZWxpbWl0ZXI6ICdzZW1pJyxcclxuICAgICAgICAgICAgcmVxdWlyZUxhc3Q6IGZhbHNlXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25hbWluZy1jb252ZW50aW9uJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tYXJyYXktY29uc3RydWN0b3InOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWZ1bmN0aW9uJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnknOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1leHRyYS1ub24tbnVsbC1hc3NlcnRpb24nOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWZsb2F0aW5nLXByb21pc2VzJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1mb3ItaW4tYXJyYXknOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWltcGxpZWQtZXZhbCc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8taW5mZXJyYWJsZS10eXBlcyc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1uZXcnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLW1pc3VzZWQtcHJvbWlzZXMnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSc6ICdvZmYnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGVkLW9wdGlvbmFsLWNoYWluJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24nOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1wYXJhbWV0ZXItcHJvcGVydGllcyc6ICdvZmYnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXNoYWRvdyc6IFtcclxuICAgICAgICAnb2ZmJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBob2lzdDogJ2FsbCdcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhcyc6ICd3YXJuJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bm5lY2Vzc2FyeS10eXBlLWFzc2VydGlvbic6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQnOiAnd2FybicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGwnOiAnd2FybicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3MnOiAnd2FybicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVybic6ICd3YXJuJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtZXhwcmVzc2lvbnMnOiBbXHJcbiAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBhbGxvd1Nob3J0Q2lyY3VpdDogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyc6ICdvZmYnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXVzZS1iZWZvcmUtZGVmaW5lJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdmFyLXJlcXVpcmVzJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWFzLWNvbnN0JzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItZm9yLW9mJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItZnVuY3Rpb24tdHlwZSc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLW5hbWVzcGFjZS1rZXl3b3JkJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItcmVnZXhwLWV4ZWMnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3F1b3Rlcyc6IFtcclxuICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgICdzaW5nbGUnLFxyXG4gICAgICAgIHthdm9pZEVzY2FwZTogdHJ1ZX1cclxuICAgICAgXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9yZXF1aXJlLWF3YWl0JzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnMnOiBbJ2Vycm9yJywge2FsbG93TnVtYmVyOiB0cnVlLCBhbGxvd0Jvb2xlYW46IHRydWV9XSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9zZW1pJzogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAgJ2Fsd2F5cydcclxuICAgICAgXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC90cmlwbGUtc2xhc2gtcmVmZXJlbmNlJzogW1xyXG4gICAgICAgICdvZmYnLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHBhdGg6ICdhbHdheXMnLFxyXG4gICAgICAgICAgdHlwZXM6ICdwcmVmZXItaW1wb3J0JyxcclxuICAgICAgICAgIGxpYjogJ2Fsd2F5cydcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXh0cmEtc2VtaSc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2QnOiBbJ29mZicsIHtpZ25vcmVTdGF0aWM6IHRydWV9XSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC91bmlmaWVkLXNpZ25hdHVyZXMnOiAnZXJyb3InXHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG5cclxuY29uc3QgaW5zdGFuY2UgPSBuZXcgQ29uZmlndXJhYmxlKCk7XHJcblxyXG5leHBvcnRzID0gaW5zdGFuY2U7XHJcbiJdfQ==