import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import style from '@stylistic/eslint-plugin';
export function createConfigObj(tsconfigDir, tsconfigFileName = 'tsconfig.json') {
    return (...more) => tseslint.config(eslint.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked, {
        ignores: ['**/*.d.ts'],
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
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            // To check original plugin's rules, read:
            // /node_modules/@stylistic/eslint-plugin/dist/configs.js
            // and https://eslint.style/rules/js/operator-linebreak#js-operator-linebreak
            '@stylistic/comma-dangle': ['warn', 'only-multiline'],
            '@stylistic/arrow-parens': ['error', 'as-needed'],
            '@stylistic/object-curly-spacing': ['warn', 'never'],
            '@stylistic/operator-linebreak': ['error', 'after'],
            '@stylistic/multiline-ternary': 'off',
            '@stylistic/no-multiple-empty-lines': ['warn', { max: 1 }],
            '@stylistic/space-before-function-paren': ['warn', {
                    asyncArrow: 'always',
                    named: 'never',
                    anonymous: 'never'
                }],
            '@stylistic/max-statements-per-line': ['warn', { max: 2 }],
            '@stylistic/generator-star-spacing': ['warn', { before: true, after: false }],
            // Doc: https://typescript-eslint.io/rules
            '@typescript-eslint/prefer-optional-chain': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/restrict-template-expressions': ['warn', { allowNumber: true }],
            '@typescript-eslint/no-deprecated': 'warn',
            '@typescript-eslint/no-confusing-void-expression': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/prefer-reduce-type-parameter': 'warn',
            '@typescript-eslint/restrict-plus-operands': ['warn', { allowNumberAndString: true }]
            // 'no-unused-vars': 'off',
            // '@typescript-eslint/no-unused-vars': ['warn', ]
        }
    }, ...more);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNsaW50OWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9lc2xpbnQ5Y29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sTUFBTSxNQUFNLFlBQVksQ0FBQztBQUNoQyxPQUFPLFFBQTZCLE1BQU0sbUJBQW1CLENBQUM7QUFDOUQsT0FBTyxLQUFLLE1BQU0sMEJBQTBCLENBQUM7QUFFN0MsTUFBTSxVQUFVLGVBQWUsQ0FBQyxXQUFtQixFQUFFLGdCQUFnQixHQUFHLGVBQWU7SUFDckYsT0FBTyxDQUFDLEdBQUcsSUFBeUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FDdEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQzFCLFFBQVEsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQ2xDLFFBQVEsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQ3JDO1FBQ0UsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDO1FBQ3RCLGVBQWUsRUFBRTtZQUNmLGFBQWEsRUFBRTtnQkFDYixjQUFjLEVBQUU7b0JBQ2QsY0FBYyxFQUFFLGdCQUFnQjtpQkFDakM7Z0JBQ0QsZUFBZSxFQUFFLFdBQVc7YUFDN0I7U0FDRjtRQUNELE9BQU8sRUFBRTtZQUNQLFlBQVksRUFBRSxLQUFLO1NBQ3BCO1FBQ0QsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7Z0JBQ2hDLElBQUksRUFBRSxJQUFJO2dCQUNWLFlBQVksRUFBRSxLQUFLO2dCQUNuQixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsV0FBVyxFQUFFLGdCQUFnQjthQUM5QixDQUFDLENBQUM7UUFDSCxLQUFLLEVBQUU7WUFDTCxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUMsQ0FBQztZQUNsRCwwQ0FBMEM7WUFDMUMseURBQXlEO1lBQ3pELDZFQUE2RTtZQUM3RSx5QkFBeUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQztZQUNyRCx5QkFBeUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUM7WUFDakQsaUNBQWlDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO1lBQ3BELCtCQUErQixFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztZQUNuRCw4QkFBOEIsRUFBRSxLQUFLO1lBQ3JDLG9DQUFvQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDO1lBQ3hELHdDQUF3QyxFQUFFLENBQUMsTUFBTSxFQUFFO29CQUNqRCxVQUFVLEVBQUUsUUFBUTtvQkFDcEIsS0FBSyxFQUFFLE9BQU87b0JBQ2QsU0FBUyxFQUFFLE9BQU87aUJBQ25CLENBQUM7WUFDRixvQ0FBb0MsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQztZQUN4RCxtQ0FBbUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBQyxDQUFDO1lBQzNFLDBDQUEwQztZQUMxQywwQ0FBMEMsRUFBRSxNQUFNO1lBQ2xELHVDQUF1QyxFQUFFLEtBQUs7WUFDOUMsMENBQTBDLEVBQUUsS0FBSztZQUNqRCxrREFBa0QsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUMsQ0FBQztZQUNqRixrQ0FBa0MsRUFBRSxNQUFNO1lBQzFDLGlEQUFpRCxFQUFFLE1BQU07WUFDekQsb0NBQW9DLEVBQUUsS0FBSztZQUMzQyxpREFBaUQsRUFBRSxNQUFNO1lBQ3pELDJDQUEyQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFDLENBQUM7WUFDbkYsMkJBQTJCO1lBQzNCLGtEQUFrRDtTQUNuRDtLQUNGLEVBQ0QsR0FBRyxJQUFJLENBQ1IsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXNsaW50IGZyb20gJ0Blc2xpbnQvanMnO1xuaW1wb3J0IHRzZXNsaW50LCB7Q29uZmlnV2l0aEV4dGVuZHN9IGZyb20gJ3R5cGVzY3JpcHQtZXNsaW50JztcbmltcG9ydCBzdHlsZSBmcm9tICdAc3R5bGlzdGljL2VzbGludC1wbHVnaW4nO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29uZmlnT2JqKHRzY29uZmlnRGlyOiBzdHJpbmcsIHRzY29uZmlnRmlsZU5hbWUgPSAndHNjb25maWcuanNvbicpIHtcbiAgcmV0dXJuICguLi5tb3JlOiBDb25maWdXaXRoRXh0ZW5kc1tdKSA9PiB0c2VzbGludC5jb25maWcoXG4gICAgZXNsaW50LmNvbmZpZ3MucmVjb21tZW5kZWQsXG4gICAgdHNlc2xpbnQuY29uZmlncy5zdHJpY3RUeXBlQ2hlY2tlZCxcbiAgICB0c2VzbGludC5jb25maWdzLnN0eWxpc3RpY1R5cGVDaGVja2VkLFxuICAgIHtcbiAgICAgIGlnbm9yZXM6IFsnKiovKi5kLnRzJ10sXG4gICAgICBsYW5ndWFnZU9wdGlvbnM6IHtcbiAgICAgICAgcGFyc2VyT3B0aW9uczoge1xuICAgICAgICAgIHByb2plY3RTZXJ2aWNlOiB7XG4gICAgICAgICAgICBkZWZhdWx0UHJvamVjdDogdHNjb25maWdGaWxlTmFtZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdHNjb25maWdSb290RGlyOiB0c2NvbmZpZ0RpclxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcGx1Z2luczoge1xuICAgICAgICAnQHN0eWxpc3RpYyc6IHN0eWxlXG4gICAgICB9LFxuICAgICAgZXh0ZW5kczogW3N0eWxlLmNvbmZpZ3MuY3VzdG9taXplKHtcbiAgICAgICAgc2VtaTogdHJ1ZSxcbiAgICAgICAgYmxvY2tTcGFjaW5nOiBmYWxzZSxcbiAgICAgICAgYnJhY2VTdHlsZTogJzF0YnMnLFxuICAgICAgICBjb21tYURhbmdsZTogJ29ubHktbXVsdGlsaW5lJ1xuICAgICAgfSldLFxuICAgICAgcnVsZXM6IHtcbiAgICAgICAgJ25vLWNvbnNvbGUnOiBbJ3dhcm4nLCB7YWxsb3c6IFsnd2FybicsICdlcnJvciddfV0sXG4gICAgICAgIC8vIFRvIGNoZWNrIG9yaWdpbmFsIHBsdWdpbidzIHJ1bGVzLCByZWFkOlxuICAgICAgICAvLyAvbm9kZV9tb2R1bGVzL0BzdHlsaXN0aWMvZXNsaW50LXBsdWdpbi9kaXN0L2NvbmZpZ3MuanNcbiAgICAgICAgLy8gYW5kIGh0dHBzOi8vZXNsaW50LnN0eWxlL3J1bGVzL2pzL29wZXJhdG9yLWxpbmVicmVhayNqcy1vcGVyYXRvci1saW5lYnJlYWtcbiAgICAgICAgJ0BzdHlsaXN0aWMvY29tbWEtZGFuZ2xlJzogWyd3YXJuJywgJ29ubHktbXVsdGlsaW5lJ10sXG4gICAgICAgICdAc3R5bGlzdGljL2Fycm93LXBhcmVucyc6IFsnZXJyb3InLCAnYXMtbmVlZGVkJ10sXG4gICAgICAgICdAc3R5bGlzdGljL29iamVjdC1jdXJseS1zcGFjaW5nJzogWyd3YXJuJywgJ25ldmVyJ10sXG4gICAgICAgICdAc3R5bGlzdGljL29wZXJhdG9yLWxpbmVicmVhayc6IFsnZXJyb3InLCAnYWZ0ZXInXSxcbiAgICAgICAgJ0BzdHlsaXN0aWMvbXVsdGlsaW5lLXRlcm5hcnknOiAnb2ZmJyxcbiAgICAgICAgJ0BzdHlsaXN0aWMvbm8tbXVsdGlwbGUtZW1wdHktbGluZXMnOiBbJ3dhcm4nLCB7bWF4OiAxfV0sXG4gICAgICAgICdAc3R5bGlzdGljL3NwYWNlLWJlZm9yZS1mdW5jdGlvbi1wYXJlbic6IFsnd2FybicsIHtcbiAgICAgICAgICBhc3luY0Fycm93OiAnYWx3YXlzJyxcbiAgICAgICAgICBuYW1lZDogJ25ldmVyJyxcbiAgICAgICAgICBhbm9ueW1vdXM6ICduZXZlcidcbiAgICAgICAgfV0sXG4gICAgICAgICdAc3R5bGlzdGljL21heC1zdGF0ZW1lbnRzLXBlci1saW5lJzogWyd3YXJuJywge21heDogMn1dLFxuICAgICAgICAnQHN0eWxpc3RpYy9nZW5lcmF0b3Itc3Rhci1zcGFjaW5nJzogWyd3YXJuJywge2JlZm9yZTogdHJ1ZSwgYWZ0ZXI6IGZhbHNlfV0sXG4gICAgICAgIC8vIERvYzogaHR0cHM6Ly90eXBlc2NyaXB0LWVzbGludC5pby9ydWxlc1xuICAgICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1vcHRpb25hbC1jaGFpbic6ICd3YXJuJyxcbiAgICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXJndW1lbnQnOiAnb2ZmJyxcbiAgICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24nOiAnb2ZmJyxcbiAgICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9ucyc6IFsnd2FybicsIHthbGxvd051bWJlcjogdHJ1ZX1dLFxuICAgICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L25vLWRlcHJlY2F0ZWQnOiAnd2FybicsXG4gICAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tY29uZnVzaW5nLXZvaWQtZXhwcmVzc2lvbic6ICd3YXJuJyxcbiAgICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnknOiAnb2ZmJyxcbiAgICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItcmVkdWNlLXR5cGUtcGFyYW1ldGVyJzogJ3dhcm4nLFxuICAgICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMnOiBbJ3dhcm4nLCB7YWxsb3dOdW1iZXJBbmRTdHJpbmc6IHRydWV9XVxuICAgICAgICAvLyAnbm8tdW51c2VkLXZhcnMnOiAnb2ZmJyxcbiAgICAgICAgLy8gJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyc6IFsnd2FybicsIF1cbiAgICAgIH1cbiAgICB9LFxuICAgIC4uLm1vcmVcbiAgKTtcbn1cblxuIl19