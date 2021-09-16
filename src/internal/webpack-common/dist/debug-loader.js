"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
const loader = function (source, sourceMap) {
    const file = this.resourcePath;
    // const opts = this.query as Options;
    log.warn('debug loader', file, /\bnode_modules\b/.test(file) ? '' : '\n' + source);
    const cb = this.async();
    cb(null, source, sourceMap);
};
exports.default = loader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGVidWctbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esc0NBQW9DO0FBRXBDLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUtqQyxNQUFNLE1BQU0sR0FBcUIsVUFBUyxNQUFNLEVBQUUsU0FBUztJQUN6RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQy9CLHNDQUFzQztJQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQztJQUNuRixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsRUFBRyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgd3AgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge2xvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmV4cG9ydCB0eXBlIE9wdGlvbnMgPSB7XG59O1xuXG5jb25zdCBsb2FkZXI6IHdwLmxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2UsIHNvdXJjZU1hcCkge1xuICBjb25zdCBmaWxlID0gdGhpcy5yZXNvdXJjZVBhdGg7XG4gIC8vIGNvbnN0IG9wdHMgPSB0aGlzLnF1ZXJ5IGFzIE9wdGlvbnM7XG4gIGxvZy53YXJuKCdkZWJ1ZyBsb2FkZXInLCBmaWxlLCAvXFxibm9kZV9tb2R1bGVzXFxiLy50ZXN0KGZpbGUpID8gJycgOiAnXFxuJyArIHNvdXJjZSk7XG4gIGNvbnN0IGNiID0gdGhpcy5hc3luYygpO1xuICBjYiEobnVsbCwgc291cmNlLCBzb3VyY2VNYXApO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgbG9hZGVyO1xuIl19