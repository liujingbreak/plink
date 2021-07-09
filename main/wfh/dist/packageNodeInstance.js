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
        this.realPath = '';
        Object.assign(this, attrs);
    }
}
exports.default = Package;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZU5vZGVJbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhY2thZ2VOb2RlSW5zdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxNQUFxQixPQUFPO0lBVzFCLFlBQVksS0FBK0I7UUFWM0MsZUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNoQixjQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsU0FBSSxHQUFHLEVBQUUsQ0FBQztRQUNWLGFBQVEsR0FBRyxFQUFFLENBQUM7UUFDZCxVQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ1gsdUVBQXVFO1FBQ3ZFLFNBQUksR0FBRyxFQUFFLENBQUM7UUFFVixhQUFRLEdBQUcsRUFBRSxDQUFDO1FBR1osTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDN0IsQ0FBQztDQUNGO0FBZEQsMEJBY0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1BhY2thZ2VJbmZvfSBmcm9tICcuL3BhY2thZ2UtbWdyL2luZGV4JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFja2FnZSBpbXBsZW1lbnRzIE5vZGVQYWNrYWdlQXR0ciB7XG4gIG1vZHVsZU5hbWUgPSAnJztcbiAgc2hvcnROYW1lID0gJyc7XG4gIG5hbWUgPSAnJztcbiAgbG9uZ05hbWUgPSAnJztcbiAgc2NvcGUgPSAnJztcbiAgLyoqIElmIHRoaXMgcHJvcGVydHkgaXMgbm90IHNhbWUgYXMgXCJyZWFsUGF0aFwiLCB0aGVuIGl0IGlzIGEgc3ltbGluayAqL1xuICBwYXRoID0gJyc7XG4gIGpzb246IGFueTtcbiAgcmVhbFBhdGggPSAnJztcblxuICBjb25zdHJ1Y3RvcihhdHRyczogUGFydGlhbDxOb2RlUGFja2FnZUF0dHI+KSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBhdHRycyk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBOb2RlUGFja2FnZUF0dHIge1xuICBtb2R1bGVOYW1lOiBzdHJpbmc7XG4gIHNob3J0TmFtZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGxvbmdOYW1lOiBzdHJpbmc7XG4gIHNjb3BlOiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbiAganNvbjogUGFja2FnZUluZm9bJ2pzb24nXTtcbiAgcmVhbFBhdGg6IHN0cmluZztcbn1cbiJdfQ==