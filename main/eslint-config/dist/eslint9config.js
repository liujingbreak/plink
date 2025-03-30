import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import style from '@stylistic/eslint-plugin';
export function createConfigObj(tsconfigDir, tsconfigFileName = 'tsconfig.json') {
    return tseslint.config(eslint.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked, {
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
            '@typescript-eslint/restrict-template-expressions': ['warn', { allowNumber: true }],
            '@typescript-eslint/no-deprecated': 'warn'
            // 'no-unused-vars': 'off',
            // '@typescript-eslint/no-unused-vars': ['warn', ]
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNsaW50OWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9lc2xpbnQ5Y29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sTUFBTSxNQUFNLFlBQVksQ0FBQztBQUNoQyxPQUFPLFFBQXVCLE1BQU0sbUJBQW1CLENBQUM7QUFDeEQsT0FBTyxLQUFLLE1BQU0sMEJBQTBCLENBQUM7QUFFN0MsTUFBTSxVQUFVLGVBQWUsQ0FBQyxXQUFtQixFQUFFLGdCQUFnQixHQUFHLGVBQWU7SUFDckYsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUNwQixNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFDMUIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFDbEMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFFckM7UUFDRSxlQUFlLEVBQUU7WUFDZixhQUFhLEVBQUU7Z0JBQ2IsY0FBYyxFQUFFO29CQUNkLGNBQWMsRUFBRSxnQkFBZ0I7aUJBQ2pDO2dCQUNELGVBQWUsRUFBRSxXQUFXO2FBQzdCO1NBQ0Y7UUFDRCxPQUFPLEVBQUU7WUFDUCxZQUFZLEVBQUUsS0FBSztTQUNwQjtRQUNELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO2dCQUNoQyxJQUFJLEVBQUUsSUFBSTtnQkFDVixZQUFZLEVBQUUsS0FBSztnQkFDbkIsVUFBVSxFQUFFLE1BQU07Z0JBQ2xCLFdBQVcsRUFBRSxnQkFBZ0I7YUFDOUIsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxFQUFFO1lBQ0wsMENBQTBDO1lBQzFDLHlEQUF5RDtZQUN6RCw2RUFBNkU7WUFDN0UseUJBQXlCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUM7WUFDckQseUJBQXlCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDO1lBQ2pELGlDQUFpQyxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztZQUNwRCwrQkFBK0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7WUFDbkQsOEJBQThCLEVBQUUsS0FBSztZQUNyQywwQ0FBMEM7WUFDMUMsMENBQTBDLEVBQUUsTUFBTTtZQUNsRCx1Q0FBdUMsRUFBRSxLQUFLO1lBQzlDLDBDQUEwQyxFQUFFLEtBQUs7WUFDakQsa0RBQWtELEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBQyxXQUFXLEVBQUUsSUFBSSxFQUFDLENBQUM7WUFDakYsa0NBQWtDLEVBQUUsTUFBTTtZQUMxQywyQkFBMkI7WUFDM0Isa0RBQWtEO1NBQ25EO0tBQ0YsQ0FDRixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBlc2xpbnQgZnJvbSAnQGVzbGludC9qcyc7XHJcbmltcG9ydCB0c2VzbGludCwge0NvbmZpZ0FycmF5fSBmcm9tICd0eXBlc2NyaXB0LWVzbGludCc7XHJcbmltcG9ydCBzdHlsZSBmcm9tICdAc3R5bGlzdGljL2VzbGludC1wbHVnaW4nO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbmZpZ09iaih0c2NvbmZpZ0Rpcjogc3RyaW5nLCB0c2NvbmZpZ0ZpbGVOYW1lID0gJ3RzY29uZmlnLmpzb24nKTogQ29uZmlnQXJyYXkge1xyXG4gIHJldHVybiB0c2VzbGludC5jb25maWcoXHJcbiAgICBlc2xpbnQuY29uZmlncy5yZWNvbW1lbmRlZCxcclxuICAgIHRzZXNsaW50LmNvbmZpZ3Muc3RyaWN0VHlwZUNoZWNrZWQsXHJcbiAgICB0c2VzbGludC5jb25maWdzLnN0eWxpc3RpY1R5cGVDaGVja2VkLFxyXG5cclxuICAgIHtcclxuICAgICAgbGFuZ3VhZ2VPcHRpb25zOiB7XHJcbiAgICAgICAgcGFyc2VyT3B0aW9uczoge1xyXG4gICAgICAgICAgcHJvamVjdFNlcnZpY2U6IHtcclxuICAgICAgICAgICAgZGVmYXVsdFByb2plY3Q6IHRzY29uZmlnRmlsZU5hbWVcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB0c2NvbmZpZ1Jvb3REaXI6IHRzY29uZmlnRGlyXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBwbHVnaW5zOiB7XHJcbiAgICAgICAgJ0BzdHlsaXN0aWMnOiBzdHlsZVxyXG4gICAgICB9LFxyXG4gICAgICBleHRlbmRzOiBbc3R5bGUuY29uZmlncy5jdXN0b21pemUoe1xyXG4gICAgICAgIHNlbWk6IHRydWUsXHJcbiAgICAgICAgYmxvY2tTcGFjaW5nOiBmYWxzZSxcclxuICAgICAgICBicmFjZVN0eWxlOiAnMXRicycsXHJcbiAgICAgICAgY29tbWFEYW5nbGU6ICdvbmx5LW11bHRpbGluZSdcclxuICAgICAgfSldLFxyXG4gICAgICBydWxlczoge1xyXG4gICAgICAgIC8vIFRvIGNoZWNrIG9yaWdpbmFsIHBsdWdpbidzIHJ1bGVzLCByZWFkOlxyXG4gICAgICAgIC8vIC9ub2RlX21vZHVsZXMvQHN0eWxpc3RpYy9lc2xpbnQtcGx1Z2luL2Rpc3QvY29uZmlncy5qc1xyXG4gICAgICAgIC8vIGFuZCBodHRwczovL2VzbGludC5zdHlsZS9ydWxlcy9qcy9vcGVyYXRvci1saW5lYnJlYWsjanMtb3BlcmF0b3ItbGluZWJyZWFrXHJcbiAgICAgICAgJ0BzdHlsaXN0aWMvY29tbWEtZGFuZ2xlJzogWyd3YXJuJywgJ29ubHktbXVsdGlsaW5lJ10sXHJcbiAgICAgICAgJ0BzdHlsaXN0aWMvYXJyb3ctcGFyZW5zJzogWydlcnJvcicsICdhcy1uZWVkZWQnXSxcclxuICAgICAgICAnQHN0eWxpc3RpYy9vYmplY3QtY3VybHktc3BhY2luZyc6IFsnd2FybicsICduZXZlciddLFxyXG4gICAgICAgICdAc3R5bGlzdGljL29wZXJhdG9yLWxpbmVicmVhayc6IFsnZXJyb3InLCAnYWZ0ZXInXSxcclxuICAgICAgICAnQHN0eWxpc3RpYy9tdWx0aWxpbmUtdGVybmFyeSc6ICdvZmYnLFxyXG4gICAgICAgIC8vIERvYzogaHR0cHM6Ly90eXBlc2NyaXB0LWVzbGludC5pby9ydWxlc1xyXG4gICAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLW9wdGlvbmFsLWNoYWluJzogJ3dhcm4nLFxyXG4gICAgICAgICdAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50JzogJ29mZicsXHJcbiAgICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24nOiAnb2ZmJyxcclxuICAgICAgICAnQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zJzogWyd3YXJuJywge2FsbG93TnVtYmVyOiB0cnVlfV0sXHJcbiAgICAgICAgJ0B0eXBlc2NyaXB0LWVzbGludC9uby1kZXByZWNhdGVkJzogJ3dhcm4nXHJcbiAgICAgICAgLy8gJ25vLXVudXNlZC12YXJzJzogJ29mZicsXHJcbiAgICAgICAgLy8gJ0B0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyc6IFsnd2FybicsIF1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICk7XHJcbn1cclxuIl19