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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.rule = Object.assign(Object.assign({ root: true }, eslint_config_react_app_1.default), { extends: [
                'eslint:recommended',
                ...eslint_config_react_app_1.default.extends
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
    addTsFiles(filePatterns, tsconfigFile) {
        this.rule.overrides.push(createTsRulesOverride(filePatterns, tsconfigFile));
        return this;
    }
    build() {
        return this.rule;
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
        plugins: [
            'jsdoc',
            'import',
            'prefer-arrow',
            '@typescript-eslint',
            '@typescript-eslint/tslint'
        ],
        parser: '@typescript-eslint/parser',
        parserOptions: Object.assign(Object.assign({}, (reactOverride.parserOptions)), { debugLevel: debug, project: tsconfigFile }),
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
exports.default = instance;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsc0ZBQWtEO0FBRWxELE1BQU0sYUFBYSxHQUFHLGlDQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRS9DLE1BQU0sWUFBWTtJQUFsQjtRQUNFLG1FQUFtRTtRQUNuRSxTQUFJLGlDQUNGLElBQUksRUFBRSxJQUFJLElBQ1AsaUNBQVcsS0FDZCxPQUFPLEVBQUU7Z0JBQ1Asb0JBQW9CO2dCQUNwQixHQUFHLGlDQUFXLENBQUMsT0FBTzthQUN2QixFQUNELGNBQWMsRUFBRTtnQkFDZCxjQUFjO2dCQUNkLFdBQVc7Z0JBQ1gsWUFBWTtnQkFDWixZQUFZO2dCQUNaLG9CQUFvQjthQUNyQjtZQUNELGNBQWM7WUFDZCxhQUFhO1lBQ2Isd0dBQXdHO1lBQ3hHLE9BQU87WUFDUCxLQUFLO1lBQ0wsU0FBUyxFQUFFLEVBQUUsRUFDYixLQUFLLGtDQUNBLGlDQUFXLENBQUMsS0FBSyxLQUNwQixjQUFjLEVBQUUsT0FBTyxFQUN2QixjQUFjLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQ2xDLGVBQWUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLEVBQ3ZELHFCQUFxQixFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxFQUN6QyxtQkFBbUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxFQUNqRCxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDO2dCQUN2QyxtRUFBbUU7Z0JBQ25FLGFBQWEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUMzQyx1QkFBdUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLFNBQVMs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QUMsS0FBSyxFQUFFLEVBQUMsWUFBWSxFQUFFLElBQUksRUFBQyxDQUFDLEVBQ2xFLHVDQUF1QyxFQUFFLE9BQU8sR0FDakQ7S0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sUUFBUSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7QUFFcEMsa0JBQWUsUUFBUSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxpbXBvcnQgcGF0aD1cIm1vZHVsZXMuZC50c1wiIC8+XG5pbXBvcnQgcmVhY3RBcHBDZmcgZnJvbSAnZXNsaW50LWNvbmZpZy1yZWFjdC1hcHAnO1xuXG5jb25zdCByZWFjdE92ZXJyaWRlID0gcmVhY3RBcHBDZmcub3ZlcnJpZGVzWzBdO1xuXG5jbGFzcyBDb25maWd1cmFibGUge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gIHJ1bGUgPSB7XG4gICAgcm9vdDogdHJ1ZSxcbiAgICAuLi5yZWFjdEFwcENmZyxcbiAgICBleHRlbmRzOiBbXG4gICAgICAnZXNsaW50OnJlY29tbWVuZGVkJyxcbiAgICAgIC4uLnJlYWN0QXBwQ2ZnLmV4dGVuZHNcbiAgICBdLFxuICAgIGlnbm9yZVBhdHRlcm5zOiBbXG4gICAgICAnKiovZGlzdC8qKi8qJyxcbiAgICAgICcqKi8qLmQudHMnLFxuICAgICAgJyoqLyouZC5tdHMnLFxuICAgICAgJyoqLyouZC5jdHMnLFxuICAgICAgJyoqL25vZGVfbW9kdWxlcy8qKidcbiAgICBdLFxuICAgIC8vIHNldHRpbmdzOiB7XG4gICAgLy8gICByZWFjdDoge1xuICAgIC8vICAgICAgIHZlcnNpb246IHJlYWN0VmVyc2lvbiwgLy8gVG8gb3ZlcnJpZGUgXCJkZXRlY3RcIiBzZXR0aW5nIGluIENSQSdzIGVzbGludC1jb25maWctcmVhY3QtYXBwL2Jhc2UuanNcbiAgICAvLyAgIH0sXG4gICAgLy8gfSxcbiAgICBvdmVycmlkZXM6IFtdLFxuICAgIHJ1bGVzOiB7XG4gICAgICAuLi5yZWFjdEFwcENmZy5ydWxlcyxcbiAgICAgICdwcmVmZXItY29uc3QnOiAnZXJyb3InLFxuICAgICAgJ2NvbW1hLWRhbmdsZSc6IFsnZXJyb3InLCAnbmV2ZXInXSxcbiAgICAgICdjb21tYS1zcGFjaW5nJzogWyd3YXJuJywge2JlZm9yZTogZmFsc2UsIGFmdGVyOiB0cnVlfV0sXG4gICAgICAnc3BhY2UtYmVmb3JlLWJsb2Nrcyc6IFsnd2FybicsICdhbHdheXMnXSxcbiAgICAgICdtdWx0aWxpbmUtdGVybmFyeSc6IFsnd2FybicsICdhbHdheXMtbXVsdGlsaW5lJ10sXG4gICAgICAnanN4LXF1b3Rlcyc6IFsnd2FybicsICdwcmVmZXItZG91YmxlJ10sXG4gICAgICAvLyAnbmV3bGluZS1wZXItY2hhaW5lZC1jYWxsJzogWyd3YXJuJywge2lnbm9yZUNoYWluV2l0aERlcHRoOiAzfV0sXG4gICAgICAna2V5LXNwYWNpbmcnOiBbJ3dhcm4nLCB7YWZ0ZXJDb2xvbjogdHJ1ZX1dLFxuICAgICAgJ2FycmF5LWJyYWNrZXQtbmV3bGluZSc6IFsnd2FybicsIHttdWx0aWxpbmU6IHRydWV9XSxcbiAgICAgICdvYmplY3QtY3VybHktc3BhY2luZyc6IFsnd2FybicsICduZXZlciddLFxuICAgICAgJ2JyYWNlLXN0eWxlJzogW1xuICAgICAgICAnZXJyb3InLCAnMXRicycsIHtcbiAgICAgICAgICBhbGxvd1NpbmdsZUxpbmU6IHRydWVcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICduby1leHRyYS1zZW1pJzogJ29mZicsXG4gICAgICAncHJlZmVyLXJlc3QtcGFyYW1zJzogJ29mZicsXG4gICAgICAnYXJyb3ctcGFyZW5zJzogW1xuICAgICAgICAnb2ZmJyxcbiAgICAgICAgJ2Fsd2F5cydcbiAgICAgIF0sXG4gICAgICBjb21wbGV4aXR5OiAnb2ZmJyxcbiAgICAgICdjb25zdHJ1Y3Rvci1zdXBlcic6ICdlcnJvcicsXG4gICAgICBjdXJseTogW1xuICAgICAgICAnb2ZmJyxcbiAgICAgICAgJ211bHRpLWxpbmUnXG4gICAgICBdLFxuICAgICAgJ2RlZmF1bHQtY2FzZSc6ICdlcnJvcicsXG4gICAgICAnZG90LW5vdGF0aW9uJzogJ2Vycm9yJyxcbiAgICAgICdlb2wtbGFzdCc6ICdlcnJvcicsXG4gICAgICBlcWVxZXE6IFtcbiAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgJ3NtYXJ0J1xuICAgICAgXSxcbiAgICAgICdndWFyZC1mb3ItaW4nOiAnZXJyb3InLFxuICAgICAgJ2lkLWJsYWNrbGlzdCc6ICdvZmYnLFxuICAgICAgJ2lkLW1hdGNoJzogJ29mZicsXG4gICAgICAnaW1wb3J0L29yZGVyJzogWyd3YXJuJywge2dyb3VwczogWydidWlsdGluJywgJ2V4dGVybmFsJywgJ3BhcmVudCcsICdzaWJsaW5nJywgJ2luZGV4J119XSxcbiAgICAgICdqc2RvYy9jaGVjay1hbGlnbm1lbnQnOiAnb2ZmJyxcbiAgICAgICdqc2RvYy9jaGVjay1pbmRlbnRhdGlvbic6ICdvZmYnLFxuICAgICAgJ2pzZG9jL25ld2xpbmUtYWZ0ZXItZGVzY3JpcHRpb24nOiAnb2ZmJyxcbiAgICAgICdsaW5lYnJlYWstc3R5bGUnOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgICd1bml4J1xuICAgICAgXSxcbiAgICAgICdtYXgtY2xhc3Nlcy1wZXItZmlsZSc6ICdvZmYnLFxuICAgICAgJ25ldy1wYXJlbnMnOiAnZXJyb3InLFxuICAgICAgJ25vLWFycmF5LWNvbnN0cnVjdG9yJzogJ29mZicsXG4gICAgICAnbm8tYml0d2lzZSc6ICdvZmYnLFxuICAgICAgJ25vLWNhbGxlcic6ICdlcnJvcicsXG4gICAgICAnbm8tY29uZC1hc3NpZ24nOiAnb2ZmJyxcbiAgICAgICduby1jb25zb2xlJzogW1xuICAgICAgICAnZXJyb3InLFxuICAgICAgICB7XG4gICAgICAgICAgYWxsb3c6IFtcbiAgICAgICAgICAgICd3YXJuJyxcbiAgICAgICAgICAgICdkaXInLFxuICAgICAgICAgICAgJ3RpbWUnLFxuICAgICAgICAgICAgJ3RpbWVFbmQnLFxuICAgICAgICAgICAgJ3RpbWVMb2cnLFxuICAgICAgICAgICAgJ3RyYWNlJyxcbiAgICAgICAgICAgICdhc3NlcnQnLFxuICAgICAgICAgICAgJ2NsZWFyJyxcbiAgICAgICAgICAgICdjb3VudCcsXG4gICAgICAgICAgICAnY291bnRSZXNldCcsXG4gICAgICAgICAgICAnZ3JvdXAnLFxuICAgICAgICAgICAgJ2dyb3VwRW5kJyxcbiAgICAgICAgICAgICd0YWJsZScsXG4gICAgICAgICAgICAnZGVidWcnLFxuICAgICAgICAgICAgJ2luZm8nLFxuICAgICAgICAgICAgJ2RpcnhtbCcsXG4gICAgICAgICAgICAnZXJyb3InLFxuICAgICAgICAgICAgJ2dyb3VwQ29sbGFwc2VkJyxcbiAgICAgICAgICAgICdDb25zb2xlJyxcbiAgICAgICAgICAgICdwcm9maWxlJyxcbiAgICAgICAgICAgICdwcm9maWxlRW5kJyxcbiAgICAgICAgICAgICd0aW1lU3RhbXAnLFxuICAgICAgICAgICAgJ2NvbnRleHQnXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgJ25vLWNvbnN0YW50LWNvbmRpdGlvbic6ICdvZmYnLFxuICAgICAgJ25vLWRlYnVnZ2VyJzogJ2Vycm9yJyxcbiAgICAgICduby1lbXB0eSc6ICdvZmYnLFxuICAgICAgJ25vLWVtcHR5LWZ1bmN0aW9uJzogJ29mZicsXG4gICAgICAnbm8tZXZhbCc6ICdlcnJvcicsXG4gICAgICAnbm8tZmFsbHRocm91Z2gnOiAnb2ZmJyxcbiAgICAgICduby1pbXBsaWVkLWV2YWwnOiAnb2ZmJyxcbiAgICAgICduby1pbnZhbGlkLXRoaXMnOiAnb2ZmJyxcbiAgICAgICduby1uZXctd3JhcHBlcnMnOiAnb2ZmJyxcbiAgICAgICduby1zaGFkb3cnOiAnb2ZmJyxcbiAgICAgICduby10aHJvdy1saXRlcmFsJzogJ2Vycm9yJyxcbiAgICAgICduby10cmFpbGluZy1zcGFjZXMnOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgIHtcbiAgICAgICAgICBpZ25vcmVDb21tZW50czogdHJ1ZVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgJ25vLXVuZGVmLWluaXQnOiAnZXJyb3InLFxuICAgICAgJ25vLXVuZGVyc2NvcmUtZGFuZ2xlJzogJ29mZicsXG4gICAgICAnbm8tdW5zYWZlLWZpbmFsbHknOiAnZXJyb3InLFxuICAgICAgJ25vLXVudXNlZC1leHByZXNzaW9ucyc6ICdlcnJvcicsXG4gICAgICAnbm8tdW51c2VkLWxhYmVscyc6ICdlcnJvcicsXG4gICAgICAnbm8tdW51c2VkLXZhcnMnOiAnb2ZmJyxcbiAgICAgICduby11c2UtYmVmb3JlLWRlZmluZSc6ICdvZmYnLFxuICAgICAgJ25vLXZhcic6ICdvZmYnLFxuICAgICAgJ29iamVjdC1zaG9ydGhhbmQnOiAnZXJyb3InLFxuICAgICAgJ29uZS12YXInOiBbXG4gICAgICAgICdvZmYnLFxuICAgICAgICAnbmV2ZXInXG4gICAgICBdLFxuICAgICAgJ3ByZWZlci1hcnJvdy9wcmVmZXItYXJyb3ctZnVuY3Rpb25zJzogJ29mZicsXG4gICAgICAncXVvdGUtcHJvcHMnOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgICdhcy1uZWVkZWQnXG4gICAgICBdLFxuICAgICAgcXVvdGVzOiBbJ3dhcm4nLCAnc2luZ2xlJywge2F2b2lkRXNjYXBlOiB0cnVlfV0sXG4gICAgICByYWRpeDogJ2Vycm9yJyxcbiAgICAgICdyZXF1aXJlLWF3YWl0JzogJ29mZicsXG4gICAgICBzZW1pOiAnZXJyb3InLFxuICAgICAgJ3NwYWNlLWJlZm9yZS1mdW5jdGlvbi1wYXJlbic6IFtcbiAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAge1xuICAgICAgICAgIGFub255bW91czogJ25ldmVyJyxcbiAgICAgICAgICBuYW1lZDogJ25ldmVyJ1xuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgaW5kZW50OiBbJ3dhcm4nLCAyXSxcbiAgICAgICdzcGFjZWQtY29tbWVudCc6IFtcbiAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgJ2Fsd2F5cycsXG4gICAgICAgIHtcbiAgICAgICAgICBtYXJrZXJzOiBbJy8nXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgJ3VzZS1pc25hbic6ICdlcnJvcicsXG4gICAgICAndmFsaWQtdHlwZW9mJzogJ29mZicsXG4gICAgICAnbm8tbG9vcC1mdW5jJzogJ3dhcm4nLFxuICAgICAgJ2ltcG9ydC9uby1hbm9ueW1vdXMtZGVmYXVsdC1leHBvcnQnOiAnb2ZmJywgLy8gb3ZlcnJpZGUgcnVsZXMgZnJvbSBlc2xpbnQtY29uZmlnLXJlYWN0LWFwcFxuICAgICAgJ2FycmF5LWNhbGxiYWNrLXJldHVybic6ICdvZmYnLFxuICAgICAgJ2ltcG9ydC9uby13ZWJwYWNrLWxvYWRlci1zeW50YXgnOiAnb2ZmJyAvLyBvdmVycmlkZSBydWxlcyBmcm9tIGVzbGludC1jb25maWctcmVhY3QtYXBwXG4gICAgfVxuICB9O1xuXG4gIGFkZFRzRmlsZXMoZmlsZVBhdHRlcm5zOiBzdHJpbmdbXSwgdHNjb25maWdGaWxlOiBzdHJpbmcpIHtcbiAgICB0aGlzLnJ1bGUub3ZlcnJpZGVzLnB1c2goY3JlYXRlVHNSdWxlc092ZXJyaWRlKGZpbGVQYXR0ZXJucywgdHNjb25maWdGaWxlKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBidWlsZCgpIHtcbiAgICByZXR1cm4gdGhpcy5ydWxlO1xuICB9XG59XG5cbi8vIFRvIGNoYW5nZSBkZWZhdWx0IGlnbm9yZVBhdHRlcm5zXG4vLyBjb25maWcuaWdub3JlUGF0dGVybnMgPSBbXCIqKi8qLmQudHNcIl07XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzUnVsZXNPdmVycmlkZShmaWxlUGF0dGVybnM6IHN0cmluZ1tdLCB0c2NvbmZpZ0ZpbGU6IHN0cmluZywgZGVidWcgPSBmYWxzZSkge1xuICByZXR1cm4ge1xuICAgIGZpbGVzOiBmaWxlUGF0dGVybnMsXG4gICAgZXh0ZW5kczogW1xuICAgICAgJ2VzbGludDpyZWNvbW1lbmRlZCcsXG4gICAgICAncGx1Z2luOkB0eXBlc2NyaXB0LWVzbGludC9yZWNvbW1lbmRlZCcsXG4gICAgICAncGx1Z2luOkB0eXBlc2NyaXB0LWVzbGludC9yZWNvbW1lbmRlZC1yZXF1aXJpbmctdHlwZS1jaGVja2luZydcbiAgICBdLFxuICAgIGV4Y2x1ZGVkRmlsZXM6ICcqLmQudHMnLFxuICAgIHBsdWdpbnM6IFtcbiAgICAgICdqc2RvYycsXG4gICAgICAnaW1wb3J0JyxcbiAgICAgICdwcmVmZXItYXJyb3cnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludCcsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3RzbGludCdcbiAgICBdLFxuICAgIHBhcnNlcjogJ0B0eXBlc2NyaXB0LWVzbGludC9wYXJzZXInLFxuICAgIHBhcnNlck9wdGlvbnM6IHtcbiAgICAgIC4uLihyZWFjdE92ZXJyaWRlLnBhcnNlck9wdGlvbnMpLFxuICAgICAgZGVidWdMZXZlbDogZGVidWcsXG4gICAgICBwcm9qZWN0OiB0c2NvbmZpZ0ZpbGVcbiAgICB9LFxuICAgIHJ1bGVzOiB7XG4gICAgICAuLi4ocmVhY3RPdmVycmlkZS5ydWxlcyksXG4gICAgICAnY29tbWEtZGFuZ2xlJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2NvbW1hLWRhbmdsZSc6IFsnd2FybicsICduZXZlciddLFxuICAgICAgJ29iamVjdC1jdXJseS1zcGFjaW5nJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1vcHRpb25hbC1jaGFpbic6ICd3YXJuJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvb2JqZWN0LWN1cmx5LXNwYWNpbmcnOiBbJ3dhcm4nLCAnbmV2ZXInXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50JzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3RzbGludC9jb25maWcnOiBbXG4gICAgICAgICd3YXJuJywge1xuICAgICAgICAgIHJ1bGVzOiB7XG4gICAgICAgICAgICB3aGl0ZXNwYWNlOiBbXG4gICAgICAgICAgICAgIHRydWUsXG4gICAgICAgICAgICAgICdjaGVjay1icmFuY2gnLFxuICAgICAgICAgICAgICAnY2hlY2stZGVjbCcsXG4gICAgICAgICAgICAgICdjaGVjay1vcGVyYXRvcicsXG4gICAgICAgICAgICAgIC8vIFwiY2hlY2stbW9kdWxlXCIsXG4gICAgICAgICAgICAgICdjaGVjay1zZXBhcmF0b3InLFxuICAgICAgICAgICAgICAnY2hlY2stcmVzdC1zcHJlYWQnLFxuICAgICAgICAgICAgICAnY2hlY2stdHlwZScsXG4gICAgICAgICAgICAgICdjaGVjay10eXBlY2FzdCcsXG4gICAgICAgICAgICAgICdjaGVjay10eXBlLW9wZXJhdG9yJ1xuICAgICAgICAgICAgICAvLyBcImNoZWNrLXByZWJsb2NrXCIsXG4gICAgICAgICAgICAgIC8vIFwiY2hlY2stcG9zdGJyYWNlXCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2FkamFjZW50LW92ZXJsb2FkLXNpZ25hdHVyZXMnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9hcnJheS10eXBlJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2F3YWl0LXRoZW5hYmxlJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXRzLWNvbW1lbnQnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9iYW4tdHlwZXMnOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlczoge1xuICAgICAgICAgICAgT2JqZWN0OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdm9pZCB1c2luZyB0aGUgYE9iamVjdGAgdHlwZS4gRGlkIHlvdSBtZWFuIGBvYmplY3RgPydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBGdW5jdGlvbjoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQXZvaWQgdXNpbmcgdGhlIGBGdW5jdGlvbmAgdHlwZS4gUHJlZmVyIGEgc3BlY2lmaWMgZnVuY3Rpb24gdHlwZSwgbGlrZSBgKCkgPT4gdm9pZGAuJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEJvb2xlYW46IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0F2b2lkIHVzaW5nIHRoZSBgQm9vbGVhbmAgdHlwZS4gRGlkIHlvdSBtZWFuIGBib29sZWFuYD8nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTnVtYmVyOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdm9pZCB1c2luZyB0aGUgYE51bWJlcmAgdHlwZS4gRGlkIHlvdSBtZWFuIGBudW1iZXJgPydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTdHJpbmc6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0F2b2lkIHVzaW5nIHRoZSBgU3RyaW5nYCB0eXBlLiBEaWQgeW91IG1lYW4gYHN0cmluZ2A/J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFN5bWJvbDoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQXZvaWQgdXNpbmcgdGhlIGBTeW1ib2xgIHR5cGUuIERpZCB5b3UgbWVhbiBgc3ltYm9sYD8nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9jb25zaXN0ZW50LXR5cGUtYXNzZXJ0aW9ucyc6ICdlcnJvcicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvbic6ICdlcnJvcicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1lbWJlci1hY2Nlc3NpYmlsaXR5JzogW1xuICAgICAgICAnZXJyb3InLFxuICAgICAgICB7XG4gICAgICAgICAgYWNjZXNzaWJpbGl0eTogJ25vLXB1YmxpYydcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbW9kdWxlLWJvdW5kYXJ5LXR5cGVzJzogJ29mZicsXG4gICAgICBpbmRlbnQ6ICdvZmYnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQnOiBbXG4gICAgICAgICd3YXJuJyxcbiAgICAgICAgMlxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbWVtYmVyLWRlbGltaXRlci1zdHlsZSc6IFtcbiAgICAgICAgJ3dhcm4nLFxuICAgICAgICB7XG4gICAgICAgICAgbXVsdGlsaW5lOiB7XG4gICAgICAgICAgICBkZWxpbWl0ZXI6ICdzZW1pJyxcbiAgICAgICAgICAgIHJlcXVpcmVMYXN0OiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaW5nbGVsaW5lOiB7XG4gICAgICAgICAgICBkZWxpbWl0ZXI6ICdzZW1pJyxcbiAgICAgICAgICAgIHJlcXVpcmVMYXN0OiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb24nOiAnb2ZmJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tYXJyYXktY29uc3RydWN0b3InOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1mdW5jdGlvbic6ICdvZmYnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2UnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnknOiAnb2ZmJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXh0cmEtbm9uLW51bGwtYXNzZXJ0aW9uJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZmxvYXRpbmctcHJvbWlzZXMnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1mb3ItaW4tYXJyYXknOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1pbXBsaWVkLWV2YWwnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1pbmZlcnJhYmxlLXR5cGVzJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1uZXcnOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1taXN1c2VkLXByb21pc2VzJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGVkLW9wdGlvbmFsLWNoYWluJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXBhcmFtZXRlci1wcm9wZXJ0aWVzJzogJ29mZicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXNoYWRvdyc6IFtcbiAgICAgICAgJ29mZicsXG4gICAgICAgIHtcbiAgICAgICAgICBob2lzdDogJ2FsbCdcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhcyc6ICd3YXJuJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1hc3NlcnRpb24nOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCc6ICd3YXJuJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGwnOiAnd2FybicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzJzogJ3dhcm4nLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuJzogJ3dhcm4nLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtZXhwcmVzc2lvbnMnOiBbXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd1Nob3J0Q2lyY3VpdDogdHJ1ZVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyc6ICdvZmYnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZSc6ICdvZmYnLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXMnOiAnb2ZmJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWFzLWNvbnN0JzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWZvci1vZic6ICdlcnJvcicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1mdW5jdGlvbi10eXBlJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLW5hbWVzcGFjZS1rZXl3b3JkJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLXJlZ2V4cC1leGVjJzogJ2Vycm9yJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcXVvdGVzJzogW1xuICAgICAgICAnZXJyb3InLFxuICAgICAgICAnc2luZ2xlJyxcbiAgICAgICAge2F2b2lkRXNjYXBlOiB0cnVlfVxuICAgICAgXSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcmVxdWlyZS1hd2FpdCc6ICdlcnJvcicsXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMnOiAnb2ZmJyxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnMnOiBbJ2Vycm9yJywge2FsbG93TnVtYmVyOiB0cnVlLCBhbGxvd0Jvb2xlYW46IHRydWV9XSxcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvc2VtaSc6IFtcbiAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgJ2Fsd2F5cydcbiAgICAgIF0sXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3RyaXBsZS1zbGFzaC1yZWZlcmVuY2UnOiBbXG4gICAgICAgICdvZmYnLFxuICAgICAgICB7XG4gICAgICAgICAgcGF0aDogJ2Fsd2F5cycsXG4gICAgICAgICAgdHlwZXM6ICdwcmVmZXItaW1wb3J0JyxcbiAgICAgICAgICBsaWI6ICdhbHdheXMnXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4dHJhLXNlbWknOiAnZXJyb3InLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZCc6IFsnb2ZmJywge2lnbm9yZVN0YXRpYzogdHJ1ZX1dLFxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC91bmlmaWVkLXNpZ25hdHVyZXMnOiAnZXJyb3InXG4gICAgfVxuICB9O1xufVxuXG5jb25zdCBpbnN0YW5jZSA9IG5ldyBDb25maWd1cmFibGUoKTtcblxuZXhwb3J0IGRlZmF1bHQgaW5zdGFuY2U7XG4iXX0=