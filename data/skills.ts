import type { Localized } from "@/i18n/config";

// Tool names are the same in both languages; only an item with a description needs both.
export type SkillGroup = { label: Localized; items: (string | Localized)[] };

// Proficient and above only.
export const skills: SkillGroup[] = [
  {
    label: { en: "Frontend", zh: "前端" },
    items: ["React", "TypeScript", "JavaScript", "Redux", "Ant Design", "HTML/CSS"],
  },
  {
    label: { en: "3D & Visualization", zh: "3D 与可视化" },
    items: [
      "Three.js",
      { en: "Unreal Engine (Blueprints, Pixel Streaming)", zh: "Unreal Engine（蓝图、像素流送）" },
      "krpano",
      "EasyV",
    ],
  },
  {
    label: { en: "Backend & Delivery", zh: "服务端与工程化" },
    items: ["Nest.js", "Node.js", "SQL", "Docker", "Jenkins", "Shell", "Git", "SVN"],
  },
  {
    label: { en: "Other", zh: "其他" },
    items: ["C/C++", "Photoshop"],
  },
];
