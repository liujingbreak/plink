"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceMap = void 0;
/**
 * The place to store Redux-toolkit unfriendly objects
 *
 * 1. When we design state structure, remember immerJS (depended by Redux-toolkt) does not perform well on
 * complicated object,
 * ideally we only put "data" in Redux store, including string, number, boolean, Map, Set, and array/object of them,
 * ImmerJS does recursively freezing and proxying job on them.
 *
 * So things which are not unfriendly to Redux store are: Complex(huge) Object, functions, DOM objects, browser window related objects,
 * framework's component object, Node.js object like Buffer, unknown 3rd-party library object...
 *
 * 2. Redux is framework agnostic, meaning it can be used cross different rendering system. If we want to reuse some pieces
 * of Redux logic, these pieces should not contain any framework or renderring system related object in state's structure.
 *
 * In these cases, this "resource-store" is designed to keep those Redux unfriendly things.
 *
 * The save() function returns a primary type "ResourceKey", which can be safely saved in Redux-toolkit store as a key maps to
 * actual resource object.
 * Use the Ref to get or release/delete actual resource object.
 *
 * It is basically implemented with a Map, and with a Generic Type information for each item inside it.
 */
var ResourceMap = /** @class */ (function () {
    function ResourceMap() {
        // Ideally, it should be a WeakMap instead
        this.dataMap = {};
    }
    ResourceMap.prototype.set = function (reference, object) {
        if (reference)
            this.delete(reference);
        return this.add(object);
    };
    ResourceMap.prototype.add = function (object) {
        var key = '' + ResourceMap.REF_SEED++;
        this.dataMap[key] = object;
        return key;
    };
    ResourceMap.prototype.get = function (reference) {
        return this.dataMap[reference];
    };
    ResourceMap.prototype.delete = function (reference) {
        var o = this.dataMap[reference];
        if (this.dataMap.hasOwnProperty(reference) && o !== undefined)
            this.dataMap[reference] = undefined;
        return o;
    };
    ResourceMap.REF_SEED = 0;
    return ResourceMap;
}());
exports.ResourceMap = ResourceMap;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2UtbWFwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vcmVzb3VyY2UtbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUlBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxQkc7QUFDSDtJQUFBO1FBR0UsMENBQTBDO1FBQzFDLFlBQU8sR0FBeUIsRUFBRSxDQUFDO0lBd0JyQyxDQUFDO0lBdEJDLHlCQUFHLEdBQUgsVUFBTyxTQUE0QyxFQUFFLE1BQVM7UUFDNUQsSUFBSSxTQUFTO1lBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN6QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELHlCQUFHLEdBQUgsVUFBTyxNQUFTO1FBQ2QsSUFBTSxHQUFHLEdBQUcsRUFBRSxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUMzQixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCx5QkFBRyxHQUFILFVBQU8sU0FBeUQ7UUFDOUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQW1CLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsNEJBQU0sR0FBTixVQUFVLFNBQXlEO1FBQ2pFLElBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBbUIsQ0FBQyxDQUFDO1FBQzVDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsU0FBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTO1lBQ3JFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBbUIsQ0FBQyxHQUFHLFNBQVMsQ0FBQztRQUNoRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUExQmMsb0JBQVEsR0FBRyxDQUFDLENBQUM7SUEyQjlCLGtCQUFDO0NBQUEsQUE1QkQsSUE0QkM7QUE1Qlksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7V3JpdGFibGVEcmFmdH0gZnJvbSAnaW1tZXIvZGlzdC9pbnRlcm5hbCc7XG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWVtcHR5LWludGVyZmFjZVxuZXhwb3J0IGludGVyZmFjZSBSZXNvdXJjZUtleTxUPiB7fVxuLyoqXG4gKiBUaGUgcGxhY2UgdG8gc3RvcmUgUmVkdXgtdG9vbGtpdCB1bmZyaWVuZGx5IG9iamVjdHNcbiAqIFxuICogMS4gV2hlbiB3ZSBkZXNpZ24gc3RhdGUgc3RydWN0dXJlLCByZW1lbWJlciBpbW1lckpTIChkZXBlbmRlZCBieSBSZWR1eC10b29sa3QpIGRvZXMgbm90IHBlcmZvcm0gd2VsbCBvblxuICogY29tcGxpY2F0ZWQgb2JqZWN0LFxuICogaWRlYWxseSB3ZSBvbmx5IHB1dCBcImRhdGFcIiBpbiBSZWR1eCBzdG9yZSwgaW5jbHVkaW5nIHN0cmluZywgbnVtYmVyLCBib29sZWFuLCBNYXAsIFNldCwgYW5kIGFycmF5L29iamVjdCBvZiB0aGVtLFxuICogSW1tZXJKUyBkb2VzIHJlY3Vyc2l2ZWx5IGZyZWV6aW5nIGFuZCBwcm94eWluZyBqb2Igb24gdGhlbS5cbiAqIFxuICogU28gdGhpbmdzIHdoaWNoIGFyZSBub3QgdW5mcmllbmRseSB0byBSZWR1eCBzdG9yZSBhcmU6IENvbXBsZXgoaHVnZSkgT2JqZWN0LCBmdW5jdGlvbnMsIERPTSBvYmplY3RzLCBicm93c2VyIHdpbmRvdyByZWxhdGVkIG9iamVjdHMsXG4gKiBmcmFtZXdvcmsncyBjb21wb25lbnQgb2JqZWN0LCBOb2RlLmpzIG9iamVjdCBsaWtlIEJ1ZmZlciwgdW5rbm93biAzcmQtcGFydHkgbGlicmFyeSBvYmplY3QuLi5cbiAqIFxuICogMi4gUmVkdXggaXMgZnJhbWV3b3JrIGFnbm9zdGljLCBtZWFuaW5nIGl0IGNhbiBiZSB1c2VkIGNyb3NzIGRpZmZlcmVudCByZW5kZXJpbmcgc3lzdGVtLiBJZiB3ZSB3YW50IHRvIHJldXNlIHNvbWUgcGllY2VzXG4gKiBvZiBSZWR1eCBsb2dpYywgdGhlc2UgcGllY2VzIHNob3VsZCBub3QgY29udGFpbiBhbnkgZnJhbWV3b3JrIG9yIHJlbmRlcnJpbmcgc3lzdGVtIHJlbGF0ZWQgb2JqZWN0IGluIHN0YXRlJ3Mgc3RydWN0dXJlLlxuICogXG4gKiBJbiB0aGVzZSBjYXNlcywgdGhpcyBcInJlc291cmNlLXN0b3JlXCIgaXMgZGVzaWduZWQgdG8ga2VlcCB0aG9zZSBSZWR1eCB1bmZyaWVuZGx5IHRoaW5ncy5cbiAqIFxuICogVGhlIHNhdmUoKSBmdW5jdGlvbiByZXR1cm5zIGEgcHJpbWFyeSB0eXBlIFwiUmVzb3VyY2VLZXlcIiwgd2hpY2ggY2FuIGJlIHNhZmVseSBzYXZlZCBpbiBSZWR1eC10b29sa2l0IHN0b3JlIGFzIGEga2V5IG1hcHMgdG9cbiAqIGFjdHVhbCByZXNvdXJjZSBvYmplY3QuXG4gKiBVc2UgdGhlIFJlZiB0byBnZXQgb3IgcmVsZWFzZS9kZWxldGUgYWN0dWFsIHJlc291cmNlIG9iamVjdC5cbiAqIFxuICogSXQgaXMgYmFzaWNhbGx5IGltcGxlbWVudGVkIHdpdGggYSBNYXAsIGFuZCB3aXRoIGEgR2VuZXJpYyBUeXBlIGluZm9ybWF0aW9uIGZvciBlYWNoIGl0ZW0gaW5zaWRlIGl0LlxuICovXG5leHBvcnQgY2xhc3MgUmVzb3VyY2VNYXAge1xuICBwcml2YXRlIHN0YXRpYyBSRUZfU0VFRCA9IDA7XG5cbiAgLy8gSWRlYWxseSwgaXQgc2hvdWxkIGJlIGEgV2Vha01hcCBpbnN0ZWFkXG4gIGRhdGFNYXA6IHtba2V5OiBzdHJpbmddOiBhbnl9ID0ge307XG5cbiAgc2V0PFQ+KHJlZmVyZW5jZTogUmVzb3VyY2VLZXk8VD4gfCBudWxsIHwgdW5kZWZpbmVkLCBvYmplY3Q6IFQpOiBSZXNvdXJjZUtleTxUPiB7XG4gICAgaWYgKHJlZmVyZW5jZSlcbiAgICAgIHRoaXMuZGVsZXRlKHJlZmVyZW5jZSk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG9iamVjdCk7XG4gIH1cblxuICBhZGQ8VD4ob2JqZWN0OiBUKTogUmVzb3VyY2VLZXk8VD4ge1xuICAgIGNvbnN0IGtleSA9ICcnICsgUmVzb3VyY2VNYXAuUkVGX1NFRUQrKztcbiAgICB0aGlzLmRhdGFNYXBba2V5XSA9IG9iamVjdDtcbiAgICByZXR1cm4ga2V5O1xuICB9XG5cbiAgZ2V0PFQ+KHJlZmVyZW5jZTogUmVzb3VyY2VLZXk8VD4gfCBXcml0YWJsZURyYWZ0PFJlc291cmNlS2V5PFQ+Pik6IFQge1xuICAgIHJldHVybiB0aGlzLmRhdGFNYXBbcmVmZXJlbmNlIGFzIHN0cmluZ107XG4gIH1cblxuICBkZWxldGU8VD4ocmVmZXJlbmNlOiBSZXNvdXJjZUtleTxUPiB8IFdyaXRhYmxlRHJhZnQ8UmVzb3VyY2VLZXk8VD4+KTogVCB7XG4gICAgY29uc3QgbyA9IHRoaXMuZGF0YU1hcFtyZWZlcmVuY2UgYXMgc3RyaW5nXTtcbiAgICBpZiAodGhpcy5kYXRhTWFwLmhhc093blByb3BlcnR5KHJlZmVyZW5jZSBhcyBzdHJpbmcpICYmIG8gIT09IHVuZGVmaW5lZClcbiAgICAgIHRoaXMuZGF0YU1hcFtyZWZlcmVuY2UgYXMgc3RyaW5nXSA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gbztcbiAgfVxufVxuIl19