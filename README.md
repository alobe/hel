<p align="center">
<img width="620px" src="https://user-images.githubusercontent.com/7334950/182146369-15b512e0-a47a-4cf6-9c0c-c2fa0549e6aa.png" />
</p>


**hel-micro** 模块联邦sdk化，免构建、热更新的微模块方案

## why hel-micro
![image](https://user-images.githubusercontent.com/7334950/182147067-1cae93f9-3874-4446-886b-8fd448eb4fe7.png)

### 如何使用远程模块
仅需要一句npm命令即可载入远程模块，查看下面例子的[线上示例](https://codesandbox.io/s/hel-lodash-zf8jh8?file=/src/App.js)

- 1 安装`hel-micro`

```bash
npm i hel-micro
```

- 2 惰性加载远程模块

示例：调用`hel-lodash` 模块的方法

```ts
import { preFetchLib } from 'hel-micro';
async function ran(seed){
  const mod = await preFetchLib('hel-lodash'); // 首次加载触发模块下载，之后会从hel-micro缓存获取
  const num = mod.myUtils.num.random(500);
  return num;;
};
```

- 3 预加载远程模块

示例：静态导入`hel-lodash`后调用其模块方法

安装`hel-lodash`
```bash
npm i hel-lodash
```

先执行模块拉取动作
```ts
import { preFetchLib } from "hel-micro";

async function main() {
  await preFetchLib("hel-lodash");
  await import("./loadApp"); // 入口文件后移
}
```

在入口文件里关联的任意文件处静态导入`hel-micro`并调用模块方法
```ts
import m from 'hel-lodash';
console.log(m.myUtils.num.random(500);) // 获得随机数
```


## [hel-micro](packages/hel-micro)
前端微件化sdk，基于 hel-micro 可实现跨项目共享代码、模块热更新、微前端架构等功能

## [hel-micro-react](packages/hel-micro-react)
依赖 hel-micro 基础 api 实现的 react 组件加载库
