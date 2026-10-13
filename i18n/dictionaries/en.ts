const en = {
  meta: {
    title: "Chenglin Jiang",
    description:
      "Frontend engineer focused on visualization: 3D maps, data visualization and full-stack engineering.",
  },
  nav: {
    label: "Main",
    brandShort: "CJ",
    projects: "Projects",
    blog: "Blog",
    about: "About",
    contact: "Contact",
  },
  footer: {
    contactLabel: "Contact links",
  },
  localeSwitcher: {
    label: "Switch language",
  },
  home: {
    title: "Chenglin Jiang",
    intro: "Frontend engineer focused on visualization.",
  },
  projects: {
    title: "Projects",
    intro: "Selected work, coming soon.",
  },
  blog: {
    title: "Blog",
    empty: "No posts yet.",
    allPosts: "All posts",
    // Keyed by the language of the version being linked to or shown.
    readIn: { en: "Read in English", zh: "Read in Chinese" },
    onlyIn: {
      en: "This post is only available in English.",
      zh: "This post is only available in Chinese.",
    },
  },
  about: {
    title: "About",
    intro: "About me, coming soon.",
    contactTitle: "Contact",
  },
};

export type Dictionary = typeof en;

export default en;
