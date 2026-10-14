import type { ThemeRegistration } from "shiki";

// Code highlighting theme for build time. Colors are the design tokens from app/globals.css, written as CSS
// variables, so the theme holds no color of its own. Matches the style board: keywords in the accent, strings
// warm, functions white, numbers and types blue, comments muted; operators, punctuation and names stay plain.
const token = (name: string) => `var(--color-${name})`;

export const codeTheme: ThemeRegistration = {
  name: "site",
  type: "dark",
  fg: token("code-fg"),
  bg: token("code"),
  tokenColors: [
    { settings: { foreground: token("code-fg") } },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: token("code-muted"), fontStyle: "italic" },
    },
    {
      scope: [
        "keyword",
        "storage",
        "constant.language",
        "variable.language",
        "keyword.operator.new",
        "keyword.operator.expression",
      ],
      settings: { foreground: token("syntax-keyword") },
    },
    { scope: ["keyword.operator", "punctuation"], settings: { foreground: token("code-fg") } },
    {
      scope: ["string", "punctuation.definition.string", "punctuation.definition.template-expression"],
      settings: { foreground: token("syntax-string") },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function"],
      settings: { foreground: token("syntax-function") },
    },
    {
      scope: ["constant.numeric", "support.type", "entity.name.type", "entity.name.class", "support.class"],
      settings: { foreground: token("syntax-number") },
    },
  ],
};
