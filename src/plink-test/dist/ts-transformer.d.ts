import { TransformerCreator, SyncTransformer } from '@jest/transform';
declare type TransformerConfig = {
    rootFiles: string[];
};
declare const _default: {
    createTransformer: TransformerCreator<SyncTransformer<TransformerConfig>, TransformerConfig>;
};
export default _default;
