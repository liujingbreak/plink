import {TransformerCreator, SyncTransformer} from '@jest/transform';

const transformFactory: TransformerCreator<SyncTransformer, Record<string, any>> = (config) => {
  return {
    process(sourceText, sourcePath, options) {

    }
  };
};

