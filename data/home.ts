import type { Localized } from "@/i18n/config";

// Homepage copy. The hero's corner cards (stage 3.3b) reuse `focusAreas` and `aboutCard`.

export const hero = {
  // Two lines: a lead-in and the big accent line.
  title: { en: ["Making data", "visible"], zh: ["让数据", "看得见"] },
  roles: {
    en: ["3D map engineer", "Data visualization developer", "Full-stack engineer"],
    zh: ["3D 地图工程师", "数据可视化开发者", "全栈工程化实践者"],
  },
} satisfies Record<string, Localized<string[]>>;

export type FocusArea = { id: string; tag: string; title: Localized; body: Localized; tools: string[] };

export const focusAreas: FocusArea[] = [
  {
    id: "3d",
    tag: "3D",
    title: { en: "3D Maps", zh: "3D 地图" },
    body: {
      en: "Brought high-fidelity 3D maps to the browser with Unreal Engine and Pixel Streaming; also integrated third-party 3D map engines and built a Three.js panorama showroom.",
      zh: "用虚幻引擎和像素流送，把高质量 3D 地图搬进浏览器；也做过第三方 3D 地图引擎对接和 Three.js 全景展厅。",
    },
    tools: ["Unreal Engine", "Three.js", "krpano"],
  },
  {
    id: "dataviz",
    tag: "Dataviz",
    title: { en: "Data Visualization", zh: "数据可视化" },
    body: {
      en: "Built visual search over millions of records, a 20-metre showroom display, and data dashboards for about ten client projects.",
      zh: "做过面向百万级数据的可视化检索界面，以及展厅 20 米大屏和十来个项目的数据大屏。",
    },
    tools: ["React", "EasyV", "SQL"],
  },
  {
    id: "fullstack",
    tag: "Full-stack",
    title: { en: "Full-stack Engineering", zh: "全栈工程化" },
    body: {
      en: "Took a product from Nest.js APIs to Docker, Jenkins and shell-based packaging, install and upgrade scripts, through to commercial release.",
      zh: "从 Nest 服务端接口，到 Docker、Jenkins、Shell 的打包与安装升级脚本，把一个产品完整交付上线。",
    },
    tools: ["Nest.js", "Docker", "Jenkins"],
  },
];

export const aboutCard = {
  title: { en: "About me", zh: "关于我" },
  body: {
    en: "Trained in electronic and information engineering, I spent nearly six years at Uniview, moving from embedded drivers to frontend and visualization. Now studying computer science at Northeastern University in Seattle and seeking Summer 2028 internships.",
    zh: "电子信息工程出身，在宇视科技近 6 年，从嵌入式驱动转到前端与可视化。现在在东北大学西雅图校区读计算机，寻找 2028 年暑期实习。",
  },
  tags: ["Seattle", "Summer 2028"],
};

// Tech names in the hero marquee, all from the résumé.
export const marquee = [
  "React", "TypeScript", "Three.js", "Unreal Engine", "krpano", "Nest.js",
  "Node.js", "Docker", "Jenkins", "Redux", "Ant Design", "EasyV",
];
