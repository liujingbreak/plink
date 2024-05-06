"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Package {
    constructor(attrs) {
        this.moduleName = '';
        this.shortName = '';
        this.name = '';
        this.longName = '';
        this.scope = '';
        /** If this property is not same as "realPath", then it is a symlink */
        this.path = '';
        this.json = { version: '', name: '' };
        this.realPath = '';
        Object.assign(this, attrs);
    }
}
exports.default = Package;
//# sourceMappingURL=packageNodeInstance.js.map