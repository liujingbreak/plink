"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drcp_cmd_1 = require("../drcp-cmd");
describe('drcp-cmd', () => {
    it('parseNpmPackOutput', () => {
        const map = drcp_cmd_1.parseNpmPackOutput(`
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWRTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvc3BlYy9kcmNwLWNtZFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwwQ0FBK0M7QUFFL0MsUUFBUSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7SUFDeEIsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUM1QixNQUFNLEdBQUcsR0FBRyw2QkFBa0IsQ0FBQzs7Ozs7Ozs7OztXQVV4QixDQUFDLENBQUM7UUFDVCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQ2pFLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlTnBtUGFja091dHB1dH0gZnJvbSAnLi4vZHJjcC1jbWQnO1xuXG5kZXNjcmliZSgnZHJjcC1jbWQnLCAoKSA9PiB7XG4gIGl0KCdwYXJzZU5wbVBhY2tPdXRwdXQnLCAoKSA9PiB7XG4gICAgY29uc3QgbWFwID0gcGFyc2VOcG1QYWNrT3V0cHV0KGBcbm5wbSBub3RpY2UgPT09IFRhcmJhbGwgRGV0YWlscyA9PT0gXG5ucG0gbm90aWNlIG5hbWU6ICAgICAgICAgIHJlcXVpcmUtaW5qZWN0b3IgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgdmVyc2lvbjogICAgICAgNS4xLjUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBmaWxlbmFtZTogICAgICByZXF1aXJlLWluamVjdG9yLTUuMS41LnRneiAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHBhY2thZ2Ugc2l6ZTogIDU2Ljkga0IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgdW5wYWNrZWQgc2l6ZTogMjI5LjEga0IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBzaGFzdW06ICAgICAgICBjMDY5MzI3MGMxNDBmNjVhNjk2MjA3YWI5ZGViMThlNjQ0NTJhMDJjXG5ucG0gbm90aWNlIGludGVncml0eTogICAgIHNoYTUxMi1rUkdWV2N3MWZ2UTVKWy4uLl1BQndMUFU4VXZTdGJBPT1cbm5wbSBub3RpY2UgdG90YWwgZmlsZXM6ICAgNDcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZWApO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKG1hcCk7XG4gICAgZXhwZWN0KG1hcC5nZXQoJ2ZpbGVuYW1lJykpLnRvQmUoJ3JlcXVpcmUtaW5qZWN0b3ItNS4xLjUudGd6Jyk7XG4gIH0pO1xufSk7XG4iXX0=