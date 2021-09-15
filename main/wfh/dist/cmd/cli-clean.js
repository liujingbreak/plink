"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cliExt = (program) => {
    program.command('upgrade [package...]')
        .description('Hellow command description')
        .option('-f, --file <spec>', 'run single file')
        .action(async (packages) => {
        // TODO
    });
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNsZWFuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1jbGVhbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUM7U0FDdEMsV0FBVyxDQUFDLDRCQUE0QixDQUFDO1NBQ3pDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQztTQUM5QyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQWtCLEVBQUUsRUFBRTtRQUNuQyxPQUFPO0lBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbn0gZnJvbSAnLi4vaW5kZXgnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIHByb2dyYW0uY29tbWFuZCgndXBncmFkZSBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ0hlbGxvdyBjb21tYW5kIGRlc2NyaXB0aW9uJylcbiAgLm9wdGlvbignLWYsIC0tZmlsZSA8c3BlYz4nLCAncnVuIHNpbmdsZSBmaWxlJylcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgLy8gVE9ET1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==