"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("../../ng/node-inject");
const build_angular_1 = require("@angular-devkit/build-angular");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const architect_1 = require("@angular-devkit/architect");
const drcpCommon = tslib_1.__importStar(require("../../ng/common"));
const change_cli_options_1 = require("../../ng/change-cli-options");
exports.default = architect_1.createBuilder((options, context) => {
    return rxjs_1.from(drcpCommon.initCli(options))
        .pipe(operators_1.concatMap(config => {
        return rxjs_1.from(change_cli_options_1.changeAngularCliOptionsForBuild(config, options));
    }), operators_1.concatMap(options => {
        return build_angular_1.executeBrowserBuilder(options, context, {
            webpackConfiguration: (config) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                // console.log(config);
                return config;
            })
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0NBQThCO0FBQzlCLGlFQUFvRTtBQUdwRSwrQkFBMEI7QUFDMUIsOENBQXlDO0FBQ3pDLHlEQUVtQztBQUNuQyxvRUFBOEM7QUFDOUMsb0VBQTRFO0FBRzVFLGtCQUFlLHlCQUFhLENBQzNCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ3BCLE9BQU8sV0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDdkMsSUFBSSxDQUNKLHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDbEIsT0FBTyxXQUFJLENBQUMsb0RBQStCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDL0QsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNuQixPQUFPLHFDQUFxQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUU7WUFDOUMsb0JBQW9CLEVBQUUsQ0FBTyxNQUFNLEVBQUUsRUFBRTtnQkFDdEMsdUJBQXVCO2dCQUN2QixPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUMsQ0FBQTtTQUNELENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUNGLENBQUM7QUFDSCxDQUFDLENBQ0QsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9idWlsZC1hbmd1bGFyL2Jyb3dzZXIvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uLy4uL25nL25vZGUtaW5qZWN0JztcbmltcG9ydCB7ZXhlY3V0ZUJyb3dzZXJCdWlsZGVyfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHtqc29ufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge2Zyb219IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjb25jYXRNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7XG4gIGNyZWF0ZUJ1aWxkZXJcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgKiBhcyBkcmNwQ29tbW9uIGZyb20gJy4uLy4uL25nL2NvbW1vbic7XG5pbXBvcnQge2NoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGR9IGZyb20gJy4uLy4uL25nL2NoYW5nZS1jbGktb3B0aW9ucyc7XG5cblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQnVpbGRlcjxqc29uLkpzb25PYmplY3QgJiBCcm93c2VyQnVpbGRlclNjaGVtYT4oXG5cdChvcHRpb25zLCBjb250ZXh0KSA9PiB7XG5cdFx0cmV0dXJuIGZyb20oZHJjcENvbW1vbi5pbml0Q2xpKG9wdGlvbnMpKVxuXHRcdC5waXBlKFxuXHRcdFx0Y29uY2F0TWFwKGNvbmZpZyA9PiB7XG5cdFx0XHRcdHJldHVybiBmcm9tKGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGQoY29uZmlnLCBvcHRpb25zKSk7XG5cdFx0XHR9KSxcblx0XHRcdGNvbmNhdE1hcChvcHRpb25zID0+IHtcblx0XHRcdFx0cmV0dXJuIGV4ZWN1dGVCcm93c2VyQnVpbGRlcihvcHRpb25zLCBjb250ZXh0LCB7XG5cdFx0XHRcdFx0d2VicGFja0NvbmZpZ3VyYXRpb246IGFzeW5jIChjb25maWcpID0+IHtcblx0XHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKGNvbmZpZyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gY29uZmlnO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9KVxuXHRcdCk7XG5cdH1cbik7XG4iXX0=
