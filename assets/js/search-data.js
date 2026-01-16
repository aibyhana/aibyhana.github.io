// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-home",
    title: "home",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-bookshelf",
          title: "bookshelf",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/books/";
          },
        },{id: "post-what-a-stanford-ethics-course-taught-me-about-building-better-ai",
        
          title: "What a Stanford Ethics Course Taught Me About Building Better AI",
        
        description: "reflections on ethical AI development from Stanford&#39;s Ethics, Technology, and Public Policy course",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/stanford-ethics-course/";
          
        },
      },{id: "post-understanding-rag-hallucinations",
        
          title: "Understanding RAG Hallucinations",
        
        description: "exploring why retrieval-augmented generation systems fail to stay faithful to context",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2023/post-bibliography/";
          
        },
      },{id: "books-the-alignment-problem",
          title: 'The Alignment Problem',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/alignment_problem/";
            },},{id: "books-human-compatible",
          title: 'Human Compatible',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/human_compatible/";
            },},{id: "books-superintelligence",
          title: 'Superintelligence',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/superintelligence/";
            },},{id: "news-i-just-graduated-fron-nsc-in-data-science",
          title: 'I just graduated fron NSc in Data Science!',
          description: "",
          section: "News",handler: () => {
              window.location.href = "/news/announcement_2/";
            },},{id: "projects-3d-scene-reconstruction-from-images",
          title: '3D Scene Reconstruction from Images',
          description: "Developed machine learning algorithms for the Image Matching Challenge 2025 that can figure out which images belong together and use them to reconstruct accurate 3D scenes.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%68%61%6E%61.%69%62%72%61%68%69%6D.%68%69%6C%6D%79@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/aibyhana", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/hana-h-ibrahim", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
