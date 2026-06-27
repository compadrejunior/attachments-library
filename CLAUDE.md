# Attachments Library — Claude Instructions

## What this project is

An Obsidian community plugin that automatically indexes files in an `Attachments/` folder by creating YAML-frontmatter "sidecar" notes in a `Library/` folder. Each sidecar mirrors the attachment's folder structure (when `mirrorFolderStructure` is on), stores rich metadata (title, author, tags, status, etc.), and embeds the original file via `![[path]]`.

Vault installation path: `C:\Users\josec\obsidian\.obsidian\plugins\attachments-library\`

## Architecture

```
src/
  types.ts          — AttachmentsLibrarySettings, AttachmentMetadata, DEFAULT_SETTINGS, DEFAULT_METADATA
  main.ts           — Plugin entry point; vault events (create/delete/rename/modify), commands, settings tab
  sidecar-manager.ts — CRUD for sidecar notes; tag sanitization; property migration
  backfill.ts       — Batch-creates sidecars for pre-existing attachments
  bases-creator.ts  — Creates/updates Attachments Library.base for Obsidian Bases
  settings.ts       — PluginSettingTab UI
  pdf-extractor.ts  — Reads PDF metadata via pdf-lib (local); DOI/ISBN lookup via CrossRef/OpenLibrary
```

**Data flow:** `main.ts` listens for vault events → delegates to `SidecarManager` → reads/writes via `app.vault` and `app.fileManager.processFrontMatter`.

## Dev commands

```bash
npm run dev            # esbuild watch (development)
npm run build          # tsc type-check + esbuild production bundle
npm run test           # vitest (single run)
npm run test:watch     # vitest watch
npm run test:coverage  # vitest + coverage (fails if any metric < 90%)
npm run lint           # eslint src/ (0 errors required)
npm run lint:fix       # eslint src/ --fix
npm run pipeline       # lint → test:coverage → build (full CI check)
```

## Install to vault after build

```powershell
Copy-Item main.js     C:\Users\josec\obsidian\.obsidian\plugins\attachments-library\main.js -Force
Copy-Item manifest.json C:\Users\josec\obsidian\.obsidian\plugins\attachments-library\manifest.json -Force
```

Then in Obsidian: **Settings → Community Plugins → disable → re-enable Attachments Library**.

## Testing

- Framework: **Vitest v4** with `@vitest/coverage-v8`
- Config: `vitest.config.ts` — aliases `obsidian` → `__mocks__/obsidian.ts`
- Coverage thresholds: **90% lines, statements, branches, functions** (enforced in `vitest.config.ts`)
- Test files: `tests/*.test.ts`
- Mock pattern for class constructors: use `vi.fn(function() { return instance; })` — arrow functions break `new` in Vitest v4
- Use `vi.hoisted()` to share mock instances across `vi.mock` factories

```typescript
// Correct constructor mock pattern
const mockInstance = vi.hoisted(() => ({ method: vi.fn() }));
vi.mock('../src/my-module', () => ({
  MyClass: vi.fn(function() { return mockInstance; }),
}));
```

## ESLint

- Config: `eslint.config.mjs` (flat config, ESLint 10 + typescript-eslint v8)
- Type-aware rules for `src/**/*.ts`; relaxed rules for `tests/`, `__mocks__/`
- Separate `tsconfig.eslint.json` (standalone, no `extends`) with `"moduleResolution": "node"` — needed because typescript-eslint's parser rejects `"bundler"` via the project's TypeScript
- Known 10 warnings in `sidecar-manager.ts`: `no-unsafe-*` on `processFrontMatter` callbacks — these are inherent to the Obsidian API and are intentionally left as warnings

## Key conventions

- **Sidecar path**: mirrors attachment path under `Library/`, appends `.md`. Controlled by `mirrorFolderStructure` setting.
- **Tag sanitization**: spaces → hyphens, strips non-`[a-zA-Z0-9\-_/]`, collapses double hyphens, trims leading/trailing hyphens/underscores.
- **Frontmatter field `tagsPropertyName`**: defaults to `"tags"` (activates Obsidian's native tag chip UI). Renaming via UI uses `migrateTagsProperty` which iterates all sidecars.
- **`_heuristic: true`** in sidecar frontmatter means metadata was auto-extracted (PDF or DOI/ISBN) and may need human review.
- **`processFrontMatter`** callback argument is typed `any` by Obsidian — expected ESLint warnings here are fine.

## TypeScript

- Version: **5.x** (required for `"moduleResolution": "bundler"` in `tsconfig.json`)
- `tsconfig.json` targets ES6, module ESNext, includes only `src/**/*.ts`
- `tsconfig.eslint.json` additionally includes `tests/`, `__mocks__/`, `vitest.config.ts`

## Dependencies

- `pdf-lib` — local PDF metadata extraction (no server needed)
- `pdfjs-dist` — PDF rendering (bundled; keep at ^4.x to avoid Snyk CVE-2024-4367)
- `esbuild` — bundler (keep at ^0.28.x; 0.17.x had dev-server CVE)
- `obsidian` — type stubs only (not bundled; provided by Obsidian at runtime)
