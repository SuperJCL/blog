import type { Localized } from "@/i18n/config";

// The role broken where it reads well, for places that set it large (the about page's share image), so a line
// never ends mid-word. `profile.role` is the same words on one line.
export const roleLines: Localized<string[]> = {
  en: ["Frontend engineer", "focused on visualization"],
  zh: ["可视化方向的", "前端工程师"],
};

export const profile = {
  name: { en: "Chenglin Jiang", zh: "蒋承霖" },
  role: { en: roleLines.en.join(" "), zh: roleLines.zh.join("") },
  location: { en: "Seattle, WA", zh: "西雅图" },
  status: { en: "Seeking Summer 2028 internships", zh: "寻找 2028 年暑期实习" },
  summary: {
    en: "I'm Chenglin Jiang, a frontend engineer focused on visualization. Over nearly six years at Uniview I moved from embedded drivers to frontend work, centred on 3D maps and data visualization, and also owned backend and packaging work. I helped move the company's maps from 2D to Unreal Engine–based cloud-rendered 3D, now running in more than ten client deployments. I'm now studying Computer and Information Sciences at Northeastern University in Seattle (expected May 2029) and looking for Summer 2028 internships.",
    zh: "我是蒋承霖，可视化方向的前端工程师。在宇视科技的近 6 年里，我先做嵌入式驱动，后来转到前端，主做 3D 地图、数据可视化，也负责过服务端和产品化交付。我参与把公司的地图从 2D 推进到基于虚幻引擎的 3D 云渲染，落地了十余个客户项目。现在我在美国东北大学西雅图校区攻读计算机与信息科学，预计 2029 年 5 月毕业，正在寻找 2028 年暑期实习。",
  },
} satisfies Record<string, Localized>;

// Public contact details. Never add a phone number here (CLAUDE.md, 内容规则).
export const contact = {
  email: "jiangchenglin922@gmail.com",
  links: [
    { label: "GitHub", href: "https://github.com/SuperJCL" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/chenglin-jiang-735460402" },
  ],
} as const;

// First year the site was published, for the footer copyright.
export const siteSince = 2026;
