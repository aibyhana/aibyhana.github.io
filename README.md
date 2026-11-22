# The site

The site at https://aibyhana.github.io/

It is an [Astro](https://astro.build) project. Your words are files in `public/content`. GitHub builds the pages from them after every change and puts them online. Every page has its own address, like `/research/lorem-ipsum/` or `/blog/2026-01-15-lorem-ipsum-dolor-sit-amet/`.

## Placeholder text

Every text on the site is placeholder text right now: lorem ipsum. The name, the projects, the posts, the CV and the links are all made up, and the photo is a drawn figure. Nothing of it is real. Put your own words in through Settings, or change the files in `public/content`.

## Put it online

1. Create a public repo on GitHub named `aibyhana.github.io`. If it already exists, use that one. If it holds files of an older version, delete them first.
2. Unzip `aibyhana-site.zip` on your computer.
3. Open the repo on GitHub. Click Add file, then Upload files. In a new, empty repo the link is called "uploading an existing file".
4. Open the unzipped folder, select everything in it and drag it onto that page. The folders `public` and `src` have to be dragged, so what is inside them comes along. `package.json` must end up at the top of the repo, next to `public` and `src`. Click Commit changes.
5. Check that the repo has the file `.github/workflows/deploy.yml`. Its folder starts with a dot, so many computers hide it and it may not come along. If it is missing: click Add file, then Create new file. Type `.github/workflows/deploy.yml` as the name. Paste the text from "The workflow file" at the end of this page. Commit.
6. In the repo, open Settings, then Pages. Under Build and deployment, set Source to GitHub Actions.
7. Open the Actions tab. A run called "Build and publish the site" starts by itself after each change. If none is running, pick it in the list on the left and click Run workflow.
8. When the run has a green tick, open https://aibyhana.github.io/

A run takes a minute or two.

With git it is shorter, and hidden files always come along:

```
git clone https://github.com/aibyhana/aibyhana.github.io.git
cd aibyhana.github.io
unzip -o ~/Downloads/aibyhana-site.zip
git add -A
git commit -m "The site as an Astro project"
git push
```

Step 6 is still needed once. If git refuses to push the workflow file, make that file on GitHub as in step 5 and push the rest.

### If a run fails

A red cross in the Actions tab means the site was not built. The site that was online before stays online. Click the run, then the step with the red cross. The lines there say what went wrong.

- "is not valid JSON" names a file in `public/content`. A comma or a quote is missing in it. Settings never writes a broken file, so this only happens after an edit by hand.
- "Pages" or "not enabled" in the deploy step means step 6 is missing. Set it, then click Re-run all jobs.

### Try it on your computer

You do not need this to run the site. It is for looking at a change before it goes online.

1. Install Node.js, version 22.12 or newer.
2. In the project folder, run `npm install` once.
3. Run `npm run dev` and open the address it prints. It starts with http://localhost

`npm run build` writes the finished site into the folder `dist`. On your computer Settings is a demo: it shows everything and saves nothing.

## Settings

Open https://aibyhana.github.io/settings/

This is where you write and where you change the site.

The page is private. Without your token it shows a sign-in box and nothing else. Visitors get no link to it, and search engines are told to leave it out.

Sign in once per browser with a GitHub token:

1. Open https://github.com/settings/personal-access-tokens/new
2. Give the token a name and an expiry date.
3. Repository access: Only select repositories, then this repo.
4. Permissions: Contents, Read and write.
5. Create the token and paste it into Settings.

The token stays in that browser. It is sent to GitHub and nowhere else. Signing out forgets it. When it expires, make a new one.

Each save is one commit. GitHub then builds the site again, and the change is online after a minute or two. Settings itself shows it at once. The Actions tab of the repo shows the run.

### How Settings is laid out

Settings is a page of its own. The bar and the footer of the site are not on it. "Back to the site" in the column on the left leads home.

The column on the left lists the parts, in three groups.

- Writing: Posts, Research, Reading, Bookmarks, Programs, CV, Now.
- Site: Profile, Photo, Pages, Appearance, Labels.
- Account: signing in and out.

Posts opens as a list, drafts first. "New post" opens a page of its own for the post. "All posts" leads back, and a post that is not saved yet is kept. Publish, Save as draft and Delete stay in a bar at the bottom.

Every other part is a form. Its Save button stays in a bar at the bottom of the screen, and the bar says "Not saved yet." after a change. Research, Reading and Programs have a button beside the title that adds a new one.

### Writing a post

- Type `/` on a new line. A small menu opens with everything that can be put in: heading, list, to-do, quote, code, table, note, tip, warning, fold, formula, line, picture. Type a few letters to narrow it, Enter to pick, Escape to close.
- A list carries on by itself when you press Enter. An empty item ends it. Inside a list, Tab moves a line in and Shift+Tab moves it out.
- Mark some words and type `*`, a backtick or `[` to wrap them. Ctrl+B, Ctrl+I and Ctrl+K do bold, italic and link. On a Mac it is Cmd.
- Mark some words and paste an address. They become a link.
- Paste a picture or drop one into the text. It is added like with the Picture button.
- Three views: Write, Side by side, Read. The page remembers the one you picked.
- Focus takes everything off the page but the entry. Escape brings it back.
- Ctrl+S saves a draft. Ctrl+Enter publishes.
- Unsaved text is kept in the browser, so a closed tab loses nothing.

A research write-up has the same `/` menu and keys. "Show how it will look" under its text opens the finished look.

### Writing in Obsidian or Notion

You can write somewhere else and bring the note in.

- Bring in a note: pick a Markdown file, or drop it into the text. It opens as a new entry. Nothing is published until you press Publish.
- From Obsidian: the file of the note itself. Properties at the top give the title, the date and the line under the title (`title`, `date`, `description`). Callouts, highlights, footnotes, tables, code and to-do lists come over as they are. Links between notes become plain words.
- From Notion: export the page as Markdown, unzip it, and bring in the `.md` file. Callouts become notes.
- Pictures do not come along. Each one leaves a marked line, like "Picture: plot.png". Add the picture there with the Picture button.
- Save as a note does the opposite. It saves the open entry as a Markdown file on your device, with the title and date at the top.
- You can also skip Settings. A post is one Markdown file in `public/content/posts`. Put a file there on GitHub and it is a post. See "A post is a file" below.

## A post is a file

Every post is one Markdown file in `public/content/posts`. The name of the file is the address of the post: `lorem-ipsum.md` shows at `/blog/lorem-ipsum/`.

The file starts with a few lines between two rows of dashes. The text follows.

```
---
title: Lorem ipsum
date: 2026-01-15
draft: false
teaser: One line that shows under the title in lists.
topic: Lorem
---

The first paragraph.
```

- A post is online when it has a `date`, written as year-month-day, and `draft` is not `true`.
- `teaser` and `topic` can be left out.
- Settings puts quotes around a title or teaser that holds a colon or a `#`. Other apps, like Obsidian, want that. By hand you can write it either way.
- There is no list of posts to keep in step. Settings reads the folder, so a post you add or change by hand shows up there too.

## How the site looks

The site is a researcher's home page in serif. The text is ink on paper. There is one colour beside the ink, blue, and every part of the site has its own pattern in that colour.

- Every page has an address of its own. `/research/` lists the projects and `/research/lorem-ipsum/` is one of them. A post is at `/blog/` plus its name. A link to a page shows its own title and first line when it is shared, and search engines can read it.
- One typeface for everything: Lora. It is easy to read at text size. Code is set in IBM Plex Mono.
- One colour: blue. It is the second colour in your list under Appearance. Change it there and the links, lines and patterns change with it. The other colours in that list are only for the colour picker in the footer.
- Patterns: Research has dots, Blog has hatching, Reading has ruled lines, the CV has cross hatching, Contact has checks, Bookmarks has small pennants, About me has rings, and Now, inside About me, has upright lines. A band of the pattern runs beside the name of each part on the home page and on top of its own page.
- The name and the links stand in a column on the left of the home page and of every page that lists things. The column stays in place while the page scrolls. On a screen narrower than 1100 pixels, like a phone, there is no room for it, so the links are a bar on top there.
- The name over the links leads home. The places for your work come first: Research, Reading, Blog, Bookmarks. About, CV and Contact stand apart and smaller. The page you are on has a line under its link. Which links show, and in which order, is set in Settings under Pages. The name is a label: Settings, Labels, "The name over the links".
- The home page has three parts: Research, Blog and Reading. Each shows its latest three, and "See all" beside the heading opens the full list. Bookmarks, Programs and Contact are not on the home page.
- Latest means first in the list. Posts and anything else with a date are sorted newest first. The rest keep the order you gave them in Settings.
- On the home page a book is a small cover with its title and author on it. Its status stands under the cover.
- About me is a page of its own, at `/about/`. It holds your description, your photo and your links.
- Now is a part of the About me page, under your description and links. It shows the short list, the time where you live, and the month you last saved it. The address `/about/#now` opens About me at that part. Untick Now under Pages to hide it.
- Bookmarks is a page of its own, at `/bookmarks/`. It holds what you find worth keeping: websites, videos, articles, papers, tools. Each row has the title, what it is and who made it, and your line on why. The title opens the link in a new tab.
- A bookmark can say what kind of thing it is, in your own word. With two kinds or more, the kinds stand on top of the page as a filter. A link to YouTube or Vimeo with no kind counts as a video.
- A video on YouTube or Vimeo has a "Play here" link. A click on it opens the player under the title. Before that click nothing is loaded from those sites.
- The link to Bookmarks appears once the list holds one.
- On the About me page your photo is printed as dots in the ink colour, on a shadow of rings. A line of your own stands under it. Click it for a few flying squares.
- Research is a row of plates, one drawing per project. Each drawing stands on a solid light blue, with no pattern behind it. A plate fills with blue when you point at it. A real figure from a report goes into the write-up as a picture.
- Reading is the page of papers and books, at `/reading/`. The papers come first, then the books, both as plain lists. A book has a square: full for read, half for reading, empty for next.
- Research, Reading and Blog open as lists.
- A post can have a topic. The topics are a list in Settings under Pages. A post picks one in its Topic box. In a list the topic stands under the date. Once posts of two kinds exist, the Blog page gets a filter by topic on top.
- A project, a post, a book or a paper opens alone on its page, as one centred column made for reading. The column of links is not there. A slim line stays on top of the text while it scrolls: the way back to the list on the left, the name of the site for home on the right.
- A thin line on top grows as you read. Two buttons under the title, A− and A+, make the text smaller or larger. The browser remembers the choice.
- Subheadings are small on purpose: on the home page, on the list pages and inside a text.
- Contact is a page of its own, at `/contact/`: your line, your links and a small form. See "The contact form" below.
- A long text gets a list of contents. Three headings or more switch it on. On a wide screen it stands in the left margin, grey until you point at it, with the part you are reading marked. On a narrow screen it is folded above the text.
- A project shows its facts at the end of the text, and a long one says how long it takes to read.
- Programs has no page and no link. Its groups stand in the CV, after Research. The address `/cv/#programs` opens the CV at that place. Untick Programs under Pages to take the programs out of the CV.
- A robot walks on the line above the footer. A click switches it off.
- The colour of the ink is picked from a list in the footer, with Flip beside it for a dark page.
- The look is kept plain on purpose. Italics are for the names of the parts and for captions. A note in a post is a plain frame. A table is ruled like in a paper: a line on top, one under the head, one at the end.

Boxes that belong to earlier designs are gone from Settings: the pixel portrait, the list style, the links on top, the plants, the big line on the home page and the line under CV.

## Formatting a blog entry or a research write-up

Both take the same marks. Settings lists them under "Formatting help", next to the text field.

| You write | You get |
| --- | --- |
| `# Heading`, `## Smaller`, `### Smallest` | Headings. Three or more give the text a list of contents. |
| `**bold**` `*italic*` `==marked==` `~~struck~~` | Marks inside a sentence. Marked text gets the highlighter. |
| `[words](https://address)` | A link |
| `- item` or `1. item` | A list. Two spaces in front put a line inside the one above. |
| `- [x] done` and `- [ ] not yet` | A list with full and empty squares |
| `> text` | A quote |
| `> [!NOTE] Title` then `> text` | A boxed note. NOTE, TIP, IMPORTANT and WARNING work. |
| three backticks, a language and a title, the code, three backticks | Code with a Copy button, in the colours of the Dracula theme. A long line folds under itself. |
| `` `code` `` | Code inside a sentence |
| rows of cells between upright lines, with a second row of dashes | A table. `---:` puts a column on the right. A line starting with a colon is the caption. |
| `text[^1]` and, on its own line, `[^1]: the note` | A footnote |
| `![what it shows](address "Caption")` | A picture with a caption |
| `![Caption](fig:flip)` | One of the drawings: leak, ablate, probe, ioi, steer, flip |
| `$p_i$` and `$$ ... $$` | A small formula |
| `::: details Title`, the text, `:::` | A part that opens on a click |
| `---` | A line across |

A new post starts with "New post" in Posts. A new project, book or program group starts with the button beside the title of its part.

## What each part of Settings holds

- Posts: blog entries, with pictures. The editor has a Topic box beside the date.
- Research: projects and their write-ups. A fact of a project can hold a link, written as `[words](address)`. A project picks its drawing from a list. A picture in a write-up is a line of its own: `![what it shows](content/img/name.png "Caption")`. The file goes into `public/content/img`. In the text its address stays `content/img/name.png`.
- Reading: papers and books.
- Programs and CV. Programs shows inside the CV page.
- Bookmarks: the links you find worth keeping. Title, link, what it is, who made it, how long it is, the day you added it, and why. Only the title and the link are needed.
- Now: the short list on the About me page. The month under it is set when you save.
- Profile: your name, the description on the About me page, the contact form and its links, the line under your photo, what the robot says.
- Photo: change the photo on the About me page, and show it as dots or as it is.
- Pages: which pages the site has, the order of their links, the line under each page title, the topics of your blog, and which AI crawlers are asked to stay out. The lines under the titles are empty now. Write one only if you want one.
- Appearance: the colours and their names, the paper, the highlighter, the font, the robot, the colour list in the footer.
- Labels: every label on the site, also the name over the links and the words of the contact form.

## The contact form

The form needs one thing from you: where it sends. Settings, Profile, "Where the contact form sends". Until that box is filled in, the form does not show on the site. In a preview and on your own computer it shows, and nothing is sent.

You can put one of two things in that box.

- Your email address. A visitor writes the message and clicks Send. Their own mail app opens with the message filled in, and they send it from there. Your address is then public, because the settings file is in a public repo.
- The address of a form service. It starts with `https`. The message goes to the service in the background, the service emails it to you, and the page says "Sent. Thank you." Your email address stays private. The form sends three things: `name`, `email` and `message`.

Formspree is one such service. You make an account there, make a form, and it gives you an address that looks like `https://formspree.io/f/` plus a short code. Its free plan takes 50 messages a month (checked in November 2026).

A box that visitors cannot see catches simple spam robots. Every label of the form is under Labels.

## AI crawlers

The site has a file `robots.txt`. Crawlers read it before they read the site. It is built with the site, at `/robots.txt`.

It asks two kinds of crawlers to stay out:

- Crawlers that collect text to train AI models, like GPTBot, ClaudeBot and Common Crawl. It also tells Google and Apple not to train on your pages.
- Crawlers that build an index for AI search, like those of ChatGPT, Claude and Perplexity.

Each kind is a tick box in Settings, under Pages. The names behind them are in `src/lib/robots.js`. New crawlers appear over time, so that list needs a look now and then.

Search engines like Google and Bing are not kept out. Assistants that open one page because a person asked for it are not kept out either.

What this file cannot do:

- It is a request. The large AI companies follow it for the crawlers they name. Nothing forces a crawler to.
- Google's AI answers and Bing's Copilot read with the normal search crawlers. `robots.txt` cannot keep them out without leaving Google and Bing search.
- The repo is public. Your text can also be read on GitHub, where this file does not apply.
- Real blocking needs a service in front of the site, like Cloudflare. That needs a domain of your own.

## The files

- `public/content/` has your words. Settings changes these files and nothing else.
  - `site.json`: name, intro, every label, the colours, what shows and in which order
  - `now.json`, `research.json`, `books.json`, `programs.json`, `cv.json`
  - `bookmarks.json`: the list of bookmarks
  - `posts/`: one Markdown file per post
  - `img/`: your photo and the pictures in posts and write-ups
- `public/site.css` is the design: every colour, size and pattern.
- `src/pages/` has one small file per kind of page. Their names are the addresses: `about.astro` is `/about/`, `blog/[id].astro` is every post.
- `src/layouts/Layout.astro` is the frame around every page: the head, the links, the footer.
- `src/lib/` builds the pages from your content. `pages.js` writes each page, `markdown.js` turns the text of a post into a page, `figures.js` holds the drawings of the research projects.
- `src/scripts/` is what runs in the browser. `site.js` is for the pages: the colour list, the contents of a long text, the filters, the contact form, the robot. `settings-app.js` and `settings-host.js` are Settings. They load only on `/settings/`.
- `astro.config.mjs` and `package.json` tell Astro what to build.
- `.github/workflows/deploy.yml` tells GitHub to build the site and put it online.

The feed is at `/feed.xml` and the note for crawlers at `/robots.txt`. Both are built with the site.

## Good to know

- Your photo is shown as dots in the ink colour. The file in `public/content/img/` is still the normal photo, and the repo is public.
- Drafts are saved in this repo too, so drafts are not secret.
- A draft with a one-line teaser is listed on the Blog page under Half written. A draft without one is not listed.
- Links of the older kind in your texts still work. `#work-lorem-ipsum` leads to `/research/lorem-ipsum/`, `#blog` to `/blog/`.
- If the site moves to another address, change `url` and `repo` at the top of `public/content/site.json`, and `site` in `astro.config.mjs`. Settings only locks itself on the address in `url`.

## The workflow file

This is the text of `.github/workflows/deploy.yml`, for step 5 of "Put it online".

```yaml
# Builds the site and puts it online. It runs by itself after every change on the main branch.
# One setting has to be made once, in the repo on GitHub: Settings, Pages, Source: "GitHub Actions".
name: Build and publish the site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          package-manager-cache: false
      - run: npm install
      - run: npm run build
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```
