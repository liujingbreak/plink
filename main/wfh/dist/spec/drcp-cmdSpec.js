"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_pack_1 = require("../cmd/cli-pack");
describe('drcp-cmd', () => {
    it('parseNpmPackOutput', () => {
        const map = cli_pack_1.parseNpmPackOutput(`
npm notice === Tarball Details === 
npm notice name:          require-injector                        
npm notice version:       5.1.5                                   
npm notice filename:      require-injector-5.1.5.tgz              
npm notice package size:  56.9 kB                                 
npm notice unpacked size: 229.1 kB                                
npm notice shasum:        c0693270c140f65a696207ab9deb18e64452a02c
npm notice integrity:     sha512-kRGVWcw1fvQ5J[...]ABwLPU8UvStbA==
npm notice total files:   47                                      
npm notice`);
        // tslint:disable-next-line: no-console
        console.log(map);
        expect(map.get('filename')).toBe('require-injector-5.1.5.tgz');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWRTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvc3BlYy9kcmNwLWNtZFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw4Q0FBbUQ7QUFFbkQsUUFBUSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7SUFDeEIsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUM1QixNQUFNLEdBQUcsR0FBRyw2QkFBa0IsQ0FBQzs7Ozs7Ozs7OztXQVV4QixDQUFDLENBQUM7UUFDVCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQ2pFLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlTnBtUGFja091dHB1dH0gZnJvbSAnLi4vY21kL2NsaS1wYWNrJztcblxuZGVzY3JpYmUoJ2RyY3AtY21kJywgKCkgPT4ge1xuICBpdCgncGFyc2VOcG1QYWNrT3V0cHV0JywgKCkgPT4ge1xuICAgIGNvbnN0IG1hcCA9IHBhcnNlTnBtUGFja091dHB1dChgXG5ucG0gbm90aWNlID09PSBUYXJiYWxsIERldGFpbHMgPT09IFxubnBtIG5vdGljZSBuYW1lOiAgICAgICAgICByZXF1aXJlLWluamVjdG9yICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHZlcnNpb246ICAgICAgIDUuMS41ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgZmlsZW5hbWU6ICAgICAgcmVxdWlyZS1pbmplY3Rvci01LjEuNS50Z3ogICAgICAgICAgICAgIFxubnBtIG5vdGljZSBwYWNrYWdlIHNpemU6ICA1Ni45IGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHVucGFja2VkIHNpemU6IDIyOS4xIGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2Ugc2hhc3VtOiAgICAgICAgYzA2OTMyNzBjMTQwZjY1YTY5NjIwN2FiOWRlYjE4ZTY0NDUyYTAyY1xubnBtIG5vdGljZSBpbnRlZ3JpdHk6ICAgICBzaGE1MTIta1JHVldjdzFmdlE1SlsuLi5dQUJ3TFBVOFV2U3RiQT09XG5ucG0gbm90aWNlIHRvdGFsIGZpbGVzOiAgIDQ3ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2VgKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhtYXApO1xuICAgIGV4cGVjdChtYXAuZ2V0KCdmaWxlbmFtZScpKS50b0JlKCdyZXF1aXJlLWluamVjdG9yLTUuMS41LnRneicpO1xuICB9KTtcbn0pO1xuIl19