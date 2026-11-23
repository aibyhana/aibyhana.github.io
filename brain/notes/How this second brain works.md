---
date: 2026-11-23
tags: [note taking]
status: settled
summary: How to add a note, link it to others, and publish.
---

Every note in the second brain is one Markdown file in the folder `brain/notes`. The name of the file is the title of the note.

The other notes here are examples. Delete them once you have your own.

## Adding a note

1. Make a new file in `brain/notes`, for example `Bayes theorem.md`.
2. Write. Plain text is fine.
3. Save, and push the site like any other change.

A few lines at the top of the file are optional:

```yaml
---
date: 2026-11-23
tags: [statistics, probability]
status: seed
summary: One line that shows in lists.
---
```

`status` says how far along the note is: `seed` for a first thought, `growing` for one you are still working on, `settled` for one you trust.

> [!tip]
> You can open the folder `brain/notes` as a vault in Obsidian and write there. Links, tags and boxes like this one are written the same way.

## Linking notes

Put the name of another note in double square brackets: `[[Spaced repetition]]` becomes [[Spaced repetition]]. To show other words, write `[[Spaced repetition|spacing things out]]`.

You can link to a note that does not exist yet, like [[Evergreen notes]]. It shows with a dashed line, and the page with all notes lists everything that is waiting to be written.

Every note also shows which notes link to it. That is where the method comes from: see [[Zettelkasten]].

## Finding things

- **All notes** lists everything from A to Z.
- **Topics** groups notes by their tags.
- **Graph** draws the notes as dots and the links as lines.
- **Search** looks through all the text. Press `/` on any page of the second brain to go there.
