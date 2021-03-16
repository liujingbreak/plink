import {PlinkArchDiagram} from './PlinkArchDiagram';
import {dispatcher as blockDiagramDispatcher} from './blockDiagramSlice';

export const renderByMdKey: {[mdKey: string]: {[id: string]: (id: string, dom: Element) => React.ReactElement}} = {
  intro: {
    PlinkArchDiagram(id, dom) {
      return (<PlinkArchDiagram key={id} containerDom={dom}/>);
    }
  }
};

blockDiagramDispatcher.create(['plinkArch', [
  {title: 'Repo', type: 'layer'},

  {title: 'Plink', type: 'layer', children: [
    {title: '<b>Command line</b>', grow: 3, children: [
      {title: 'mono repo 开发环境支持', chrInHorizontal: true,
        children: [
        {title: 'Repo 连接命令'},
        {title: '依赖添加<br>安装命令'},
        {title: '编辑器友好', content: 'tsconfig paths配置自动更新'},
        {title: '源码包依赖管理', content: '3rd party 依赖版本一致性检查'}
      ]},
      {title: 'Web framework 构建工具 rewire', chrInHorizontal: true, children: [
        {title: 'create-react-app<br>扩展', content: '支持 monorepo, library 构建、 源文件替换, webpack定制'},
        {title: 'Angular 8 cli 扩展', content: '支持 monorepo, webpack定制'},
        {title: 'Prebuild', content: '多环境构建 artifact 包合并, <br>mono repo输出多应用 repo(image)'},
        {title: 'i18n 字符串模板扫描替换命令'}
      ]},
      {title: '源码模块信息可视化', chrInHorizontal: true, children: [
        {title: '包配置和<br>环境设置信息'},
        {title: '源码依<br>赖分析'}
      ]},
      {title: '模块包管理', chrInHorizontal: true,
        children:['批量发布', '批量本地 targz', '批量版本 bump']},
      {title: 'Utility', chrInHorizontal: true, children: [
        'Typescript AST 查询',
        'thread_worker /process pool',
        'Typescript compiler 配置和多包编译'
      ]}
    ]},
    {
      title: '<b>Client core</b>', grow: 0.7, chrInHorizontal: true,
      children: [
        {title: 'Redux-toolkit-observable',
          content: '基于Redux-toolkit， Redux-observable 状态管理器 封装'},
        {title: '纯 RxJS based 状态管理器', content: '应用于旧 Angular项目'}
      ]
    },
    {title: '<b>Server</b>', grow: 1.3, chrInHorizontal: true,  children: [
      {title: 'Snowplow 服务端', content: '客户端侦错数剧收集'},
      {title: 'Express 和扩展 API context', content: '基础 middleware, router 配置, 支持模块包扩展配置 route'},
      {title: '静态资源服务中间件模块', content: '客户端资源分环境响应, 基础响应头配置, Http API 代理'},
      {title: '日志 API', content: '支持 PM2 集群'},
      {title: '安转包和软连接运行管理'}
    ]}
  ]}
] ]);
