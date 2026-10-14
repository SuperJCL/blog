import type { Localized } from "@/i18n/config";
import type { Period } from "./types";

// A screenshot or a short muted loop shown under an entry. Sizes are the file's own pixels.
export type ProjectMedia = {
  kind: "image" | "video";
  src: string;
  poster?: string; // video only: the still shown before it plays, and instead of it with reduced motion
  width: number;
  height: number;
  alt: Localized;
  caption: Localized;
};

// One-line entries under the featured case studies; they have no detail page.
export type ProjectNote = {
  period: Period;
  title: Localized;
  summary: Localized;
  confidential?: boolean; // public-safety work: no screenshots or real data
  media?: ProjectMedia[];
};

// Newest first.
export const otherProjects: ProjectNote[] = [
  {
    period: { start: "2023", end: "2025" },
    title: { en: "Dashboard integration", zh: "数据大屏融入项目" },
    summary: {
      en: "Embedded EasyV visualization templates into product pages via iframe and postMessage with custom auth, delivering about ten projects with pixel-exact designs.",
      zh: "引入 EasyV 可视化模板，用 iframe + postMessage 嵌入业务页面并定制鉴权，完成近十个项目，设计稿 100% 还原。",
    },
  },
  {
    period: { start: "2023-04", end: "2023-09" },
    title: { en: "Internationalization", zh: "多语言国际化改造" },
    summary: {
      en: "Adapted the platform's single-page apps for overseas languages with a shared translate helper, string loading and multilingual components.",
      zh: "为平台各单页应用做海外多语言适配，封装翻译方法、词条加载机制和多语言公共组件。",
    },
  },
  {
    period: { start: "2022-07", end: "2022-10" },
    title: { en: "3D map engine integration", zh: "3D 地图引擎对接" },
    summary: {
      en: "Wrapped a third-party Unity3D map behind the platform's map engine API; as a main contact, customized 5–10 client projects, including the 20-metre display in the HQ showroom.",
      zh: "把第三方 Unity3D 地图封装成平台统一的地图引擎接口，作为主要对接人定制了 5–10 个项目，并用于总部展厅 20 米大屏。",
    },
    // Both run on the partner's 3D map; the partner isn't named on the site.
    media: [
      {
        kind: "video",
        src: "/projects/map-engine/hq.mp4",
        poster: "/projects/map-engine/hq-poster.webp",
        width: 1280,
        height: 720,
        alt: {
          en: "The headquarters campus platform: the building's floors light up one by one in the energy view",
          zh: "总部大厦园区可视化平台：能耗视图里大楼逐层点亮",
        },
        caption: {
          en: "The headquarters campus visualization platform, energy view.",
          zh: "总部大厦的园区可视化平台，能耗视图。",
        },
      },
      {
        kind: "image",
        src: "/projects/map-engine/park.webp",
        width: 1592,
        height: 806,
        alt: {
          en: "An industrial park's digital campus at night: the 3D park in the middle, park facts on the left, service menu on the right",
          zh: "产业园数字园区夜景：中间是园区 3D 模型，左侧是园区概况，右侧是业务菜单",
        },
        caption: {
          en: "An industrial park's digital campus, built on the same partner map.",
          zh: "产业园数字园区，同样基于合作方的 3D 地图。",
        },
      },
    ],
  },
  {
    period: { start: "2022-04", end: "2022-06" },
    title: { en: "Digital showroom", zh: "数字展厅" },
    summary: {
      en: "Built panorama tours, viewpoint navigation and model close-ups on krpano, tuned product models with Three.js, with in-app purchase.",
      zh: "基于 krpano 二次开发全景漫游、视角导航和模型细节查看，用 Three.js 调整产品模型展示，支持线上购买。",
    },
  },
  {
    period: { start: "2021-01", end: "2021-03" },
    title: { en: "Video wall", zh: "电视墙定制" },
    summary: {
      en: "Agreed APIs with the display-control team and built live and playback wall features.",
      zh: "与显控部门约定接口，定制实况和回放上墙等能力。",
    },
  },
  {
    period: { start: "2020-09", end: "2020-12" },
    title: { en: "Performance scoring system", zh: "考核评分系统" },
    summary: {
      en: "Web app and DingTalk mini-program for a district police bureau, delivered on schedule and in use.",
      zh: "为某区公安做网页端和钉钉小程序，按期交付并投入使用。",
    },
    confidential: true,
  },
  {
    period: { start: "2019-07", end: "2020-07" },
    title: { en: "NVR driver development", zh: "网络录像机驱动开发" },
    summary: {
      en: "Delivered driver support for a new 8/16-channel NVR on an alternative chip platform in 3–4 months, passing the small-batch trial run on schedule.",
      zh: "新款 8/16 路 NVR 改用替代芯片方案，3–4 个月内保障驱动功能，按期通过小批量试产。",
    },
  },
];
