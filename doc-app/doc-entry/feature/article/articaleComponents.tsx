import {PlinkArchDiagram} from './PlinkArchDiagram';
import {dispatcher as blockDiagramDispatcher} from './blockDiagramSlice';

export const renderByMdKey: {[mdKey: string]: {[id: string]: (id: string, dom: Element, dataKey: string) => React.ReactNode}} = {
  intro: {
    PlinkArchDiagram(id, dom, dataKey) {
      return (<PlinkArchDiagram key={id + ',' + dataKey} containerDom={dom} dataKey={dataKey} />);
    }
  }
};

blockDiagramDispatcher.create(['plinkArchDiagram', [
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
        {title: 'i18n', content: '源码字符串扫描替换命令 *'}
      ]},
      {title: '源码模块信息可视化', chrInHorizontal: true, children: [
        {title: '包配置和<br>环境设置信息'},
        {title: '源码依赖分析'}
      ]},
      {title: '模块包管理', chrInHorizontal: true,
        children:['批量发布', '批量本地 targz', '批量版本 bump']},
      {title: 'Utility', chrInHorizontal: true, children: [
        'Typescript AST 查询',
        'thread_worker /process pool',
        'Typescript compiler 配置和多包编译',
        'React组件，Redux slice，node 包初始文件生成命令',
        'JSON schema, 生成命令',
        '包内配置文件，workspace配置文件 生成命令',
        'Swagger API doc 生成 Typescript类型命令'
      ]}
    ]},
    {
      title: '<b>Client core</b>', grow: 0.7, chrInHorizontal: true,
      children: [
        {title: 'Redux-toolkit-observable',
          content: '基于Redux-toolkit， Redux-observable 状态管理器封装, Redux 处理 middleware 等'},
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

blockDiagramDispatcher.create(['businessAppDiagram', [
  {title: '信贷 monorepo creditappfrontend', type: 'layer', children: [
    {title: 'workspace', chrInHorizontal: true, children: [
      'React 项目构建空间', 'Angular 项目构建空间', 'Node.js 应用运行空间']},
    {title: '本地源码包(目录)', grow:4, children: [
      {title: '各产品的route模块和业务页面', chrInHorizontal: true,
      children: [
        {title: '控台业务模块包目录'},
        {title: 'H5 业务模块包目录'}
      ]},
      {title: 'common UI 包和基础业务功能', chrInHorizontal: true, grow: 3, children: [
        '基础导航栏组件', '基础 index HTML和 H5 布局组件', '基础动效组件',
        'API 响应拦截和异常提示',
        '控台入口页面组件', '停机公告, 城市选择, 四要素实名, 帮助中心，协议合同查看, 发短信等组件','调试彩蛋', 'web view后退管理', '钱包 BKlib mock', 'Snowplow 侦错和风控用户行为采集'
      ]}
    ]},
    {title: '各个产品构建和运行配置文件目录', grow: 0.5},
    {title: 'Server模块', chrInHorizontal:true, children: ['可视化首页微信 API 聚合', '服务端渲染', '可视化，潜客包 API代理']},
    {title: '关联其他项目安装包 targz 文件目录', chrInHorizontal: true, children: [
      '寻龙贝分期控台项目安装包', 'Plink 工具模块包'
    ]}
  ]},
  {title: '包含产品', type: 'layer', children: [
    '贝用金H5及控台','可视化H5', '潜客包H5','家家支付信贷入口 H5', '收租贝控台','老贝分期H5和控台', '月付贝控台']}
] ]);
