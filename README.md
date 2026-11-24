
### How Settings is laid out

Settings is a page of its own. The bar and the footer of the site are not on it. "Back to the site" in the column on the left leads home.

The column on the left lists the parts, in four groups. Writing stands apart from the rest, on top.

- Writing: Posts, Second brain.
- Content: Research, Reading, Bookmarks, Programs, CV, Now.
- Site: Profile, Photo, Pages, Appearance, Labels.
- Account: signing in and out.

There is no link to Settings on the site. Its address is the address of the site followed by `/settings/`.

Second brain opens as a list of the notes. A line on top says how many notes, links and topics there are. The list can be searched, narrowed to one stage or one topic, and put in another order. Each note shows its topics, how many notes link to it and from it, and how long it is. Under the list stand the names that notes link to and that have no note yet. "Write it" starts one. A note opens on a page of its own: title, date, topics to tick, stage, one line for lists, the text, and under it the notes that link to it. Options holds how the second brain shows on the site: its name, the line under its title, how many notes the overview lists, the map, the link to GitHub under a note, and the names of the three stages.

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

## Formatting a blog entry or a research write-up

Both take the same marks. Settings lists them under "Formatting help", next to the text field.

| You write | You get |
| --- | --- |
| `# Heading`, `## Smaller`, `### Smallest` | Headings. Three or more give the text a list of contents. |
| `**bold**` `*italic*` `==marked==` `~~struck~~` | Marks inside a sentence. Marked text gets the highlighter. |
| `[words](https://address)` | A link |
| `- item` or `1. item` | A list. Two spaces in front put a line inside the one above. |
| `- [x] done` and `- [ ] not yet` | A list with full and empty dots |
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

## The second brain

The part of the site at `/brain/` is for notes on what you learn. Each note is one Markdown file in the folder `public/content/brain/notes`, and the name of the file is the title of the note.

There are two ways to write one:

- In Settings, under Second brain. New note opens an empty one. A note has a title, a date, topics, how far along it is, one line for lists, and its text. Save writes the file.
- As a file. Put a Markdown file into `public/content/brain/notes`, or open that folder as a vault in Obsidian. A few lines at the top are optional, between two rows of `---`: `date`, `tags` (the topics), `status` (`seed`, `growing` or `settled`), `summary` (the line in lists), `draft: true` (keeps the note off the site).

What a note can hold:

- `[[Spaced repetition]]` links to the note with that name. `[[Spaced repetition|other words]]` shows other words. `[[Spaced repetition#In practice]]` leads to a heading. `![[plot.png]]` shows the picture `public/content/brain/attachments/plot.png`.
- A link to a note that does not exist yet is allowed. It shows with a dashed line, and the page with all notes lists what is waiting to be written.
- Every note shows the notes that link to it, the notes it links to, and a small map of both. The rest is the same Markdown as in a post: boxes, tables, code, footnotes.
- A new title is a new file name. Links that used the old name then lead to a note that is not written, until they are changed too.

The About page of the second brain is `public/content/brain/about.md`. Settings opens it from the foot of the list of notes. The line `intro:` at its top is the line under the title of the overview.

The link "Second brain" beside the pages can be switched off in Settings, under Pages. The garden at `/garden/` draws every note, post and project as a plant. Its link can be switched off under Pages too.

## The contact form

The form needs one thing from you: where it sends. Settings, Profile, "Where the contact form sends". Until that box is filled in, the form does not show on the site. In a preview and on your own computer it shows, and nothing is sent.

You can put one of two things in that box.

- Your email address. A visitor writes the message and clicks Send. Their own mail app opens with the message filled in, and they send it from there. Your address is then public, because the settings file is in a public repo.
- The address of a form service. It starts with `https`. The message goes to the service in the background, the service emails it to you, and the page says "Sent. Thank you." Your email address stays private. The form sends three things: `name`, `email` and `message`.

Formspree is one such service. You make an account there, make a form, and it gives you an address that looks like `https://formspree.io/f/` plus a short code. Its free plan takes 50 messages a month (checked in November 2026).

A box that visitors cannot see catches simple spam robots. Every label of the form is under Labels.
