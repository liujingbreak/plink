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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZU5vZGVJbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhY2thZ2VOb2RlSW5zdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxNQUFxQixPQUFPO0lBVzFCLFlBQVksS0FBK0I7UUFWM0MsZUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNoQixjQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsU0FBSSxHQUFHLEVBQUUsQ0FBQztRQUNWLGFBQVEsR0FBRyxFQUFFLENBQUM7UUFDZCxVQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ1gsdUVBQXVFO1FBQ3ZFLFNBQUksR0FBRyxFQUFFLENBQUM7UUFDVixTQUFJLEdBQUcsRUFBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQXdCLENBQUM7UUFDdEQsYUFBUSxHQUFHLEVBQUUsQ0FBQztRQUdaLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdCLENBQUM7Q0FDRjtBQWRELDBCQWNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1nci9pbmRleCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhY2thZ2UgaW1wbGVtZW50cyBOb2RlUGFja2FnZUF0dHIge1xuICBtb2R1bGVOYW1lID0gJyc7XG4gIHNob3J0TmFtZSA9ICcnO1xuICBuYW1lID0gJyc7XG4gIGxvbmdOYW1lID0gJyc7XG4gIHNjb3BlID0gJyc7XG4gIC8qKiBJZiB0aGlzIHByb3BlcnR5IGlzIG5vdCBzYW1lIGFzIFwicmVhbFBhdGhcIiwgdGhlbiBpdCBpcyBhIHN5bWxpbmsgKi9cbiAgcGF0aCA9ICcnO1xuICBqc29uID0ge3ZlcnNpb246ICcnLCBuYW1lOiAnJ30gYXMgUGFja2FnZUluZm9bJ2pzb24nXTtcbiAgcmVhbFBhdGggPSAnJztcblxuICBjb25zdHJ1Y3RvcihhdHRyczogUGFydGlhbDxOb2RlUGFja2FnZUF0dHI+KSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBhdHRycyk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBOb2RlUGFja2FnZUF0dHIge1xuICBtb2R1bGVOYW1lOiBzdHJpbmc7XG4gIHNob3J0TmFtZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGxvbmdOYW1lOiBzdHJpbmc7XG4gIHNjb3BlOiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbiAganNvbjogUGFja2FnZUluZm9bJ2pzb24nXTtcbiAgcmVhbFBhdGg6IHN0cmluZztcbn1cbiJdfQ==