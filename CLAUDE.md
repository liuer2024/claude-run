# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

Claude Run 是一个浏览 Claude Code 对话历史的 Web UI，发布为 npm 包（`npx claude-run`）。
默认读取 `~/.claude/` 下的会话数据，可用 `-d` 参数覆盖目录。

- **后端**：`api/` —— Hono 服务 + commander.js CLI（`api/index.ts` 为入口，带 `#!/usr/bin/env node` shebang）
- **前端**：`web/` —— React 19 + Vite + Tailwind CSS v4
- 包管理器为 **pnpm**，Node >= 20。

## 常用命令

```bash
pnpm dev          # 同时启动前后端（开发时用这个，单独启动看不到完整 UI）
pnpm dev:server   # 仅后端：tsx watch api/index.ts --dev
pnpm dev:web      # 仅前端：vite
pnpm build        # 完整构建（build:server && build:web）
pnpm start        # 运行构建产物 node dist/index.js
```

- 仓库**没有配置 test / lint / format 脚本**。提交前用 `npx tsc --noEmit` 做类型检查。
- Prettier 已安装但未接入，无格式化脚本。

## 架构关键点

- **端口**：前端 12000，后端 12001。Vite 开发服务器把 `/api/*` 代理到后端。
- **类型共享**：web 的 tsconfig 把 `@claude-run/api` 别名指向 `../api/storage.ts`，跨目录引用类型从这里走。
- **实时更新**：通过 SSE（`/stream` 端点）推送，Vite 对该路径设置了禁用缓存的特殊响应头。
- 后端核心模块：`api/storage.ts`（会话/对话存取）、`api/watcher.ts`（文件监听）、`api/server.ts`（路由）。

## 代码风格

- TypeScript **strict 模式**；web 额外开启 `noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`——不要留未使用的变量/参数。
- JSX 使用自动转换（`react-jsx`），无需手动 `import React`。
- `moduleResolution` 为 `bundler`。
- Tailwind v4 通过 Vite 插件接入（不是 PostCSS）。
