import * as wp from 'webpack';

const loader: wp.loader.Loader = function(source, sourceMap) {
  const file = this.resourcePath;
  console.log(file);
  const cb = this.async();

  cb!(null, source, sourceMap);
};

export = loader;
