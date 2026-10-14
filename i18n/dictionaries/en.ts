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
    heroCta: "View projects",
    cardsLabel: "Four areas",
    skillsKicker: "What I do",
    skillsTitle: "Three kinds of work",
    featured: "Selected work",
    viewCase: "Read the case study",
    postsTitle: "Latest writing",
    contactKicker: "About · Contact",
    contactTitle: "Get in touch",
    aboutMore: "More about me",
    screens: "Screens",
    // Dot labels; work screens add their number: "Project 1".
    screen: { hero: "Intro", skills: "What I do", work: "Project", posts: "Writing", contact: "Contact" },
  },
  projects: {
    title: "Projects",
    intro: "Selected work, coming soon.",
    confidential: "Screenshots and real data are not shown for this project",
    role: "Role",
    stack: "Stack",
    period: "Dates",
    present: "Present",
  },
  contact: {
    email: "Email",
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
