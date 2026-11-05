# 22408 备考笔记

22408 考研笔记网站：数学 + 专业课 408。Obsidian Markdown 笔记经自建静态生成器渲染为纯 HTML，线上与本地双击均可使用。

**在线访问**：https://exacped.github.io/408-notes/

## 项目情况

| 指标 | 数值 |
| --- | --- |
| 笔记 | 148 篇（数学 + 408 四门） |
| 字数 | 约 148 万字 |
| 公式 | 6500+ 处（构建期 KaTeX 服务端渲染，零运行时计算） |
| 真题/模拟 | 50 套，自动从文件名解析年份、用时、得分 |

## 功能

- 全站检索（快捷键 `/`，标题 + 正文片段高亮，按科目分片懒加载）
- 章节目录树（原生 `<details>` 折叠）、页内目录（IntersectionObserver 滚动跟随）
- 阅读进度条与"已读"标记（localStorage）
- 真题台账：年份 / 用时 / 得分进度条
- 夜读暗色模式，桌面三栏 / 窄屏单栏自适应

## 技术栈

- **生成器**：Node.js（ESM）自写静态站点生成器，无前端框架，产物为纯静态 HTML
- **Markdown 渲染**：markdown-it 14 + 自定义插件
  - `$...$` / `$$...$$` → KaTeX（构建期渲染为 HTML）
  - Obsidian 方言适配：`> [!NOTE]` 调用块、`%%注释%%`、`==高亮==`、`![图|宽度]` 尺寸语法
- **语法高亮**：highlight.js
- **检索**：构建期生成按科目分片的索引脚本（`window.__SEARCH` 注入），绕开 `file://` 下 fetch 限制，客户端打分
- **样式**：手写 CSS，Noto Serif SC（子集化裁剪至约 270KB/字重）+ EB Garamond + IBM Plex Mono，纸纹 SVG 噪点，CSS 变量切换明暗主题

## 目录结构

```
note-site/
├─ src/            # 生成器源码
│  ├─ build.mjs        # 构建编排：扫描 → 渲染 → 页面/索引/资产输出
│  ├─ lib/
│  │  ├─ scan.mjs        # 笔记扫描、分组、ID 分配
│  │  ├─ markdown.mjs    # markdown-it 实例与自定义插件
│  │  ├─ templates.mjs   # 页面模板（首页/科目/正文/真题）
│  │  └─ exams.mjs       # 真题文件名解析
│  └─ src/             # 前端资产（theme.css、app.js、字体）
├─ dist/           # 构建产物（可直接双击 index.html 使用）
└─ deploy/         # 本仓库内容（dist 的镜像 + .nojekyll + README）
```
