webpack 热更新原理

![图片链接](https://ws3.sinaimg.cn/large/005BYqpggy1g3zq5cmu2qj31120kuqd8.jpg)

[从零实现一个 Webpack Loader](https://juejin.im/post/5cf4ad65f265da1bb80c185f)

[记一次 Webpack 项目优化](https://juejin.im/post/5c08f4e9f265da61407eb486)

[前端构建秘籍](https://juejin.im/post/5c9075305188252d5c743520)

[vue + webpack 前端性能优化](https://juejin.im/post/5bc5c106e51d450e7a253e1b)
### module模块化
- 处理JS之外的静态资源
- 资源的依赖关系加载顺序
- 资源的请求和加载是异步的

> elementUI 按需加载各个组件，如何遍历在Vue.use(componentName)里面?


webpack是`高度复杂抽象的插件集合`，理解webpack的运行机制，对于我们日常定位构建错误以及写一些插件处理构建任务有很大的帮助。

> 一般 webpack 打包构建问的深入点的话都会问：构建的速度和体积分别是如何优化的？

```js
const path = require('path');
module.exports = {
  entry: "./app/entry", // string | object | array
  // Webpack打包的入口
  output: {  // 定义webpack如何输出的选项
    path: path.resolve(__dirname, "dist"), // string
    // 所有输出文件的目标路径
    filename: "[chunkhash].js", // string
    // 「入口(entry chunk)」文件命名模版
    publicPath: "/assets/", // string
    // 构建文件的输出目录
    /* 其它高级配置 */
  },
  module: {  // 模块相关配置
    rules: [ // 配置模块loaders，解析规则
      {
        test: /\.jsx?$/,  // RegExp | string
        include: [ // 和test一样，必须匹配选项
          path.resolve(__dirname, "app")
        ],
        exclude: [ // 必不匹配选项（优先级高于test和include）
          path.resolve(__dirname, "app/demo-files")
        ],
        loader: "babel-loader", // 模块上下文解析
        options: { // loader的可选项
          presets: ["es2015"]
        },
      },
  },
  resolve: { //  解析模块的可选项
    modules: [ // 模块的查找目录
      "node_modules",
      path.resolve(__dirname, "app")
    ],
    extensions: [".js", ".json", ".jsx", ".css"], // 用到的文件的扩展
    alias: { // 模块别名列表
      "module": "new-module"
	  },
  },
  devtool: "source-map", // enum
  // 为浏览器开发者工具添加元数据增强调试
  plugins: [ // 附加插件列表
    // ...
  ],
}

```

从上面我们可以看到，webpack配置中需要理解几个核心的概念`Entry` 、`Output`、`Loaders` 、`Plugins`、 `Module`、`Chunk`
#### 核心概念
- Entry：指定webpack开始构建的入口模块，从该模块开始构建并计算出直接或间接依赖的模块或者库
- Output：告诉webpack如何命名输出的文件以及输出的目录
- Module: 模块，在 Webpack 中任何文件都可以作为一个模块，会根据配置的不同的 Loader 进行加载和打包；
- Loaders：由于webpack只能处理javascript，所以我们需要对一些非js文件处理成webpack能够处理的模块，比如sass文件
- Plugins：Loaders将各类型的文件处理成webpack能够处理的模块，plugins有着很强的能力。插件的范围包括，从打包优化和压缩，一直到重新定义环境中的变量。但也是最复杂的一个。比如对js文件进行压缩优化的UglifyJsPlugin插件
- Chunk：coding split的产物，我们可以对一些代码打包成一个单独的chunk，比如某些公共模块，去重，更好的利用缓存。或者按需加载某些功能模块，优化加载时间。在webpack3及以前我们都利用CommonsChunkPlugin将一些公共代码分割成一个chunk，实现单独加载。在webpack4 中CommonsChunkPlugin被废弃，使用SplitChunksPlugin

#### 工作流程 (加载 - 编译 - 输出)
- 1、读取配置文件，按命令 **初始化** 配置参数，创建 Compiler 对象；
- 2、调用插件的 apply 方法 **挂载插件** 监听，然后从入口文件开始执行编译；
- 3、按文件类型，调用相应的 Loader 对模块进行**编译**，并在合适的时机点触发对应的事件，调用 - Plugin 执行，最后再根据模块 **依赖查找** 到所依赖的模块，递归执行第三步；
- 4、将编译后的所有代码包装成一个个代码块 (Chuck)， 并按依赖和配置确定 **输出内容**。这个步骤，仍然可以通过 Plugin 进行文件的修改;
- 5、最后，根据 Output 把文件内容一一写入到指定的文件夹中，完成整个过程



#### 模块包装
```js
(function(modules) {
	// 模拟 require 函数，从内存中加载模块；
	function __webpack_require__(moduleId) {
		// 缓存模块
		if (installedModules[moduleId]) {
			return installedModules[moduleId].exports;
		}
		
		var module = installedModules[moduleId] = {
			i: moduleId,
			l: false,
			exports: {}
		};
		
		// 执行代码；
		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
		
		// Flag: 标记是否加载完成；
		module.l = true;
		
		return module.exports;
	}
	
	// ...
	
	// 开始执行加载入口文件；
	return __webpack_require__(__webpack_require__.s = "./src/index.js");
 })({
 	"./src/index.js": function (module, __webpack_exports__, __webpack_require__) {
		// 使用 eval 执行编译后的代码；
		// 继续递归引用模块内部依赖；
		// 实际情况并不是使用模板字符串，这里是为了代码的可读性；
		eval(`
			__webpack_require__.r(__webpack_exports__);
			//
			var _test__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("test", ./src/test.js");
		`);
	},
	"./src/test.js": function (module, __webpack_exports__, __webpack_require__) {
		// ...
	},
 })

```
#### 小结
- 模块机制: webpack 自己实现了一套模拟模块的机制，将其包裹于业务代码的外部，从而提供了一套模块机制；
- 文件编译: webpack 规定了一套编译规则，通过 Loader 和 Plugin，以管道的形式对文件字符串进行处理；

##### loader编写原则:

- 单一原则: 每个 Loader 只做一件事；
- 链式调用: Webpack 会按顺序链式调用每个 Loader；
- 统一原则: 遵循 Webpack 制定的设计规则和结构，输入与输出均为字符串，各个 Loader 完全独立，即插即用；

##### plugin

```js
class Plugin{
  	// 注册插件时，会调用 apply 方法
  	// apply 方法接收 compiler 对象
  	// 通过 compiler 上提供的 Api，可以对事件进行监听，执行相应的操作
  	apply(compiler){
  		// compilation 是监听每次编译循环
  		// 每次文件变化，都会生成新的 compilation 对象并触发该事件
    	compiler.plugin('compilation',function(compilation) {})
  	}
}

```
Webpack 就像工厂中的一条产品流水线。原材料经过 Loader 与 Plugin 的一道道处理，最后输出结果。

通过链式调用，按顺序串起一个个 Loader；
通过事件流机制，让 Plugin 可以插入到整个生产过程中的每个步骤中；

Webpack 事件流编程范式的核心是基础类 Tapable，是一种 观察者模式 的实现事件的订阅与广播：

```js
const { SyncHook } = require("tapable")

const hook = new SyncHook(['arg'])

// 订阅
hook.tap('event', (arg) => {
	// 'event-hook'
	console.log(arg)
})

// 广播
hook.call('event-hook')

```
Webpack 中两个最重要的类 Compiler 与 Compilation 便是继承于 Tapable，也拥有这样的事件流机制。


- **Compiler**: 可以简单的理解为 Webpack 实例，它包含了当前 Webpack 中的所有配置信息，如 options， loaders, plugins等信息，全局唯一，只在启动时完成初始化创建，随着生命周期逐一传递；

- **Compilation**: 可以称为 编译实例。当监听到文件发生改变时，Webpack 会创建一个新的 Compilation 对象，开始一次新的编译。它包含了当前的输入资源，输出资源，变化的文件等，同时通过它提供的 api，可以监听每次编译过程中触发的事件钩子；


- 区别:
    - Compiler 全局唯一，且从启动生存到结束；
    - Compilation 对应每次编译，每轮编译循环均会重新创建；


#### 编译优化
- **代码优化**:
	- **无用代码消除**，是许多编程语言都具有的优化手段，这个过程称为 DCE (dead code elimination)，即 **删除不可能执行的代码**； 
		- 例如我们的 UglifyJs，它就会帮我们在生产环境中删除不可能被执行的代码，例如:
		
		```js
		var fn = function() {
			return 1;
			// 下面代码便属于 不可能执行的代码；
			// 通过 UglifyJs (Webpack4+ 已内置) 便会进行 DCE；
			var a = 1;
			return a;
		}
		```

	- **摇树优化** (Tree-shaking)，这是一种形象比喻。我们把打包后的代码比喻成一棵树，这里其实表示的就是，通过工具 "摇" 我们打包后的 js 代码，将没有使用到的无用代码 "摇" 下来 (删除)。即 消除那些被 **引用了但未被使用** 的模块代码。
		- **原理**: 由于是在编译时优化，因此最基本的前提就是语法的静态分析，**ES6的模块机制** 提供了这种可能性。不需要运行时，便可进行代码字面上的静态分析，确定相应的依赖关系。
		- **问题**: 具有 **副作用** 的函数无法被 tree-shaking。
			- 在引用一些第三方库，需要去观察其引入的代码量是不是符合预期；
			- 尽量写纯函数，减少函数的副作用；
			- 可使用 webpack-deep-scope-plugin，可以进行作用域分析，减少此类情况的发生，但仍需要注意；
 
- **code-spliting**: **代码分割** 技术，将代码分割成多份进行 **懒加载** 或 **异步加载**，避免打包成一份后导致体积过大，影响页面的首屏加载；
	- Webpack 中使用 SplitChunksPlugin 进行拆分；
	- 按 **页面** 拆分: 不同页面打包成不同的文件； 
	- 按 **功能** 拆分: 
		- 将类似于播放器，计算库等大模块进行拆分后再懒加载引入；
		- 提取复用的业务代码，减少冗余代码；
	- 按 **文件修改频率** 拆分: 将第三方库等不常修改的代码单独打包，而且不改变其文件 hash 值，能最大化运用浏览器的缓存；

- **scope hoisting**: **作用域提升**，将分散的模块划分到同一个作用域中，避免了代码的重复引入，有效减少打包后的代码体积和运行时的内存损耗；

- **编译性能优化**:
	- 升级至 **最新** 版本的 webpack，能有效提升编译性能；
	- 使用 **dev-server / 模块热替换 (HMR)** 提升开发体验；
		- 监听文件变动 **忽略 node_modules** 目录能有效提高监听时的编译效率；
	- **缩小编译范围**: 
		- modules: 指定模块路径，减少递归搜索；
		- mainFields: 指定入口文件描述字段，减少搜索；
		- noParse: 避免对非模块化文件的加载；
		- includes/exclude: 指定搜索范围/排除不必要的搜索范围；
		- alias: 缓存目录，避免重复寻址；
	- `babel-loader`:
		- 忽略`node_moudles`，避免编译第三方库中已经被编译过的代码；
		- 使用`cacheDirectory`，可以缓存编译结果，避免多次重复编译；
	- **多进程并发**:
		 - webpack-parallel-uglify-plugin: 可多进程并发压缩 js 文件，提高压缩速度；
		 - HappyPack: 多进程并发文件的 Loader 解析；
	- **第三方库模块缓存**:
		- DLLPlugin 和 DLLReferencePlugin 可以提前进行打包并缓存，避免每次都重新编译；
	- **使用分析**:
		- Webpack Analyse / webpack-bundle-analyzer 对打包后的文件进行分析，寻找可优化的地方；
		- 配置`profile：true`，对各个编译阶段耗时进行监控，寻找耗时最多的地方；
	- `source-map`:
		- 开发: `cheap-module-eval-source-map`；
		- 生产: `hidden-source-map`；


![](https://user-gold-cdn.xitu.io/2018/3/10/1620fec61c16507b?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

参考文章：[webpack详解](https://juejin.im/post/5aa3d2056fb9a028c36868aa)
