import webpack from 'webpack';

/**
 * 
 * @param rules webpack configuration.module.rules
 * @param cb 
 */
export function findLoader(rules: webpack.RuleSetRule[],
  cb: (loader: string,
    parent: webpack.RuleSetLoader,
    parentIdx: number,
    parentSiblings: webpack.RuleSetUseItem[],
    grandpa: webpack.RuleSetRule
  ) => boolean) {

  for (const rule of rules || []) {
    if (rule.oneOf && findLoader(rule.oneOf, cb)) {
      return true;
    }
    if (rule.use) {
      if (findLoaderInRuleSetUse(rule.use, rule, cb))
        return true;
    }
    const ruleDirectLoader = rule.loader || rule.loaders;
    if (ruleDirectLoader && findLoaderInRuleSetUse(ruleDirectLoader, rule, cb)) {
      return true;
    }
  }
}

function findLoaderInRuleSetUse(use: webpack.RuleSetUse, rule: webpack.RuleSetRule, cb: Parameters<typeof findLoader>[1]) {
  let useItems = typeof use === 'function' ? use(null) : use;
  if (!Array.isArray(useItems)) {
    useItems = [useItems];
  }
  let i = 0;
  for (const useItem of useItems) {
    if (typeof useItem === 'string') {
      if (cb(useItem, {}, i, useItems, rule)) {
        return true;
      }
    } else if (typeof useItem === 'function') {
      continue;
    } else if (useItem.loader) {
      if (cb(useItem.loader, useItem, i, useItems, rule)) {
        return true;
      }
    }
    i++;
  }
}
