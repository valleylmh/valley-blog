
### Vue框架的问题思考
> - Vue 中的 computed 和 watch 的区别在哪里？
> - Vue 中的 computed 是如何实现的?
> - 谈一谈 nextTick 的原理
> - Vue 是如何实现数据驱动的，以及数据更新如何驱动视图层变化的？

### 《Vue源码全方位深入分析》笔记
```js
数据驱动：new Vue
    -> init
        -> $mount
            -> mountComponent(runtime)
                -> updateComponent
                    -> vm._render() 
                        $createElement -> vnode // 映射真实DOM需要create/diff/patch
                    -> vm.update() // 首次渲染或数据更新
                        vm.__patch__() <- createPatchFunction
                -> new Watcher() // Watcher 在这里起到两个作用，一个是初始化的时候会执行回调函数，另一个是当 vm 实例中的监测的数据发生变化的时候执行回调函数
                
```
![](https://ustbhuangyi.github.io/vue-analysis/assets/new-vue.png)

思考响应式原理以下的问题：
1. 我需要修改哪块的 DOM？
2. 我的修改效率和性能是不是最优的？
3. 我需要对数据每一次的修改都去操作 DOM 吗？
4. 我需要 case by case 去写修改 DOM 的逻辑吗？


![](https://upload-images.jianshu.io/upload_images/3061147-ba6e5ec74076a6d3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


```js
响应式原理
_init -> initState() // 对 props、methods、data、computed 和 watcher 等属性做了初始化操作
         -> initProps /**vm._props.xxx 的访问代理到 vm.xxx 上*/ -> defineReactive
         -> initData // 通过 proxy 把每一个值 vm._data.xxx 都代理到 vm.xxx 上；另一个是调用 observe 方法观测整个 data 的变化，把 data 也变成响应式
            -> new Observer // 非 VNode 的对象类型数据添加一个 Observer 实例
            // Observer 是一个类，它的作用是给对象的属性添加 getter 和 setter，用于依赖收集和派发更新
                -> walk -> defineReactive // defineReactive 的功能就是定义一个响应式对象，给对象动态添加 getter 和 setter
                Dep 是整个 getter 依赖收集的核心

-------依赖收集过程分析----------
// mountComponent 函数
updateComponent = () => {
  vm._update(vm._render(), hydrating)
}
new Watcher(vm, updateComponent, noop, { // Watcher实例会执行它的 this.get() 方法
  before () {
    if (vm._isMounted) {
      callHook(vm, 'beforeUpdate')
    }
  }
}, true /* isRenderWatcher */)
// Watcher类 get方法里关注以下代码
pushTarget(this)
value = this.getter.call(vm, vm) -> // 这里会执行updateComponent方法
popTarget()
this.cleanupDeps() // 依赖收集完成后会做依赖清空处理因为有v-if渲染不同子模板 
// 收集过程
1. vm._render() -> 渲染 VNode -> 访问vm数据 -> 触发了数据对象的 getter。
2. 每个对象值的 getter 都持有一个 dep，在触发 getter 的时候会调用 dep.depend() 方法，也就会执行 Dep.target.addDep(this)。
3. 这个时候 Dep.target 已经被赋值为渲染 watcher，那么就执行到 addDep 方法
'Watcher 和 Dep 就是一个非常经典的观察者设计模式的实现'

--------派发更新过程分析---------
// 当我们在组件中对响应的数据做了修改，就会触发 setter 的逻辑，最后调用 dep.notify() 方法， 它是 Dep 的一个实例方法
'Vue 在做派发更新的时候引入了队列的概念'并不会每次数据改变都触发 watcher 的回调，而是把这些 watcher 先添加到一个队列里，然后在 nextTick 后执行 flushSchedulerQueue
reactiveSetter -> 
    <Dep类> notify()方法 -> 
        <Watcher类> update方法 -> queueWatcher方法
        -> flushSchedulerQueue 方法 
            -> <Watcher类> run方法 -> <Watcher类> getAndInvoke方法 -> <Watcher类> get方法
                -> <Watcher类> this.getter代理到 updateComponent方法

--------nextTick----------
nextTick(flushSchedulerQueue) 所用到的函数。它的逻辑也很简单，把传入的回调函数 cb 压入 callbacks 数组，最后一次性地根据 useMacroTask 条件执行 macroTimerFunc 或者是 microTimerFunc，而它们都会在下一个 tick 执行 flushCallbacks

-------计算属性和侦听属性----------
computed watcher 会并不会立刻求值，同时持有一个 dep 实例
```

[learnVue](https://github.com/answershuto/learnVue/blob/master/README.md)

[Vue技术揭秘](https://ustbhuangyi.github.io/vue-analysis/)

**patch**
> - patch的整体流程：createComponent -> 子组件初始化initComponent -> 子组件render -> 子组件patch
> - activeInstance 为当前激活的vm实例；vm.$vnode为组件的占位vnode；vm._vnode为组件的渲染vnode
> - 嵌套组件的插入顺序是先子后父

**合并配置**
> - 外部调用场景下的合并配置是通过mergeOption，并遵循一定的合并策略：先父后子，再子后父；
> - 组件合并是通过initInternalComponent，它的合并更快；
> - 框架、库的设计都是类似自身定义了默认配置，同时可以在初始化阶段传入配置，然后merge配置，来达到定制化不同需求的目的。

**生命周期**
源码中最终执行生命周期的函数都是调用 `callHook` 方法，它的定义在 `src/core/instance/lifecycle` 中

- 加载渲染过程：父 beforeCreate -> 父 created -> 父 beforeMount -> 子 beforeCreate -> 子 created -> 子 mounted -> 父mounted
- 子组件更新过程：父beforeUpdate->子beforeUpdate->子updated->父updated
- 父组件更新过程：父beforeUpdate->父updated
- 销毁过程：父beforeDestroy->子beforeDestroy->子destroyed->父destroyed

##### Vue-Router
Vue-Router 的能力十分强大，它支持 hash、history、abstract 3 种路由方式，提供了 <router-link> 和 <router-view> 2 种组件，还提供了简单的路由配置和一系列好用的 API。
**路由注册**Vue.use， **路由安装**Vue.install，Vue-Router 的 install 方法会给每一个组件注入 beforeCreate 和 destoryed 钩子函数，在 beforeCreate 做一些私有属性定义和路由初始化工作。

> router.init -> history.transitionTo -> matcher

Vue-Router 中定义的 `Location` 数据结构和浏览器提供的 window.location 部分结构有点类似，它们都是对 url 的结构化描述。
`Route` 表示的是路由中的一条线路，它除了描述了类似`Loctaion` 的 `path`、`query`、`hash` 这些概念，还有 `matched` 表示匹配到的所有的 `RouteRecord`。

- createMatcher的初始化就是根据路由的配置描述创建映射表routeMap，包括路径pathList，名称nameMap，和路由表routeMap的映射关系。
- match会根据传入的位置和路径计算出新的位置，并匹配到对应的路由record，然后根据新的位置和record创建新的路径并返回。
```javascript
const { pathList, pathMap, nameMap } = createRouteMap(routes)

function addRoutes (routes) {
    createRouteMap(routes, pathList, pathMap, nameMap)
}
```


