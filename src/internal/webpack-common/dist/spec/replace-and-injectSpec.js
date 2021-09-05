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
        // eslint-disable-next-line
        console.log('tsconfig file', tsconfig);
        rj.fromDir(__dirname).alias('lodash', 'NOTHING_BUT_LONG');
        const rs = (0, replace_and_inject_1.default)(path_1.default.resolve(__dirname, 'mock.ts'), mockFileContent, rj, tsconfig, {
            __context: {
                foobar() { return 'REPLACED'; }
            }
        });
        // eslint-disable-next-line
        console.log(rs);
    });
});
const mockFileContent = 'import _ from \'lodash\';__context.foobar();';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1hbmQtaW5qZWN0U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlcGxhY2UtYW5kLWluamVjdFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwRkFBZ0U7QUFDaEUsd0VBQWtDO0FBQ2xDLGdEQUF3QjtBQUV4QixRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sRUFBRSxHQUFHLElBQUksMEJBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDdkcsMkJBQTJCO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzFELE1BQU0sRUFBRSxHQUFHLElBQUEsNEJBQWdCLEVBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFDbkYsUUFBUSxFQUFFO1lBQ1IsU0FBUyxFQUFFO2dCQUNULE1BQU0sS0FBSyxPQUFPLFVBQVUsQ0FBQyxDQUFBLENBQUM7YUFDL0I7U0FDRixDQUFDLENBQUM7UUFDSCwyQkFBMkI7UUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxlQUFlLEdBQUcsOENBQThDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcmVwbGFjZUFuZEluamVjdCBmcm9tICcuLi8uLi90cy90c2pzL3JlcGxhY2UtYW5kLWluamVjdCc7XG5pbXBvcnQgUkogZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuZGVzY3JpYmUoJ3JlcGxhY2UtYW5kLWluamVjdCcsICgpID0+IHtcbiAgaXQoJ3JlcGxhY2UnLCAoKSA9PiB7XG4gICAgY29uc3QgcmogPSBuZXcgUkooe25vTm9kZTogdHJ1ZX0pO1xuICAgIGNvbnN0IHRzY29uZmlnID0gUGF0aC5yZXNvbHZlKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSwgJy4uL3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICBjb25zb2xlLmxvZygndHNjb25maWcgZmlsZScsIHRzY29uZmlnKTtcbiAgICByai5mcm9tRGlyKF9fZGlybmFtZSkuYWxpYXMoJ2xvZGFzaCcsICdOT1RISU5HX0JVVF9MT05HJyk7XG4gICAgY29uc3QgcnMgPSByZXBsYWNlQW5kSW5qZWN0KFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdtb2NrLnRzJyksIG1vY2tGaWxlQ29udGVudCwgcmosXG4gICAgdHNjb25maWcsIHtcbiAgICAgIF9fY29udGV4dDoge1xuICAgICAgICBmb29iYXIoKSB7IHJldHVybiAnUkVQTEFDRUQnO31cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICBjb25zb2xlLmxvZyhycyk7XG4gIH0pO1xufSk7XG5cbmNvbnN0IG1vY2tGaWxlQ29udGVudCA9ICdpbXBvcnQgXyBmcm9tIFxcJ2xvZGFzaFxcJztfX2NvbnRleHQuZm9vYmFyKCk7JztcbiJdfQ==