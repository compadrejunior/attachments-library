# Attachments Library

An [Obsidian](https://obsidian.md) plugin that automatically indexes files in your `Attachments` folder by creating rich metadata sidecar notes in a separate `Library` folder — without modifying a single attachment.

## Why

Obsidian's drag-and-drop workflow is great for collecting PDFs, images, videos, and documents, but it gives you no way to annotate them with metadata (title, author, status, keywords) that survives renaming or moving files. Attachments Library solves this by maintaining a parallel library of lightweight notes — one per attachment — that you can search, filter, and view with [Obsidian Bases](https://obsidian.md/bases).

## Features

- **Automatic indexing** — a sidecar note is created the moment you drop a file into your Attachments folder.
- **PDF metadata extraction** — reads embedded `title`, `author`, `subject`, and `keywords` directly from PDF files, locally and without any internet connection.
- **DOI / ISBN lookup** — optionally enriches metadata by querying [CrossRef](https://www.crossref.org) (DOI) and [OpenLibrary](https://openlibrary.org) (ISBN). No API key required.
- **Mirrored folder structure** — subfolders inside `Attachments/` are automatically replicated in `Library/`, keeping your library organised.
- **Lifecycle sync** — renaming or deleting an attachment renames or removes its sidecar note automatically.
- **Backfill** — one command indexes all pre-existing files that don't have a sidecar yet. Existing notes are never overwritten.
- **Obsidian Bases integration** — automatically creates an `Attachments Library.base` file so you can browse, sort, and filter your entire library in a spreadsheet-like view.
- **Multilanguage UI** — the settings interface is available in English and Brazilian Portuguese, following Obsidian's language setting automatically.
- **Configurable** — choose which folder to watch, which file extensions to track, and which automatic behaviours to enable.

## Installation

### Community Plugins (recommended)

1. Open Obsidian → **Settings → Community plugins**.
2. Make sure **Restricted mode** is **off**.
3. Click **Browse**, search for **Attachments Library**, and click **Install**.
4. Enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/compadrejunior/attachments-library/releases/latest).
2. Copy the three files into your vault's plugin folder:

   ```
   <your-vault>/.obsidian/plugins/attachments-library/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

3. Open Obsidian → **Settings → Community plugins**, find **Attachments Library** in the installed list, and enable it.

### Building from source

```bash
git clone https://github.com/compadrejunior/attachments-library
cd attachments-library
npm install
npm run build
```

The compiled `main.js` will appear in the project root alongside `manifest.json` and `styles.css`.

## How it works

When you add a file to your `Attachments` folder, the plugin creates a Markdown sidecar note in the `Library` folder with YAML frontmatter containing the file's metadata:

```yaml
---
attachment: "Attachments/Papers/some-paper.pdf"
title: "The Paper Title"
author: "Jane Doe"
tags:
  - machine-learning
  - neural-networks
subject: "Computer Science"
genre: ""
source: ""
status: unread
notes: ""
created: 2026-06-27T10:00:00
updated: 2026-06-27T10:00:00
_fileType: pdf
_filePath: "Attachments/Papers/some-paper.pdf"
_heuristic: false
---

![[Attachments/Papers/some-paper.pdf]]
```

The `_heuristic: true` flag marks notes whose metadata was auto-extracted (from PDF or a DOI/ISBN lookup) and may need human review.

**Status values:** `unread` · `reading` · `done` · `archived` · `discarded`

## Configuration

Open **Settings → Attachments Library** to adjust the plugin's behaviour.

| Setting | Default | Description |
|---|---|---|
| Attachments Folder | `Attachments` | Folder to watch. Should match Obsidian's *Default location for new attachments* setting. |
| Library Folder | `Library` | Where sidecar notes are created. |
| Mirror subfolder structure | On | Replicates subfolders from `Attachments/` into `Library/`. |
| Auto-create note on new file | On | Creates a sidecar whenever a watched file is added. |
| Auto-delete note on file removal | On | Moves the sidecar to the system trash when the attachment is deleted. |
| Extract embedded PDF metadata | On | Reads `title`, `author`, `subject`, and `keywords` from PDF files locally. |
| Online DOI / ISBN lookup | Off | Queries CrossRef and OpenLibrary to enrich metadata. No API key needed. |
| Auto-create Bases file | On | Creates and updates `Attachments Library.base` in your vault root. |
| Bases file location | *(vault root)* | Custom folder where the `.base` file is created. Leave blank for the vault root. |
| Tags property name | `tags` | YAML property used for tags. Use `tags` to get Obsidian's native tag chip UI. |

**Watched extensions (default):** `.pdf` `.epub` `.docx` `.xlsx` `.pptx` `.png` `.jpg` `.jpeg` `.gif` `.mp4` `.mp3` `.zip`

## Commands

| Command | Description |
|---|---|
| **Index all existing files (Backfill)** | Creates sidecar notes for every file in the Attachments folder that doesn't have one yet. Already-indexed files are skipped. |
| **Create metadata note for active file** | Creates a sidecar for whichever attachment is currently open or selected. |

Access commands via the Command Palette (`Ctrl/Cmd + P`).

## Obsidian Bases

When enabled, the plugin automatically creates an `Attachments Library.base` file in your vault. Open it to get a table view of your entire attachment library — sortable and filterable by title, author, status, file type, and more.

You can customise the location of the `.base` file via the **Bases file location** setting.

## Requirements

- Obsidian **1.7.0** or later.
- Works on desktop and mobile.

## Contributing

Bug reports and pull requests are welcome at [github.com/compadrejunior/attachments-library](https://github.com/compadrejunior/attachments-library).

## License

[MIT](LICENSE)
