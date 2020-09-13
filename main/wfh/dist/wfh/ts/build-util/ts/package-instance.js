"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-classes-per-file */
const _ = __importStar(require("lodash"));
class PackageBrowserInstance {
    // compiler?: any;
    constructor(attrs) {
        if (!(this instanceof PackageBrowserInstance)) {
            return new PackageBrowserInstance(attrs);
        }
        if (attrs) {
            this.init(attrs);
        }
    }
    init(attrs) {
        _.assign(this, attrs);
        const parsedName = this.parsedName;
        if (parsedName) {
            this.shortName = parsedName.name;
            this.scopeName = parsedName.scope;
        }
    }
    toString() {
        return 'Package: ' + this.longName;
    }
}
exports.default = PackageBrowserInstance;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvcGFja2FnZS1pbnN0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5Q0FBeUM7QUFDekMsMENBQTRCO0FBRTVCLE1BQXFCLHNCQUFzQjtJQXVCekMsa0JBQWtCO0lBRWxCLFlBQVksS0FBNEU7UUFDdEYsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLHNCQUFzQixDQUFDLEVBQUU7WUFDN0MsT0FBTyxJQUFJLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzFDO1FBQ0QsSUFBSSxLQUFLLEVBQUU7WUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2xCO0lBQ0gsQ0FBQztJQUNELElBQUksQ0FBQyxLQUE0RTtRQUMvRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ25DLElBQUksVUFBVSxFQUFFO1lBQ2QsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztTQUNuQztJQUNILENBQUM7SUFDRCxRQUFRO1FBQ04sT0FBTyxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUNyQyxDQUFDO0NBQ0Y7QUE1Q0QseUNBNENDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB7XG4gIC8vIGJ1bmRsZTogc3RyaW5nO1xuICBsb25nTmFtZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIC8vIGZpbGU/OiBzdHJpbmc7XG4gIHBhcnNlZE5hbWU6IHtzY29wZT86IHN0cmluZywgbmFtZTogc3RyaW5nfTtcbiAgc2NvcGVOYW1lPzogc3RyaW5nO1xuICAvLyBlbnRyeVBhZ2VzPzogc3RyaW5nW107XG4gIGkxOG46IHN0cmluZztcbiAgcGFja2FnZVBhdGg6IHN0cmluZztcbiAgcmVhbFBhY2thZ2VQYXRoOiBzdHJpbmc7XG4gIC8vIG1haW46IHN0cmluZztcbiAgLy8gc3R5bGU/OiBzdHJpbmcgfCBudWxsO1xuICAvLyBlbnRyeVZpZXdzPzogc3RyaW5nW107XG4gIGJyb3dzZXJpZnlOb1BhcnNlPzogYW55W107XG4gIC8vIGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZTogYm9vbGVhbjtcbiAgdHJhbnNsYXRhYmxlOiBzdHJpbmc7XG4gIGRyOiBhbnk7XG4gIGpzb246IGFueTtcbiAgLy8gYnJvd3Nlcjogc3RyaW5nO1xuICBpc1ZlbmRvcjogYm9vbGVhbjtcbiAgYXBwVHlwZTogc3RyaW5nO1xuICAvLyBjb21waWxlcj86IGFueTtcblxuICBjb25zdHJ1Y3RvcihhdHRyczoge1trZXkgaW4ga2V5b2YgUGFja2FnZUJyb3dzZXJJbnN0YW5jZV0/OiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW2tleV19KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBhY2thZ2VCcm93c2VySW5zdGFuY2UpKSB7XG4gICAgICByZXR1cm4gbmV3IFBhY2thZ2VCcm93c2VySW5zdGFuY2UoYXR0cnMpO1xuICAgIH1cbiAgICBpZiAoYXR0cnMpIHtcbiAgICAgIHRoaXMuaW5pdChhdHRycyk7XG4gICAgfVxuICB9XG4gIGluaXQoYXR0cnM6IHtba2V5IGluIGtleW9mIFBhY2thZ2VCcm93c2VySW5zdGFuY2VdPzogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtrZXldfSkge1xuICAgIF8uYXNzaWduKHRoaXMsIGF0dHJzKTtcbiAgICBjb25zdCBwYXJzZWROYW1lID0gdGhpcy5wYXJzZWROYW1lO1xuICAgIGlmIChwYXJzZWROYW1lKSB7XG4gICAgICB0aGlzLnNob3J0TmFtZSA9IHBhcnNlZE5hbWUubmFtZTtcbiAgICAgIHRoaXMuc2NvcGVOYW1lID0gcGFyc2VkTmFtZS5zY29wZTtcbiAgICB9XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdQYWNrYWdlOiAnICsgdGhpcy5sb25nTmFtZTtcbiAgfVxufVxuXG5cblxuIl19