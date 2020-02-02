"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-classes-per-file */
const _ = __importStar(require("lodash"));
class PackageBrowserInstance {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvcGFja2FnZS1pbnN0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSx5Q0FBeUM7QUFDekMsMENBQTRCO0FBRTVCLE1BQXFCLHNCQUFzQjtJQXdCekMsWUFBWSxLQUFVO1FBQ3BCLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxzQkFBc0IsQ0FBQyxFQUFFO1lBQzdDLE9BQU8sSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMxQztRQUNELElBQUksS0FBSyxFQUFFO1lBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNsQjtJQUNILENBQUM7SUFDRCxJQUFJLENBQUMsS0FBNEU7UUFDL0UsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNuQyxJQUFJLFVBQVUsRUFBRTtZQUNkLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7U0FDbkM7SUFDSCxDQUFDO0lBQ0QsUUFBUTtRQUNOLE9BQU8sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDckMsQ0FBQztDQUNGO0FBM0NELHlDQTJDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhY2thZ2VCcm93c2VySW5zdGFuY2Uge1xuICBidW5kbGU6IHN0cmluZztcbiAgbG9uZ05hbWU6IHN0cmluZztcbiAgc2hvcnROYW1lOiBzdHJpbmc7XG4gIGZpbGU/OiBzdHJpbmc7XG4gIHBhcnNlZE5hbWU6IHtzY29wZT86IHN0cmluZywgbmFtZTogc3RyaW5nfTtcbiAgc2NvcGVOYW1lPzogc3RyaW5nO1xuICBlbnRyeVBhZ2VzPzogc3RyaW5nW107XG4gIGkxOG46IHN0cmluZztcbiAgcGFja2FnZVBhdGg6IHN0cmluZztcbiAgcmVhbFBhY2thZ2VQYXRoOiBzdHJpbmc7XG4gIG1haW46IHN0cmluZztcbiAgc3R5bGU/OiBzdHJpbmcgfCBudWxsO1xuICBlbnRyeVZpZXdzPzogc3RyaW5nW107XG4gIGJyb3dzZXJpZnlOb1BhcnNlPzogYW55W107XG4gIGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZTogYm9vbGVhbjtcbiAgdHJhbnNsYXRhYmxlOiBzdHJpbmc7XG4gIGRyOiBhbnk7XG4gIGpzb246IGFueTtcbiAgYnJvd3Nlcjogc3RyaW5nO1xuICBpc1ZlbmRvcjogYm9vbGVhbjtcbiAgYXBwVHlwZTogc3RyaW5nO1xuICBjb21waWxlcj86IGFueTtcblxuICBjb25zdHJ1Y3RvcihhdHRyczogYW55KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBhY2thZ2VCcm93c2VySW5zdGFuY2UpKSB7XG4gICAgICByZXR1cm4gbmV3IFBhY2thZ2VCcm93c2VySW5zdGFuY2UoYXR0cnMpO1xuICAgIH1cbiAgICBpZiAoYXR0cnMpIHtcbiAgICAgIHRoaXMuaW5pdChhdHRycyk7XG4gICAgfVxuICB9XG4gIGluaXQoYXR0cnM6IHtba2V5IGluIGtleW9mIFBhY2thZ2VCcm93c2VySW5zdGFuY2VdPzogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtrZXldfSkge1xuICAgIF8uYXNzaWduKHRoaXMsIGF0dHJzKTtcbiAgICBjb25zdCBwYXJzZWROYW1lID0gdGhpcy5wYXJzZWROYW1lO1xuICAgIGlmIChwYXJzZWROYW1lKSB7XG4gICAgICB0aGlzLnNob3J0TmFtZSA9IHBhcnNlZE5hbWUubmFtZTtcbiAgICAgIHRoaXMuc2NvcGVOYW1lID0gcGFyc2VkTmFtZS5zY29wZTtcbiAgICB9XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdQYWNrYWdlOiAnICsgdGhpcy5sb25nTmFtZTtcbiAgfVxufVxuXG5cblxuIl19