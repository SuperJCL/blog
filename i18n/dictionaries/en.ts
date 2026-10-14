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
    intro:
      "Three case studies, each told as the problem, my role, the approach and the result, followed by the rest of my work in a line each.",
    casesTitle: "Case studies",
    otherTitle: "Other work",
    confidential: "Screenshots and real data are not shown for this project",
    role: "Role",
    stack: "Stack",
    period: "Dates",
    company: "Company",
    present: "Present",
    all: "All projects",
    previous: "Previous",
    next: "Next",
    sections: { problem: "Problem", role: "My role", approach: "Approach", result: "Result" },
    diagramTag: "Diagram · no real data",
    diagramCaption: "Projects without screenshots use an abstract diagram as the cover. It doesn't depict the real system.",
  },
  contact: {
    email: "Email",
  },
  blog: {
    title: "Blog",
    intro: "Notes on 3D maps, data visualization and frontend engineering, and on building this site.",
    empty: "No posts yet.",
    allPosts: "All posts",
    contents: "On this page",
    minutes: "{n} min read",
    previous: "Previous",
    next: "Next",
    copy: "Copy",
    copied: "Copied",
    // Keyed by the language of the version being linked to or shown.
    readIn: { en: "Read in English", zh: "Read in Chinese" },
    alsoIn: {
      en: "This post is also available in English.",
      zh: "This post is also available in Chinese.",
    },
    onlyIn: {
      en: "This post is only available in English.",
      zh: "This post is only available in Chinese.",
    },
  },
  about: {
    title: "About",
    basedIn: "Based in",
    status: "Status",
    studying: "Studying",
    experience: "Experience",
    awards: "Awards",
    skills: "Skills",
    contactTitle: "Contact",
    expected: " (expected)",
    emailMe: "Email me",
  },
};

export type Dictionary = typeof en;

export default en;
