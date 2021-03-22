import webpack from 'webpack';
/**
 *
 * @param rules webpack configuration.module.rules
 * @param cb
 */
export declare function findLoader(rules: webpack.RuleSetRule[], cb: (loader: string, parent: webpack.RuleSetLoader, parentIdx: number, parentSiblings: webpack.RuleSetUseItem[], grandpa: webpack.RuleSetRule) => boolean): true | undefined;
