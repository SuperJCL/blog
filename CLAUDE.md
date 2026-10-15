@AGENTS.md

# 项目概览

Chenglin Jiang 的个人主页 + 技术博客。
定位：可视化方向的前端工程师（3D 地图、数据可视化、全栈工程化）。
受众：招聘方和中英文技术社区。网站中英双语。

# 技术栈（已确定，不要擅自更换）

- Next.js 16，App Router，TypeScript（strict 模式）
- 样式工具：Tailwind CSS
- 部署：Vercel，线上地址 https://charliejiangblog.vercel.app ，推送到 `main` 自动部署
- 博客内容方案：MDX + content-collections，文章放在 `content/posts/<slug>.<lang>.mdx`，同一 slug 的不同语言版本互为译文；作品案例放在 `content/projects/<slug>.<lang>.mdx`，必须中英文都有
- MDX 构建：remark-gfm（表格等 Markdown 扩展语法），shiki（构建时代码高亮，配色在 `lib/code-theme.ts`，取自设计变量）；改了 MDX 插件或配色后要删掉 `.content-collections/cache`
- SEO：站点地址只在 `lib/site.ts` 写一次；每个页面的 metadata 都用其中的 `pageMeta`（canonical、hreflang 含 x-default、分享卡片）；新页面要加进 `app/sitemap.ts`。分享图由各路由的 `opengraph-image.tsx` 调 `lib/og.tsx` 生成，首页和关于页带人像，人像源是 `assets/share-portrait.jpg`（从 `public/portrait.webp` 导出，人像换了要重新导出）
- RSS：`app/[lang]/feed.xml`，每种语言一份，条目和该语言的博客列表一致（没有译文的文章两边都有），只含摘要

# 双语

- 语言：`en`、`zh`，所有页面放在 `app/[lang]/` 下
- 用 proxy 做语言检测：访问根路径时按浏览器语言跳转，无法识别时用 `en`
- 界面文案统一放在字典文件里，组件中不要硬编码任何文案
- 切换语言时，停留在当前页面的对应语言版本
- 博客文章不强制双语：每篇标明语言，有译文时互相链接

# 页面

- 首页：我是谁、擅长什么、精选作品、最新文章
- 作品：项目列表和案例详情页
- 博客：文章列表和文章页
- 关于 / 联系

# 架构原则

- 内容与展示分离：简历、项目、经历等数据放在独立的数据文件中，组件只负责展示
- 默认使用服务端组件，只有需要交互时才加 `'use client'`
- 颜色、字体、间距等设计变量集中定义，组件里不要写死具体数值
- 视觉按下面「设计」一节执行

# 设计

方向 D「高对比作品集」：近黑舞台、荧光绿强调色、Anton 大标题。样稿：https://claude.ai/artifact/PHV3WviMzcTSBLb4LZMq5T

- 变量位置：颜色、字号、间距、缓动在 `app/globals.css`，字体在 `app/fonts.ts`，JS 驱动的弹簧参数在 `lib/motion.ts`
- 只用变量生成的工具类，例如 `bg-bg`、`text-fg`、`text-muted`、`border-line`、`bg-surface`、`font-display`、`max-w-measure`；Tailwind 默认色板已关闭
- 颜色：亮色、暗色各一套，默认跟随系统；顶栏按钮切换后记在 localStorage，由 `<html data-theme>` 生效（`lib/theme.ts`，head 里的脚本在首次绘制前设好，不闪屏）。按当前主题切换样式用 `theme-dark:` 变体；画布要在 `data-theme` 变化时重画；CSS 变量够不着的地方（分享图、theme-color）用 `lib/palette.ts` 从 `globals.css` 读色值
- `.stage` 区块在两种主题下都是暗色，用于首页首屏和代码块
- 荧光绿：`accent` 只作填充，上面的文字用 `accent-ink`；作文字、细线、焦点框时用 `accent-text`（亮色下是深绿）
- 字体：标题 Anton，英文正文 Instrument Sans，标签和代码 IBM Plex Mono，中文 Noto Sans SC（标题 900）；英文页上零星的中文（语言切换按钮的"中文"）用系统中文字体 `font-zh-system`，不为几个字加载 Noto
- 中文不加 `uppercase`，英文名和单位保持原样（Next.js、30 s）；英文标题和等宽标签可以大写
- 长文正文：字号 `text-read`（17px），行宽 `max-w-measure`（38em，约 38 个汉字），行高英文 1.75、中文 1.9
- 首页整屏翻页（弹簧速度 35、阻尼 0.90），其余页面正常滚动
- 作品详情固定四段：问题、我的角色、做法、结果；没有截图的项目用抽象示意图代替封面
- 所有动效都要尊重系统的"减少动态效果"设置；画面离开视野后，画布和循环动画要停下
- 可访问性：每页第一个 Tab 是"跳到正文"（`skip-link`，跳到 `<main id="main">`）；可点区域不小于 24px；装饰性的序号和箭头对读屏隐藏

# 内容规则

- 公安、警务相关项目不放截图和真实数据，只写问题、我的角色、做法和结果
- 网站上不公开手机号
- 截图公开前先处理：裁掉浏览器地址栏和任务栏；人脸、IP、端口、授权信息和同事姓名打码；处理后的图放在 `public/projects/<slug>/`，原图不进仓库
- 合作方提供的 3D 地图（恒润产业园、总部大厦视频）归在"3D 地图引擎对接"，不写合作方名称，也不放进自研的云渲染案例

# 工作方式

- 每个任务先出计划，我确认后再改代码
- 一次只做一个小任务；完成后运行 `npm run lint` 和 `npm run build`，都通过再向我汇报
- 新增依赖前先问我
- 每完成一个任务提交一次 git，commit message 用英文，简短说明做了什么
- 需求不明确时先问我，不要自己猜

# 路线图

1. 骨架：双语路由、四个页面占位、语言切换、部署到 Vercel（只做和外观无关的基础设施）
2. 定设计：出样稿，由我定设计方向，定下布局和设计变量（亮色、暗色两套颜色一起定），写进 CLAUDE.md
3. 页面与内容：按设计稿做页面，简历数据化、作品案例、第一篇文章
4. 打磨：SEO、RSS、暗色模式切换、性能、可访问性、3D 可视化 demo

当前阶段：4
