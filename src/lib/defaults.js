// What the site falls back on when a content file leaves something out.
export const WORDS = {
  research: "Research", programs: "Programs", now: "Now", books: "Books", blog: "Blog", cv: "CV", hello: "Contact me",
  researchTitle: "Research", booksTitle: "Books", programsTitle: "Courses and programs", blogTitle: "Blog", cvTitle: "CV",
  papers: "Papers on my desk", rightNow: "Right now", updated: "Updated {month}.", fig: "Fig.", project: "Project:",
  read: "Read.", reading: "Reading now.", next: "Up next.",
  latest: "Latest", kindBlog: "Blog", kindResearch: "Research", kindBook: "Book", kindPaper: "Paper", backTo: "Back to {kind}", readPaper: "Read the paper", prevPost: "Previous:", nextPost: "Next:", attn: "attention", abstract: "Abstract",
  back: "Back to all posts", older: "Older:", newer: "Newer:", halfWritten: "Half written", nothingYet: "Nothing here yet.",
  experience: "Experience", education: "Education", cvResearch: "Research", service: "Service", training: "Training", skills: "Skills", languages: "Languages",
  all: "See all", contents: "Contents", minutes: "{n} min read", copy: "Copy", copied: "Copied", brand: "", smaller: "Smaller text", larger: "Larger text",
  contact: "Contact", contactName: "Your name", contactEmail: "Your email", contactText: "Your message", contactSend: "Send", contactSending: "Sending.", contactSent: "Sent. Thank you.",
  contactMail: "Your mail app has opened with the message. Send it from there.", contactFail: "That did not go through. Please try again in a while.", contactNeed: "Please fill in your name, your email and a message.",
  contactDemo: "This is the preview. Nothing was sent.", contactSubject: "A message from {name}",
  about: "About", aboutTitle: "About me", contactTitle: "Contact me", booksHead: "Books", bookmarks: "Bookmarks", bookmarksTitle: "Bookmarks", allKinds: "All", videoKind: "Video", play: "Play here",
  brain: "Second brain", flip: "Flip", write: "Settings", skip: "Skip to the page", copyright: "© {year} {name}.", portrait: "A pixel portrait of {name}", photo: "A photo of {name}"
};
export const CLOCK = { place: "", zone: "UTC", line: "It's {time} in {place}.", asleep: "", run: "", weekend: "", work: "", evening: "", morning: "" };
export const LOOK = { paper: "#fdfcf8", font: "karla", flipped: false, nav: true, side: "none", feed: "tiles", pop: "#ffe45c", robot: true, plants: false, inkPicker: true };
export const PAGES = ["research", "programs", "books", "blog", "cv"];          // the parts of the home page that have a page of their own
export const HOME = [["research", "left"], ["programs", "left"], ["now", "right"], ["books", "right"], ["blog", "right"], ["cv", "right"], ["hello", "right"]].map(p => ({ key: p[0], col: p[1], show: true }));
// the fonts to choose from. Each sets the face and the overall size that suits it.
export const FONTS = {
  karla: { name: "Karla", css: "Karla:ital,wght@0,400;0,600;0,800;1,400", stack: '"Karla","Helvetica Neue",Helvetica,Arial,sans-serif', size: ".96" },
  plex: { name: "IBM Plex Sans", css: "IBM+Plex+Sans:ital,wght@0,400;0,600;0,700;1,400;1,600", stack: '"IBM Plex Sans","Helvetica Neue",Helvetica,Arial,sans-serif', size: ".89" },
  mono: { name: "IBM Plex Mono", css: "IBM+Plex+Mono:ital,wght@0,400;0,600;0,700;1,400", stack: '"IBM Plex Mono",ui-monospace,Menlo,Consolas,"Liberation Mono",monospace', size: ".84" },
  lora: { name: "Lora, like a paper", css: "Lora:ital,wght@0,400;0,600;0,700;1,400;1,600", stack: '"Lora",Georgia,"Times New Roman",serif', size: ".97" },
  dmsans: { name: "DM Sans with Crimson headings", css: "DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Crimson+Text:ital,wght@0,600;0,700;1,600", stack: '"DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif', size: ".94" },
  cardo: { name: "Cardo", css: "Cardo:ital,wght@0,400;0,700;1,400", stack: '"Cardo",Georgia,"Times New Roman",serif', size: "1" },
  plain: { name: "Helvetica or Arial", css: "", stack: '"Helvetica Neue",Helvetica,Arial,sans-serif', size: ".89" }
};
