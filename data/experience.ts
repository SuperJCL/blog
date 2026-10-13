import type { Localized } from "@/i18n/config";
import type { Period } from "./types";

export type Experience = { period: Period; place?: Localized; title: Localized };

// Newest first.
export const experience: Experience[] = [
  {
    period: { start: "2026-09", end: "2029-05", expected: true },
    place: { en: "Northeastern University, Seattle", zh: "美国东北大学（西雅图校区）" },
    title: { en: "Computer and Information Sciences", zh: "计算机与信息科学" },
  },
  {
    period: { start: "2025-04", end: "2026-02" },
    title: { en: "Graduate school preparation and applications", zh: "语言考试与研究生申请" },
  },
  {
    period: { start: "2020-08", end: "2025-03" },
    place: { en: "Uniview Technologies", zh: "宇视科技" },
    title: { en: "Frontend Engineer, Business Software R&D", zh: "前端开发工程师 · 业务软件产品开发部" },
  },
  {
    period: { start: "2019-07", end: "2020-07" },
    place: { en: "Uniview Technologies", zh: "宇视科技" },
    title: { en: "Embedded Driver Engineer, Backend Product R&D", zh: "嵌入式驱动开发工程师 · 后端产品开发部" },
  },
  {
    period: { start: "2016-09", end: "2020-06" },
    place: {
      en: "China Jiliang University, College of Modern Science and Technology",
      zh: "中国计量大学现代科技学院",
    },
    title: { en: "B.Eng. in Electronic and Information Engineering", zh: "电子信息工程 · 工学学士" },
  },
];
