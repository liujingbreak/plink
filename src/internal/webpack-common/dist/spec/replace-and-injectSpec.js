"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const replace_and_inject_1 = __importDefault(require("../../ts/tsjs/replace-and-inject"));
const require_injector_1 = __importDefault(require("require-injector"));
const path_1 = __importDefault(require("path"));
describe('replace-and-inject', () => {
    it('replace', () => {
        const rj = new require_injector_1.default({ noNode: true });
        const tsconfig = path_1.default.resolve(require.resolve('@wfh/plink/package.json'), '../wfh/tsconfig-base.json');
        // tslint:disable-next-line
        console.log('tsconfig file', tsconfig);
        rj.fromDir(__dirname).alias('lodash', 'NOTHING_BUT_LONG');
        const rs = replace_and_inject_1.default(path_1.default.resolve(__dirname, 'mock.ts'), mockFileContent, rj, tsconfig, {
            __context: {
                foobar() { return 'REPLACED'; }
            }
        });
        // tslint:disable-next-line
        console.log(rs);
    });
});
const mockFileContent = 'import _ from \'lodash\';__context.foobar();';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1hbmQtaW5qZWN0U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlcGxhY2UtYW5kLWluamVjdFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwRkFBZ0U7QUFDaEUsd0VBQWtDO0FBQ2xDLGdEQUF3QjtBQUV4QixRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sRUFBRSxHQUFHLElBQUksMEJBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDdkcsMkJBQTJCO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzFELE1BQU0sRUFBRSxHQUFHLDRCQUFnQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQ25GLFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRTtnQkFDVCxNQUFNLEtBQUssT0FBTyxVQUFVLENBQUMsQ0FBQSxDQUFDO2FBQy9CO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsMkJBQTJCO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILE1BQU0sZUFBZSxHQUFHLDhDQUE4QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHJlcGxhY2VBbmRJbmplY3QgZnJvbSAnLi4vLi4vdHMvdHNqcy9yZXBsYWNlLWFuZC1pbmplY3QnO1xuaW1wb3J0IFJKIGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmRlc2NyaWJlKCdyZXBsYWNlLWFuZC1pbmplY3QnLCAoKSA9PiB7XG4gIGl0KCdyZXBsYWNlJywgKCkgPT4ge1xuICAgIGNvbnN0IHJqID0gbmV3IFJKKHtub05vZGU6IHRydWV9KTtcbiAgICBjb25zdCB0c2NvbmZpZyA9IFBhdGgucmVzb2x2ZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJyksICcuLi93ZmgvdHNjb25maWctYmFzZS5qc29uJyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG4gICAgY29uc29sZS5sb2coJ3RzY29uZmlnIGZpbGUnLCB0c2NvbmZpZyk7XG4gICAgcmouZnJvbURpcihfX2Rpcm5hbWUpLmFsaWFzKCdsb2Rhc2gnLCAnTk9USElOR19CVVRfTE9ORycpO1xuICAgIGNvbnN0IHJzID0gcmVwbGFjZUFuZEluamVjdChQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbW9jay50cycpLCBtb2NrRmlsZUNvbnRlbnQsIHJqLFxuICAgIHRzY29uZmlnLCB7XG4gICAgICBfX2NvbnRleHQ6IHtcbiAgICAgICAgZm9vYmFyKCkgeyByZXR1cm4gJ1JFUExBQ0VEJzt9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG4gICAgY29uc29sZS5sb2cocnMpO1xuICB9KTtcbn0pO1xuXG5jb25zdCBtb2NrRmlsZUNvbnRlbnQgPSAnaW1wb3J0IF8gZnJvbSBcXCdsb2Rhc2hcXCc7X19jb250ZXh0LmZvb2JhcigpOyc7XG4iXX0=