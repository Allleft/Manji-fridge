# Manji Fridge Recipe Web App

冰箱菜谱助手（V1）  
一个“先选食材，再看菜谱”的响应式网页应用（Vanilla JS + ESM）。

## 核心规则（当前实现）

- 蔬菜严格筛选：
  - 菜谱至少包含一个已选蔬菜
  - 菜谱中的所有蔬菜都必须在已选集合内
  - 由蔬菜规则命中的菜谱不能包含肉类
- 肉类包含即出现：
  - 菜谱只要包含任一已选肉类即可出现
- 综合结果：
  - 蔬菜命中与肉类命中做并集
  - 按 `recipe.id` 去重
- 空选择：
  - 未选择任何食材时，结果为空

## 本地持久化

- 食材偏好：`manji-fridge.ingredients.v1`
- 预选菜谱：`manji-fridge.presets.v1`

刷新页面后，新增/隐藏食材与预选菜谱会保留。

## 技术栈

- Vanilla JavaScript（ES Modules）
- CSS
- localStorage
- Node.js 本地静态服务（`server.js`）

## 本地运行

```bash
npm install
npm start
```

访问：

```text
http://localhost:4173
```

## 测试

```bash
npm test
```

当前 `npm test` 覆盖：
- `src/filters.test.mjs`
- `src/app/business.test.mjs`

## 目录结构（当前）

```text
Manji-fridge/
├─ AGENTS.md
├─ index.html
├─ styles.css
├─ server.js
├─ package.json
├─ task_plan.md
├─ findings.md
├─ progress.md
└─ src/
   ├─ app.js
   ├─ data.js
   ├─ filters.js
   ├─ filters.test.mjs
   ├─ storage.js
   └─ app/
      ├─ state.js
      ├─ business.js
      ├─ business.test.mjs
      ├─ render.js
      ├─ actions.js
      └─ events.js
```

## 模块职责

- `src/app.js`：入口装配（状态、业务、渲染、行为、事件）
- `src/app/state.js`：初始状态与持久化桥接
- `src/app/business.js`：食材归一化、屏蔽、菜谱归并与业务派生
- `src/app/render.js`：HTML 渲染与滚动/焦点恢复
- `src/app/actions.js`：用户行为状态变更（含持久化触发）
- `src/app/events.js`：DOM 事件绑定与路由
- `src/filters.js`：纯筛选规则函数
- `src/storage.js`：localStorage 读写封装

## GitHub Pages 兼容说明

- 入口保持 `index.html -> ./src/app.js`
- 无必需构建步骤
- 资源路径为静态相对路径，兼容 GitHub Pages 项目页部署
