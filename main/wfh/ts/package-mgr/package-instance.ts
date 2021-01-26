// /* tslint:disable max-classes-per-file */
// import * as _ from 'lodash';

// export default class PackageBrowserInstance {
//   longName: string;
//   shortName: string;
//   parsedName: {scope?: string, name: string};
//   scopeName?: string;
//   packagePath: string;
//   realPackagePath: string;

//   constructor(attrs: {[key in keyof PackageBrowserInstance]?: PackageBrowserInstance[key]}) {
//     if (!(this instanceof PackageBrowserInstance)) {
//       return new PackageBrowserInstance(attrs);
//     }
//     if (attrs) {
//       this.init(attrs);
//     }
//   }
//   init(attrs: {[key in keyof PackageBrowserInstance]?: PackageBrowserInstance[key]}) {
//     _.assign(this, attrs);
//     const parsedName = this.parsedName;
//     if (parsedName) {
//       this.shortName = parsedName.name;
//       this.scopeName = parsedName.scope;
//     }
//   }
//   toString() {
//     return 'Package: ' + this.longName;
//   }
// }



