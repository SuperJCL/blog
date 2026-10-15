import type { Localized } from "@/i18n/config";

// The Seattle 3D map demo (/[lang]/lab/seattle). {placeholders} are filled from public/lab/seattle/city.json.

export type LabSection = {
  title: Localized;
  paragraphs?: Localized[];
  list?: Localized[];
  links?: { label: Localized; href: string }[];
};

type LabDemo = {
  slug: string;
  data: string;
  title: Localized;
  description: Localized;
  lede: Localized;
  sections: LabSection[];
};

export const seattleDemo: LabDemo = {
  slug: "seattle",
  data: "/lab/seattle", // city.bin and city.json, built by scripts/seattle-data.mjs
  title: { en: "Seattle in 3D", zh: "西雅图 3D 城市" },
  description: {
    en: "Central Seattle's buildings from OpenStreetMap, extruded to their heights and drawn in the browser with Three.js.",
    zh: "用 OpenStreetMap 的西雅图市中心建筑数据，按高度拉伸成 3D，用 Three.js 在浏览器里实时渲染。",
  },
  lede: {
    en: "{buildings} buildings of central Seattle from OpenStreetMap, extruded to their heights and drawn live with Three.js. Drag to look around.",
    zh: "西雅图市中心的 {buildings} 个楼体，数据来自 OpenStreetMap，按高度拉伸，用 Three.js 实时渲染。拖动画面四处看看。",
  },
  sections: [
    {
      title: { en: "What you're looking at", zh: "看到的是什么" },
      paragraphs: [
        {
          en: "About 4 × 2.7 km of central Seattle: Downtown, Belltown, Pike Place, Seattle Center and South Lake Union. Each block is coloured by its height, from the low streets near the ground colour up to the towers in the accent; the tallest is Columbia Center at {tallest} m. Streets, Elliott Bay, Lake Union and the parks lie underneath.",
          zh: "西雅图市中心约 4 × 2.7 公里：Downtown、Belltown、派克市场、西雅图中心和南联合湖区。楼体按高度着色，低矮的接近地面颜色，越高越接近强调色；最高的是 {tallest} 米的哥伦比亚中心。下面铺着街道、艾略特湾、联合湖和公园。",
        },
        {
          en: "Heights are OpenStreetMap's own where tagged ({tagged} blocks), otherwise worked out from the number of storeys ({storeys}), or a typical height for the building type ({typed}, mostly low houses).",
          zh: "高度优先用 OpenStreetMap 标注的数值（{tagged} 个楼体）；没有的按层数推算（{storeys} 个）；层数也没有的，按建筑用途取典型高度（{typed} 个，大多是低矮住宅）。",
        },
      ],
    },
    {
      title: { en: "How it's built", zh: "怎么做的" },
      list: [
        {
          en: "Data: a script queries OpenStreetMap's Overpass API, keeps towers' detailed parts (Simple 3D Buildings), closes Elliott Bay from the coastline, and packs it all into a {size} KB binary of 16-bit coordinates in 25 cm steps.",
          zh: "数据：脚本从 OpenStreetMap 的 Overpass 接口取数据，高楼保留分段体块（Simple 3D Buildings），用海岸线拼出艾略特湾，再把坐标量化成 25 厘米精度的 16 位整数，打包成 {size} KB 的二进制文件。",
        },
        {
          en: "Rendering: in the browser every footprint is extruded and triangulated into one merged mesh, so the whole city is a single draw call. Flat shading and darker wall bases give the blocks their volume; the colours are the site's design tokens and follow the light or dark theme.",
          zh: "渲染：浏览器里把每个轮廓拉伸、三角化，合并成一个网格，整座城市一次绘制调用画完。平面着色加上压暗的墙脚，让体块有体积感；配色取自网站的设计变量，跟随亮色和暗色主题。",
        },
        {
          en: "Performance: it draws only while the camera moves, pauses off screen and caps the pixel ratio. Three.js loads on this page only.",
          zh: "性能：只在镜头移动时绘制，离开视野就暂停，像素比封顶。Three.js 只在这个页面加载。",
        },
      ],
    },
    {
      title: { en: "Data and licence", zh: "数据与许可" },
      paragraphs: [
        {
          en: "Map data © OpenStreetMap contributors, under the Open Database License. The processed files are a derived database under the same licence; they and the script that builds them are in the site's repository.",
          zh: "地图数据 © OpenStreetMap 贡献者，采用开放数据库许可（ODbL）。处理后的文件是派生数据库，沿用同一许可；这些文件和生成它们的脚本都在网站的代码仓库里。",
        },
      ],
      links: [
        { label: { en: "OpenStreetMap copyright", zh: "OpenStreetMap 版权说明" }, href: "https://www.openstreetmap.org/copyright" },
        { label: { en: "Data script on GitHub", zh: "GitHub 上的数据脚本" }, href: "https://github.com/SuperJCL/blog/blob/main/scripts/seattle-data.mjs" },
      ],
    },
  ],
};
