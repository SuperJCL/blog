import type { Localized } from "@/i18n/config";

export type Award = { year: string; title: Localized };

// Only the strongest few; newest first.
export const awards: Award[] = [
  {
    year: "2019",
    title: { en: "Outstanding Student Leader, top 5%", zh: "校级优秀学生干部（前 5%）" },
  },
  {
    year: "2017–2019",
    title: {
      en: "Multiple university scholarships for academics, research and innovation, and student service",
      zh: "多次校级奖学金（优秀学生、研究与创新、社会工作）",
    },
  },
  {
    year: "2017",
    title: {
      en: "First Prize, Zhejiang Provincial College Physics Innovation Competition (Theory), top 2%",
      zh: "浙江省大学生物理创新（理论）竞赛一等奖（前 2%）",
    },
  },
];
