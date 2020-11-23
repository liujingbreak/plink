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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5zdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQXlDO0FBQ3pDLDBDQUE0QjtBQUU1QixNQUFxQixzQkFBc0I7SUF1QnpDLGtCQUFrQjtJQUVsQixZQUFZLEtBQTRFO1FBQ3RGLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxzQkFBc0IsQ0FBQyxFQUFFO1lBQzdDLE9BQU8sSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMxQztRQUNELElBQUksS0FBSyxFQUFFO1lBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNsQjtJQUNILENBQUM7SUFDRCxJQUFJLENBQUMsS0FBNEU7UUFDL0UsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNuQyxJQUFJLFVBQVUsRUFBRTtZQUNkLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7U0FDbkM7SUFDSCxDQUFDO0lBQ0QsUUFBUTtRQUNOLE9BQU8sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDckMsQ0FBQztDQUNGO0FBNUNELHlDQTRDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhY2thZ2VCcm93c2VySW5zdGFuY2Uge1xuICAvLyBidW5kbGU6IHN0cmluZztcbiAgbG9uZ05hbWU6IHN0cmluZztcbiAgc2hvcnROYW1lOiBzdHJpbmc7XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICAvLyBmaWxlPzogc3RyaW5nO1xuICBwYXJzZWROYW1lOiB7c2NvcGU/OiBzdHJpbmcsIG5hbWU6IHN0cmluZ307XG4gIHNjb3BlTmFtZT86IHN0cmluZztcbiAgLy8gZW50cnlQYWdlcz86IHN0cmluZ1tdO1xuICBpMThuOiBzdHJpbmc7XG4gIHBhY2thZ2VQYXRoOiBzdHJpbmc7XG4gIHJlYWxQYWNrYWdlUGF0aDogc3RyaW5nO1xuICAvLyBtYWluOiBzdHJpbmc7XG4gIC8vIHN0eWxlPzogc3RyaW5nIHwgbnVsbDtcbiAgLy8gZW50cnlWaWV3cz86IHN0cmluZ1tdO1xuICBicm93c2VyaWZ5Tm9QYXJzZT86IGFueVtdO1xuICAvLyBpc0VudHJ5U2VydmVyVGVtcGxhdGU6IGJvb2xlYW47XG4gIHRyYW5zbGF0YWJsZTogc3RyaW5nO1xuICBkcjogYW55O1xuICBqc29uOiBhbnk7XG4gIC8vIGJyb3dzZXI6IHN0cmluZztcbiAgaXNWZW5kb3I6IGJvb2xlYW47XG4gIGFwcFR5cGU6IHN0cmluZztcbiAgLy8gY29tcGlsZXI/OiBhbnk7XG5cbiAgY29uc3RydWN0b3IoYXR0cnM6IHtba2V5IGluIGtleW9mIFBhY2thZ2VCcm93c2VySW5zdGFuY2VdPzogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtrZXldfSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKSkge1xuICAgICAgcmV0dXJuIG5ldyBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKGF0dHJzKTtcbiAgICB9XG4gICAgaWYgKGF0dHJzKSB7XG4gICAgICB0aGlzLmluaXQoYXR0cnMpO1xuICAgIH1cbiAgfVxuICBpbml0KGF0dHJzOiB7W2tleSBpbiBrZXlvZiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlXT86IFBhY2thZ2VCcm93c2VySW5zdGFuY2Vba2V5XX0pIHtcbiAgICBfLmFzc2lnbih0aGlzLCBhdHRycyk7XG4gICAgY29uc3QgcGFyc2VkTmFtZSA9IHRoaXMucGFyc2VkTmFtZTtcbiAgICBpZiAocGFyc2VkTmFtZSkge1xuICAgICAgdGhpcy5zaG9ydE5hbWUgPSBwYXJzZWROYW1lLm5hbWU7XG4gICAgICB0aGlzLnNjb3BlTmFtZSA9IHBhcnNlZE5hbWUuc2NvcGU7XG4gICAgfVxuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiAnUGFja2FnZTogJyArIHRoaXMubG9uZ05hbWU7XG4gIH1cbn1cblxuXG5cbiJdfQ==