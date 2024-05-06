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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsc0ZBQWtEO0FBRWxELE1BQU0sYUFBYSxHQUFHLGlDQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRS9DLE1BQU0sWUFBWTtJQUFsQjtRQUNFLFNBQUksaUNBQ0YsSUFBSSxFQUFFLElBQUksSUFDUCxpQ0FBVyxLQUNkLE9BQU8sRUFBRTtnQkFDUCxvQkFBb0I7Z0JBQ3BCLEdBQUcsaUNBQVcsQ0FBQyxPQUFPO2FBQ3ZCLEVBQ0QsY0FBYyxFQUFFO2dCQUNkLGNBQWM7Z0JBQ2QsV0FBVztnQkFDWCxZQUFZO2dCQUNaLFlBQVk7YUFDYjtZQUNELGNBQWM7WUFDZCxhQUFhO1lBQ2Isd0dBQXdHO1lBQ3hHLE9BQU87WUFDUCxLQUFLO1lBQ0wsU0FBUyxFQUFFLEVBQUUsRUFDYixLQUFLLGtDQUNBLGlDQUFXLENBQUMsS0FBSyxLQUNwQixjQUFjLEVBQUUsT0FBTyxFQUN2QixjQUFjLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQ2xDLGVBQWUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLEVBQ3ZELHFCQUFxQixFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxFQUN6QyxtQkFBbUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxFQUNqRCxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDO2dCQUN2QyxtRUFBbUU7Z0JBQ25FLGFBQWEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUMzQyx1QkFBdUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUNwRCxz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LElBQUksRUFBQyxDQUFDLEVBQ2xFLHVDQUF1QyxFQUFFLE9BQU8sR0FDakQ7S0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sUUFBUSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7QUFFcEMsa0JBQWUsUUFBUSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxpbXBvcnQgcGF0aD1cIm1vZHVsZXMuZC50c1wiIC8+XHJcbmltcG9ydCByZWFjdEFwcENmZyBmcm9tICdlc2xpbnQtY29uZmlnLXJlYWN0LWFwcCc7XHJcblxyXG5jb25zdCByZWFjdE92ZXJyaWRlID0gcmVhY3RBcHBDZmcub3ZlcnJpZGVzWzBdO1xyXG5cclxuY2xhc3MgQ29uZmlndXJhYmxlIHtcclxuICBydWxlID0ge1xyXG4gICAgcm9vdDogdHJ1ZSxcclxuICAgIC4uLnJlYWN0QXBwQ2ZnLFxyXG4gICAgZXh0ZW5kczogW1xyXG4gICAgICAnZXNsaW50OnJlY29tbWVuZGVkJyxcclxuICAgICAgLi4ucmVhY3RBcHBDZmcuZXh0ZW5kc1xyXG4gICAgXSxcclxuICAgIGlnbm9yZVBhdHRlcm5zOiBbXHJcbiAgICAgICcqKi9kaXN0LyoqLyonLFxyXG4gICAgICAnKiovKi5kLnRzJyxcclxuICAgICAgJyoqLyouZC5tdHMnLFxyXG4gICAgICAnKiovKi5kLmN0cydcclxuICAgIF0sXHJcbiAgICAvLyBzZXR0aW5nczoge1xyXG4gICAgLy8gICByZWFjdDoge1xyXG4gICAgLy8gICAgICAgdmVyc2lvbjogcmVhY3RWZXJzaW9uLCAvLyBUbyBvdmVycmlkZSBcImRldGVjdFwiIHNldHRpbmcgaW4gQ1JBJ3MgZXNsaW50LWNvbmZpZy1yZWFjdC1hcHAvYmFzZS5qc1xyXG4gICAgLy8gICB9LFxyXG4gICAgLy8gfSxcclxuICAgIG92ZXJyaWRlczogW10sXHJcbiAgICBydWxlczoge1xyXG4gICAgICAuLi5yZWFjdEFwcENmZy5ydWxlcyxcclxuICAgICAgJ3ByZWZlci1jb25zdCc6ICdlcnJvcicsXHJcbiAgICAgICdjb21tYS1kYW5nbGUnOiBbJ2Vycm9yJywgJ25ldmVyJ10sXHJcbiAgICAgICdjb21tYS1zcGFjaW5nJzogWyd3YXJuJywge2JlZm9yZTogZmFsc2UsIGFmdGVyOiB0cnVlfV0sXHJcbiAgICAgICdzcGFjZS1iZWZvcmUtYmxvY2tzJzogWyd3YXJuJywgJ2Fsd2F5cyddLFxyXG4gICAgICAnbXVsdGlsaW5lLXRlcm5hcnknOiBbJ3dhcm4nLCAnYWx3YXlzLW11bHRpbGluZSddLFxyXG4gICAgICAnanN4LXF1b3Rlcyc6IFsnd2FybicsICdwcmVmZXItZG91YmxlJ10sXHJcbiAgICAgIC8vICduZXdsaW5lLXBlci1jaGFpbmVkLWNhbGwnOiBbJ3dhcm4nLCB7aWdub3JlQ2hhaW5XaXRoRGVwdGg6IDN9XSxcclxuICAgICAgJ2tleS1zcGFjaW5nJzogWyd3YXJuJywge2FmdGVyQ29sb246IHRydWV9XSxcclxuICAgICAgJ2FycmF5LWJyYWNrZXQtbmV3bGluZSc6IFsnd2FybicsIHttdWx0aWxpbmU6IHRydWV9XSxcclxuICAgICAgJ29iamVjdC1jdXJseS1zcGFjaW5nJzogWyd3YXJuJywgJ25ldmVyJ10sXHJcbiAgICAgICdicmFjZS1zdHlsZSc6IFtcclxuICAgICAgICAnZXJyb3InLCAnMXRicycsIHtcclxuICAgICAgICAgIGFsbG93U2luZ2xlTGluZTogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ25vLWV4dHJhLXNlbWknOiAnb2ZmJyxcclxuICAgICAgJ3ByZWZlci1yZXN0LXBhcmFtcyc6ICdvZmYnLFxyXG4gICAgICAnYXJyb3ctcGFyZW5zJzogW1xyXG4gICAgICAgICdvZmYnLFxyXG4gICAgICAgICdhbHdheXMnXHJcbiAgICAgIF0sXHJcbiAgICAgIGNvbXBsZXhpdHk6ICdvZmYnLFxyXG4gICAgICAnY29uc3RydWN0b3Itc3VwZXInOiAnZXJyb3InLFxyXG4gICAgICBjdXJseTogW1xyXG4gICAgICAgICdvZmYnLFxyXG4gICAgICAgICdtdWx0aS1saW5lJ1xyXG4gICAgICBdLFxyXG4gICAgICAnZGVmYXVsdC1jYXNlJzogJ2Vycm9yJyxcclxuICAgICAgJ2RvdC1ub3RhdGlvbic6ICdlcnJvcicsXHJcbiAgICAgICdlb2wtbGFzdCc6ICdlcnJvcicsXHJcbiAgICAgIGVxZXFlcTogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAgJ3NtYXJ0J1xyXG4gICAgICBdLFxyXG4gICAgICAnZ3VhcmQtZm9yLWluJzogJ2Vycm9yJyxcclxuICAgICAgJ2lkLWJsYWNrbGlzdCc6ICdvZmYnLFxyXG4gICAgICAnaWQtbWF0Y2gnOiAnb2ZmJyxcclxuICAgICAgJ2ltcG9ydC9vcmRlcic6IFsnd2FybicsIHtncm91cHM6IFsnYnVpbHRpbicsICdleHRlcm5hbCcsICdwYXJlbnQnLCAnc2libGluZycsICdpbmRleCddfV0sXHJcbiAgICAgICdqc2RvYy9jaGVjay1hbGlnbm1lbnQnOiAnb2ZmJyxcclxuICAgICAgJ2pzZG9jL2NoZWNrLWluZGVudGF0aW9uJzogJ29mZicsXHJcbiAgICAgICdqc2RvYy9uZXdsaW5lLWFmdGVyLWRlc2NyaXB0aW9uJzogJ29mZicsXHJcbiAgICAgICdsaW5lYnJlYWstc3R5bGUnOiBbXHJcbiAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICAndW5peCdcclxuICAgICAgXSxcclxuICAgICAgJ21heC1jbGFzc2VzLXBlci1maWxlJzogJ29mZicsXHJcbiAgICAgICduZXctcGFyZW5zJzogJ2Vycm9yJyxcclxuICAgICAgJ25vLWFycmF5LWNvbnN0cnVjdG9yJzogJ29mZicsXHJcbiAgICAgICduby1iaXR3aXNlJzogJ29mZicsXHJcbiAgICAgICduby1jYWxsZXInOiAnZXJyb3InLFxyXG4gICAgICAnbm8tY29uZC1hc3NpZ24nOiAnb2ZmJyxcclxuICAgICAgJ25vLWNvbnNvbGUnOiBbXHJcbiAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBhbGxvdzogW1xyXG4gICAgICAgICAgICAnd2FybicsXHJcbiAgICAgICAgICAgICdkaXInLFxyXG4gICAgICAgICAgICAndGltZScsXHJcbiAgICAgICAgICAgICd0aW1lRW5kJyxcclxuICAgICAgICAgICAgJ3RpbWVMb2cnLFxyXG4gICAgICAgICAgICAndHJhY2UnLFxyXG4gICAgICAgICAgICAnYXNzZXJ0JyxcclxuICAgICAgICAgICAgJ2NsZWFyJyxcclxuICAgICAgICAgICAgJ2NvdW50JyxcclxuICAgICAgICAgICAgJ2NvdW50UmVzZXQnLFxyXG4gICAgICAgICAgICAnZ3JvdXAnLFxyXG4gICAgICAgICAgICAnZ3JvdXBFbmQnLFxyXG4gICAgICAgICAgICAndGFibGUnLFxyXG4gICAgICAgICAgICAnZGVidWcnLFxyXG4gICAgICAgICAgICAnaW5mbycsXHJcbiAgICAgICAgICAgICdkaXJ4bWwnLFxyXG4gICAgICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgICAgICAnZ3JvdXBDb2xsYXBzZWQnLFxyXG4gICAgICAgICAgICAnQ29uc29sZScsXHJcbiAgICAgICAgICAgICdwcm9maWxlJyxcclxuICAgICAgICAgICAgJ3Byb2ZpbGVFbmQnLFxyXG4gICAgICAgICAgICAndGltZVN0YW1wJyxcclxuICAgICAgICAgICAgJ2NvbnRleHQnXHJcbiAgICAgICAgICBdXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICAnbm8tY29uc3RhbnQtY29uZGl0aW9uJzogJ29mZicsXHJcbiAgICAgICduby1kZWJ1Z2dlcic6ICdlcnJvcicsXHJcbiAgICAgICduby1lbXB0eSc6ICdvZmYnLFxyXG4gICAgICAnbm8tZW1wdHktZnVuY3Rpb24nOiAnb2ZmJyxcclxuICAgICAgJ25vLWV2YWwnOiAnZXJyb3InLFxyXG4gICAgICAnbm8tZmFsbHRocm91Z2gnOiAnb2ZmJyxcclxuICAgICAgJ25vLWltcGxpZWQtZXZhbCc6ICdvZmYnLFxyXG4gICAgICAnbm8taW52YWxpZC10aGlzJzogJ29mZicsXHJcbiAgICAgICduby1uZXctd3JhcHBlcnMnOiAnb2ZmJyxcclxuICAgICAgJ25vLXNoYWRvdyc6ICdvZmYnLFxyXG4gICAgICAnbm8tdGhyb3ctbGl0ZXJhbCc6ICdlcnJvcicsXHJcbiAgICAgICduby10cmFpbGluZy1zcGFjZXMnOiBbXHJcbiAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZ25vcmVDb21tZW50czogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ25vLXVuZGVmLWluaXQnOiAnZXJyb3InLFxyXG4gICAgICAnbm8tdW5kZXJzY29yZS1kYW5nbGUnOiAnb2ZmJyxcclxuICAgICAgJ25vLXVuc2FmZS1maW5hbGx5JzogJ2Vycm9yJyxcclxuICAgICAgJ25vLXVudXNlZC1leHByZXNzaW9ucyc6ICdlcnJvcicsXHJcbiAgICAgICduby11bnVzZWQtbGFiZWxzJzogJ2Vycm9yJyxcclxuICAgICAgJ25vLXVudXNlZC12YXJzJzogJ29mZicsXHJcbiAgICAgICduby11c2UtYmVmb3JlLWRlZmluZSc6ICdvZmYnLFxyXG4gICAgICAnbm8tdmFyJzogJ29mZicsXHJcbiAgICAgICdvYmplY3Qtc2hvcnRoYW5kJzogJ2Vycm9yJyxcclxuICAgICAgJ29uZS12YXInOiBbXHJcbiAgICAgICAgJ29mZicsXHJcbiAgICAgICAgJ25ldmVyJ1xyXG4gICAgICBdLFxyXG4gICAgICAncHJlZmVyLWFycm93L3ByZWZlci1hcnJvdy1mdW5jdGlvbnMnOiAnb2ZmJyxcclxuICAgICAgJ3F1b3RlLXByb3BzJzogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAgJ2FzLW5lZWRlZCdcclxuICAgICAgXSxcclxuICAgICAgcXVvdGVzOiBbJ3dhcm4nLCAnc2luZ2xlJywge2F2b2lkRXNjYXBlOiB0cnVlfV0sXHJcbiAgICAgIHJhZGl4OiAnZXJyb3InLFxyXG4gICAgICAncmVxdWlyZS1hd2FpdCc6ICdvZmYnLFxyXG4gICAgICBzZW1pOiAnZXJyb3InLFxyXG4gICAgICAnc3BhY2UtYmVmb3JlLWZ1bmN0aW9uLXBhcmVuJzogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYW5vbnltb3VzOiAnbmV2ZXInLFxyXG4gICAgICAgICAgbmFtZWQ6ICduZXZlcidcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgIGluZGVudDogWyd3YXJuJywgMl0sXHJcbiAgICAgICdzcGFjZWQtY29tbWVudCc6IFtcclxuICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgICdhbHdheXMnLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG1hcmtlcnM6IFsnLyddXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICAndXNlLWlzbmFuJzogJ2Vycm9yJyxcclxuICAgICAgJ3ZhbGlkLXR5cGVvZic6ICdvZmYnLFxyXG4gICAgICAnbm8tbG9vcC1mdW5jJzogJ3dhcm4nLFxyXG4gICAgICAnaW1wb3J0L25vLWFub255bW91cy1kZWZhdWx0LWV4cG9ydCc6ICdvZmYnLCAvLyBvdmVycmlkZSBydWxlcyBmcm9tIGVzbGludC1jb25maWctcmVhY3QtYXBwXHJcbiAgICAgICdhcnJheS1jYWxsYmFjay1yZXR1cm4nOiAnb2ZmJyxcclxuICAgICAgJ2ltcG9ydC9uby13ZWJwYWNrLWxvYWRlci1zeW50YXgnOiAnb2ZmJyAvLyBvdmVycmlkZSBydWxlcyBmcm9tIGVzbGludC1jb25maWctcmVhY3QtYXBwXHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgYWRkVHNGaWxlcyhmaWxlUGF0dGVybnM6IHN0cmluZ1tdLCB0c2NvbmZpZ0ZpbGU6IHN0cmluZykge1xyXG4gICAgdGhpcy5ydWxlLm92ZXJyaWRlcy5wdXNoKGNyZWF0ZVRzUnVsZXNPdmVycmlkZShmaWxlUGF0dGVybnMsIHRzY29uZmlnRmlsZSkpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBidWlsZCgpIHtcclxuICAgIHJldHVybiB0aGlzLnJ1bGU7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBUbyBjaGFuZ2UgZGVmYXVsdCBpZ25vcmVQYXR0ZXJuc1xyXG4vLyBjb25maWcuaWdub3JlUGF0dGVybnMgPSBbXCIqKi8qLmQudHNcIl07XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUc1J1bGVzT3ZlcnJpZGUoZmlsZVBhdHRlcm5zOiBzdHJpbmdbXSwgdHNjb25maWdGaWxlOiBzdHJpbmcsIGRlYnVnID0gZmFsc2UpIHtcclxuICByZXR1cm4ge1xyXG4gICAgZmlsZXM6IGZpbGVQYXR0ZXJucyxcclxuICAgIGV4dGVuZHM6IFtcclxuICAgICAgJ2VzbGludDpyZWNvbW1lbmRlZCcsXHJcbiAgICAgICdwbHVnaW46QHR5cGVzY3JpcHQtZXNsaW50L3JlY29tbWVuZGVkJyxcclxuICAgICAgJ3BsdWdpbjpAdHlwZXNjcmlwdC1lc2xpbnQvcmVjb21tZW5kZWQtcmVxdWlyaW5nLXR5cGUtY2hlY2tpbmcnXHJcbiAgICBdLFxyXG4gICAgZXhjbHVkZWRGaWxlczogJyouZC50cycsXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgICdqc2RvYycsXHJcbiAgICAgICdpbXBvcnQnLFxyXG4gICAgICAncHJlZmVyLWFycm93JyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludCcsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvdHNsaW50J1xyXG4gICAgXSxcclxuICAgIHBhcnNlcjogJ0B0eXBlc2NyaXB0LWVzbGludC9wYXJzZXInLFxyXG4gICAgcGFyc2VyT3B0aW9uczoge1xyXG4gICAgICAuLi4ocmVhY3RPdmVycmlkZS5wYXJzZXJPcHRpb25zKSxcclxuICAgICAgZGVidWdMZXZlbDogZGVidWcsXHJcbiAgICAgIHByb2plY3Q6IHRzY29uZmlnRmlsZVxyXG4gICAgfSxcclxuICAgIHJ1bGVzOiB7XHJcbiAgICAgIC4uLihyZWFjdE92ZXJyaWRlLnJ1bGVzKSxcclxuICAgICAgJ2NvbW1hLWRhbmdsZSc6ICdvZmYnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2NvbW1hLWRhbmdsZSc6IFsnd2FybicsICduZXZlciddLFxyXG4gICAgICAnb2JqZWN0LWN1cmx5LXNwYWNpbmcnOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItb3B0aW9uYWwtY2hhaW4nOiAnd2FybicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvb2JqZWN0LWN1cmx5LXNwYWNpbmcnOiBbJ3dhcm4nLCAnbmV2ZXInXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXJndW1lbnQnOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC90c2xpbnQvY29uZmlnJzogW1xyXG4gICAgICAgICd3YXJuJywge1xyXG4gICAgICAgICAgcnVsZXM6IHtcclxuICAgICAgICAgICAgd2hpdGVzcGFjZTogW1xyXG4gICAgICAgICAgICAgIHRydWUsXHJcbiAgICAgICAgICAgICAgJ2NoZWNrLWJyYW5jaCcsXHJcbiAgICAgICAgICAgICAgJ2NoZWNrLWRlY2wnLFxyXG4gICAgICAgICAgICAgICdjaGVjay1vcGVyYXRvcicsXHJcbiAgICAgICAgICAgICAgLy8gXCJjaGVjay1tb2R1bGVcIixcclxuICAgICAgICAgICAgICAnY2hlY2stc2VwYXJhdG9yJyxcclxuICAgICAgICAgICAgICAnY2hlY2stcmVzdC1zcHJlYWQnLFxyXG4gICAgICAgICAgICAgICdjaGVjay10eXBlJyxcclxuICAgICAgICAgICAgICAnY2hlY2stdHlwZWNhc3QnLFxyXG4gICAgICAgICAgICAgICdjaGVjay10eXBlLW9wZXJhdG9yJ1xyXG4gICAgICAgICAgICAgIC8vIFwiY2hlY2stcHJlYmxvY2tcIixcclxuICAgICAgICAgICAgICAvLyBcImNoZWNrLXBvc3RicmFjZVwiXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvYWRqYWNlbnQtb3ZlcmxvYWQtc2lnbmF0dXJlcyc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvYXJyYXktdHlwZSc6ICdvZmYnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2F3YWl0LXRoZW5hYmxlJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9iYW4tdHMtY29tbWVudCc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzJzogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdHlwZXM6IHtcclxuICAgICAgICAgICAgT2JqZWN0OiB7XHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0F2b2lkIHVzaW5nIHRoZSBgT2JqZWN0YCB0eXBlLiBEaWQgeW91IG1lYW4gYG9iamVjdGA/J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBGdW5jdGlvbjoge1xyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdm9pZCB1c2luZyB0aGUgYEZ1bmN0aW9uYCB0eXBlLiBQcmVmZXIgYSBzcGVjaWZpYyBmdW5jdGlvbiB0eXBlLCBsaWtlIGAoKSA9PiB2b2lkYC4nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIEJvb2xlYW46IHtcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnQXZvaWQgdXNpbmcgdGhlIGBCb29sZWFuYCB0eXBlLiBEaWQgeW91IG1lYW4gYGJvb2xlYW5gPydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgTnVtYmVyOiB7XHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0F2b2lkIHVzaW5nIHRoZSBgTnVtYmVyYCB0eXBlLiBEaWQgeW91IG1lYW4gYG51bWJlcmA/J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBTdHJpbmc6IHtcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnQXZvaWQgdXNpbmcgdGhlIGBTdHJpbmdgIHR5cGUuIERpZCB5b3UgbWVhbiBgc3RyaW5nYD8nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIFN5bWJvbDoge1xyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdm9pZCB1c2luZyB0aGUgYFN5bWJvbGAgdHlwZS4gRGlkIHlvdSBtZWFuIGBzeW1ib2xgPydcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9jb25zaXN0ZW50LXR5cGUtYXNzZXJ0aW9ucyc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvZG90LW5vdGF0aW9uJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tZW1iZXItYWNjZXNzaWJpbGl0eSc6IFtcclxuICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFjY2Vzc2liaWxpdHk6ICduby1wdWJsaWMnXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1vZHVsZS1ib3VuZGFyeS10eXBlcyc6ICdvZmYnLFxyXG4gICAgICBpbmRlbnQ6ICdvZmYnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L2luZGVudCc6IFtcclxuICAgICAgICAnd2FybicsXHJcbiAgICAgICAgMlxyXG4gICAgICBdLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L21lbWJlci1kZWxpbWl0ZXItc3R5bGUnOiBbXHJcbiAgICAgICAgJ3dhcm4nLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG11bHRpbGluZToge1xyXG4gICAgICAgICAgICBkZWxpbWl0ZXI6ICdzZW1pJyxcclxuICAgICAgICAgICAgcmVxdWlyZUxhc3Q6IHRydWVcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBzaW5nbGVsaW5lOiB7XHJcbiAgICAgICAgICAgIGRlbGltaXRlcjogJ3NlbWknLFxyXG4gICAgICAgICAgICByZXF1aXJlTGFzdDogZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb24nOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1hcnJheS1jb25zdHJ1Y3Rvcic6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktZnVuY3Rpb24nOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2UnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSc6ICdvZmYnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4dHJhLW5vbi1udWxsLWFzc2VydGlvbic6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZmxvYXRpbmctcHJvbWlzZXMnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWZvci1pbi1hcnJheSc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8taW1wbGllZC1ldmFsJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1pbmZlcnJhYmxlLXR5cGVzJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1taXN1c2VkLW5ldyc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1wcm9taXNlcyc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0ZWQtb3B0aW9uYWwtY2hhaW4nOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvbic6ICdvZmYnLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXBhcmFtZXRlci1wcm9wZXJ0aWVzJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tc2hhZG93JzogW1xyXG4gICAgICAgICdvZmYnLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGhvaXN0OiAnYWxsJ1xyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzJzogJ3dhcm4nLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXVubmVjZXNzYXJ5LXR5cGUtYXNzZXJ0aW9uJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCc6ICd3YXJuJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbCc6ICd3YXJuJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzcyc6ICd3YXJuJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuJzogJ3dhcm4nLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC1leHByZXNzaW9ucyc6IFtcclxuICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFsbG93U2hvcnRDaXJjdWl0OiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzJzogJ29mZicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlLWJlZm9yZS1kZWZpbmUnOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXMnOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItYXMtY29uc3QnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1mb3Itb2YnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1mdW5jdGlvbi10eXBlJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItbmFtZXNwYWNlLWtleXdvcmQnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1yZWdleHAtZXhlYyc6ICdlcnJvcicsXHJcbiAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcXVvdGVzJzogW1xyXG4gICAgICAgICdlcnJvcicsXHJcbiAgICAgICAgJ3NpbmdsZScsXHJcbiAgICAgICAge2F2b2lkRXNjYXBlOiB0cnVlfVxyXG4gICAgICBdLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3JlcXVpcmUtYXdhaXQnOiAnZXJyb3InLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMnOiAnb2ZmJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9ucyc6IFsnZXJyb3InLCB7YWxsb3dOdW1iZXI6IHRydWUsIGFsbG93Qm9vbGVhbjogdHJ1ZX1dLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3NlbWknOiBbXHJcbiAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICAnYWx3YXlzJ1xyXG4gICAgICBdLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3RyaXBsZS1zbGFzaC1yZWZlcmVuY2UnOiBbXHJcbiAgICAgICAgJ29mZicsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcGF0aDogJ2Fsd2F5cycsXHJcbiAgICAgICAgICB0eXBlczogJ3ByZWZlci1pbXBvcnQnLFxyXG4gICAgICAgICAgbGliOiAnYWx3YXlzJ1xyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1leHRyYS1zZW1pJzogJ2Vycm9yJyxcclxuICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZCc6IFsnb2ZmJywge2lnbm9yZVN0YXRpYzogdHJ1ZX1dLFxyXG4gICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3VuaWZpZWQtc2lnbmF0dXJlcyc6ICdlcnJvcidcclxuICAgIH1cclxuICB9O1xyXG59XHJcblxyXG5jb25zdCBpbnN0YW5jZSA9IG5ldyBDb25maWd1cmFibGUoKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGluc3RhbmNlO1xyXG4iXX0=