import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TFile } from 'obsidian';
import { SidecarManager } from '../src/sidecar-manager';
import { DEFAULT_SETTINGS, AttachmentsLibrarySettings } from '../src/types';

const mockExtract = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    title: '', author: '', subject: '', keywords: [],
    creationDate: null, modificationDate: null,
  })
);

vi.mock('../src/pdf-extractor', () => ({
  PdfMetadataExtractor: vi.fn(function () { return { extract: mockExtract }; }),
}));

function makeTFile(props: {
  path: string;
  extension: string;
  basename?: string;
  name?: string;
  stat?: { ctime: number; mtime: number };
}): TFile {
  const f = new TFile();
  f.path = props.path;
  f.extension = props.extension;
  f.basename = props.basename ?? props.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  f.name = props.name ?? (props.path.split('/').pop() ?? '');
  f.stat = props.stat ?? { ctime: 1_700_000_000_000, mtime: 1_700_000_001_000 };
  return f;
}

function makeApp(options: {
  sidecarExists?: boolean;
  markdownFiles?: any[];
} = {}) {
  const { sidecarExists = false, markdownFiles = [] } = options;
  const app = {
    vault: {
      getFileByPath: vi.fn().mockReturnValue(sidecarExists ? { path: 'Library/file.md' } : null),
      create: vi.fn().mockResolvedValue(undefined),
      createFolder: vi.fn().mockResolvedValue(undefined),
      trash: vi.fn().mockResolvedValue(undefined),
      getMarkdownFiles: vi.fn().mockReturnValue(markdownFiles),
    },
    fileManager: {
      processFrontMatter: vi.fn().mockImplementation(async (_file: any, cb: (fm: any) => void) => {
        cb({});
      }),
      renameFile: vi.fn().mockResolvedValue(undefined),
    },
  };
  return app;
}

const defaults: AttachmentsLibrarySettings = { ...DEFAULT_SETTINGS };

describe('SidecarManager', () => {
  beforeEach(() => {
    mockExtract.mockClear();
    mockExtract.mockResolvedValue({
      title: '', author: '', subject: '', keywords: [],
      creationDate: null, modificationDate: null,
    });
  });

  // ─── getSidecarPath ───────────────────────────────────────────────────────

  describe('getSidecarPath', () => {
    it('mirrors subfolder structure when mirrorFolderStructure is true', () => {
      const sm = new SidecarManager(makeApp() as any, { ...defaults, mirrorFolderStructure: true });
      expect(sm.getSidecarPath('Attachments/sub/file.pdf')).toBe('Library/sub/file.pdf.md');
    });

    it('flattens path when mirrorFolderStructure is false', () => {
      const sm = new SidecarManager(makeApp() as any, { ...defaults, mirrorFolderStructure: false });
      expect(sm.getSidecarPath('Attachments/sub/file.pdf')).toBe('Library/file.pdf.md');
    });

    it('handles root-level attachment', () => {
      const sm = new SidecarManager(makeApp() as any, { ...defaults, mirrorFolderStructure: true });
      expect(sm.getSidecarPath('Attachments/file.pdf')).toBe('Library/file.pdf.md');
    });

    it('uses custom attachmentsFolder and libraryFolder', () => {
      const sm = new SidecarManager(makeApp() as any, {
        ...defaults,
        attachmentsFolder: 'Files',
        libraryFolder: 'Notes',
        mirrorFolderStructure: true,
      });
      expect(sm.getSidecarPath('Files/book.pdf')).toBe('Notes/book.pdf.md');
    });

    it('escapes special regex characters in folder names', () => {
      const sm = new SidecarManager(makeApp() as any, {
        ...defaults,
        attachmentsFolder: 'My.Files',
        mirrorFolderStructure: true,
      });
      expect(sm.getSidecarPath('My.Files/book.pdf')).toBe('Library/book.pdf.md');
    });
  });

  // ─── getAttachmentPath ────────────────────────────────────────────────────

  describe('getAttachmentPath', () => {
    it('converts sidecar path back to attachment path', () => {
      const sm = new SidecarManager(makeApp() as any, defaults);
      expect(sm.getAttachmentPath('Library/file.pdf.md')).toBe('Attachments/file.pdf');
    });

    it('preserves subfolder structure', () => {
      const sm = new SidecarManager(makeApp() as any, defaults);
      expect(sm.getAttachmentPath('Library/sub/file.pdf.md')).toBe('Attachments/sub/file.pdf');
    });
  });

  // ─── createSidecar ────────────────────────────────────────────────────────

  describe('createSidecar', () => {
    it('returns early when sidecar already exists', async () => {
      const app = makeApp({ sidecarExists: true });
      const sm = new SidecarManager(app as any, defaults);
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      expect(app.vault.create).not.toHaveBeenCalled();
    });

    it('creates the sidecar file when it does not exist', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, defaults);
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.epub', extension: 'epub', basename: 'file', name: 'file.epub' }));
      expect(app.vault.create).toHaveBeenCalledWith(
        expect.stringContaining('.md'),
        expect.any(String),
      );
    });

    it('creates parent folder before creating sidecar', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, mirrorFolderStructure: true });
      await sm.createSidecar(makeTFile({ path: 'Attachments/sub/file.epub', extension: 'epub' }));
      expect(app.vault.createFolder).toHaveBeenCalledWith('Library/sub');
    });

    it('uses attachment basename as title when no extracted title', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: false });
      await sm.createSidecar(makeTFile({ path: 'Attachments/my-book.epub', extension: 'epub', basename: 'my-book', name: 'my-book.epub' }));
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('title: "my-book"');
    });

    it('does not call pdf extractor for non-pdf files', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, defaults);
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.epub', extension: 'epub' }));
      expect(mockExtract).not.toHaveBeenCalled();
    });

    it('does not call pdf extractor when extraction is disabled', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: false });
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      expect(mockExtract).not.toHaveBeenCalled();
    });

    it('calls pdf extractor for pdf files when enabled', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: true });
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      expect(mockExtract).toHaveBeenCalled();
    });

    it('sets title and _heuristic from extracted pdf metadata', async () => {
      mockExtract.mockResolvedValueOnce({
        title: 'Extracted Title', author: 'Jane Doe', subject: '', keywords: [],
        creationDate: null, modificationDate: null,
      });
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: true });
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('title: "Extracted Title"');
      expect(content).toContain('author: "Jane Doe"');
      expect(content).toContain('_heuristic: true');
    });

    it('sets tags from extracted pdf keywords', async () => {
      mockExtract.mockResolvedValueOnce({
        title: 'Title', author: 'Author', subject: 'CS', keywords: ['ai', 'ml'],
        creationDate: null, modificationDate: null,
      });
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: true });
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('- ai');
      expect(content).toContain('- ml');
    });

    it('falls back to basename when pdf extraction yields no title', async () => {
      mockExtract.mockResolvedValueOnce({
        title: '', author: '', subject: '', keywords: [],
        creationDate: null, modificationDate: null,
      });
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: true });
      await sm.createSidecar(makeTFile({ path: 'Attachments/my-doc.pdf', extension: 'pdf', basename: 'my-doc' }));
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('title: "my-doc"');
      expect(content).toContain('_heuristic: false');
    });

    it('renders empty tags as []', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: false });
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.epub', extension: 'epub', basename: 'file', name: 'file.epub' }));
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('tags: []');
    });

    it('uses custom tagsPropertyName in sidecar frontmatter', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, tagsPropertyName: 'keywords', enablePdfMetadataExtraction: false });
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.epub', extension: 'epub', basename: 'file', name: 'file.epub' }));
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('keywords: []');
    });

    it('sidecar content includes attachment wikilink', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: false });
      const file = makeTFile({ path: 'Attachments/doc.epub', extension: 'epub', basename: 'doc', name: 'doc.epub' });
      await sm.createSidecar(file);
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('[[Attachments/doc.epub]]');
    });

    it('includes created and updated dates from file stat', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: false });
      const file = makeTFile({
        path: 'Attachments/doc.epub', extension: 'epub', basename: 'doc', name: 'doc.epub',
        stat: { ctime: 1_700_000_000_000, mtime: 1_700_000_001_000 },
      });
      await sm.createSidecar(file);
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      const expectedDate = new Date(1_700_000_000_000).toISOString().split('T')[0];
      expect(content).toContain(`created: "${expectedDate}"`);
    });

    it('sanitizes pdf keywords with spaces into hyphenated tags', async () => {
      mockExtract.mockResolvedValueOnce({
        title: 'T', author: 'A', subject: '', keywords: ['machine learning'],
        creationDate: null, modificationDate: null,
      });
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, { ...defaults, enablePdfMetadataExtraction: true });
      await sm.createSidecar(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('- machine-learning');
    });
  });

  // ─── updateSidecarDates ───────────────────────────────────────────────────

  describe('updateSidecarDates', () => {
    it('does nothing when sidecar does not exist', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, defaults);
      await sm.updateSidecarDates(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
    });

    it('calls processFrontMatter when sidecar exists', async () => {
      const app = makeApp({ sidecarExists: true });
      const sm = new SidecarManager(app as any, defaults);
      await sm.updateSidecarDates(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      expect(app.fileManager.processFrontMatter).toHaveBeenCalled();
    });

    it('sets updated field to mtime date', async () => {
      const app = makeApp({ sidecarExists: true });
      let capturedFm: any = {};
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(capturedFm); });
      const sm = new SidecarManager(app as any, defaults);
      const mtime = 1_700_000_000_000;
      await sm.updateSidecarDates(makeTFile({ path: 'Attachments/file.pdf', extension: 'pdf', stat: { ctime: 0, mtime } }));
      expect(capturedFm.updated).toBe(new Date(mtime).toISOString().split('T')[0]);
    });
  });

  // ─── renameSidecar ────────────────────────────────────────────────────────

  describe('renameSidecar', () => {
    it('does nothing when old sidecar does not exist', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, defaults);
      await sm.renameSidecar('Attachments/old.pdf', 'Attachments/new.pdf');
      expect(app.fileManager.renameFile).not.toHaveBeenCalled();
    });

    it('updates frontmatter fields on rename', async () => {
      const app = makeApp({ sidecarExists: true });
      let capturedFm: any = {};
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(capturedFm); });
      const sm = new SidecarManager(app as any, defaults);
      await sm.renameSidecar('Attachments/old.pdf', 'Attachments/new.pdf');
      expect(capturedFm.attachment).toBe('[[Attachments/new.pdf]]');
      expect(capturedFm._filePath).toBe('Attachments/new.pdf');
      expect(capturedFm.updated).toBeDefined();
    });

    it('renames the sidecar file itself', async () => {
      const app = makeApp({ sidecarExists: true });
      const sm = new SidecarManager(app as any, defaults);
      await sm.renameSidecar('Attachments/old.pdf', 'Attachments/new.pdf');
      expect(app.fileManager.renameFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('new.pdf.md'),
      );
    });

    it('creates the new sidecar parent folder', async () => {
      const app = makeApp({ sidecarExists: true });
      const sm = new SidecarManager(app as any, { ...defaults, mirrorFolderStructure: true });
      await sm.renameSidecar('Attachments/old.pdf', 'Attachments/sub/new.pdf');
      expect(app.vault.createFolder).toHaveBeenCalledWith('Library/sub');
    });
  });

  // ─── deleteSidecar ────────────────────────────────────────────────────────

  describe('deleteSidecar', () => {
    it('does nothing when sidecar does not exist', async () => {
      const app = makeApp({ sidecarExists: false });
      const sm = new SidecarManager(app as any, defaults);
      await sm.deleteSidecar('Attachments/file.pdf');
      expect(app.vault.trash).not.toHaveBeenCalled();
    });

    it('trashes sidecar when it exists', async () => {
      const app = makeApp({ sidecarExists: true });
      const sm = new SidecarManager(app as any, defaults);
      await sm.deleteSidecar('Attachments/file.pdf');
      expect(app.vault.trash).toHaveBeenCalledWith(expect.anything(), true);
    });
  });

  // ─── sanitizeSidecarTags ──────────────────────────────────────────────────

  describe('sanitizeSidecarTags', () => {
    it('returns 0 when no library files exist', async () => {
      const app = makeApp({ markdownFiles: [] });
      const sm = new SidecarManager(app as any, defaults);
      expect(await sm.sanitizeSidecarTags()).toBe(0);
    });

    it('skips files outside the library folder', async () => {
      const app = makeApp({ markdownFiles: [{ path: 'Attachments/note.md' }] });
      const sm = new SidecarManager(app as any, defaults);
      expect(await sm.sanitizeSidecarTags()).toBe(0);
      expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
    });

    it('returns 0 when tags are already valid', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => {
        cb({ tags: ['valid-tag', 'another'] });
      });
      const sm = new SidecarManager(app as any, defaults);
      expect(await sm.sanitizeSidecarTags()).toBe(0);
    });

    it('sanitizes tags with spaces (replaces with hyphens)', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      let fm: any = { tags: ['machine learning'] };
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(fm); });
      const sm = new SidecarManager(app as any, defaults);
      expect(await sm.sanitizeSidecarTags()).toBe(1);
      expect(fm.tags).toEqual(['machine-learning']);
    });

    it('removes special characters from tags', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      let fm: any = { tags: ['tag@#$!'] };
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(fm); });
      const sm = new SidecarManager(app as any, defaults);
      await sm.sanitizeSidecarTags();
      expect(fm.tags).toEqual(['tag']);
    });

    it('collapses consecutive hyphens', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      let fm: any = { tags: ['a--b'] };
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(fm); });
      const sm = new SidecarManager(app as any, defaults);
      await sm.sanitizeSidecarTags();
      expect(fm.tags).toEqual(['a-b']);
    });

    it('strips leading and trailing hyphens/underscores from tags', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      let fm: any = { tags: ['-tag-'] };
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(fm); });
      const sm = new SidecarManager(app as any, defaults);
      await sm.sanitizeSidecarTags();
      expect(fm.tags).toEqual(['tag']);
    });

    it('filters out tags that become empty after sanitization', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      let fm: any = { tags: ['@@@', 'valid'] };
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(fm); });
      const sm = new SidecarManager(app as any, defaults);
      const count = await sm.sanitizeSidecarTags();
      expect(count).toBe(1);
      expect(fm.tags).toEqual(['valid']);
    });

    it('skips frontmatter where tags is not an array', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => {
        cb({ tags: 'not-an-array' });
      });
      const sm = new SidecarManager(app as any, defaults);
      expect(await sm.sanitizeSidecarTags()).toBe(0);
    });

    it('uses tagsPropertyName setting to locate tags', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      let fm: any = { keywords: ['bad tag'] };
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(fm); });
      const sm = new SidecarManager(app as any, { ...defaults, tagsPropertyName: 'keywords' });
      const count = await sm.sanitizeSidecarTags();
      expect(count).toBe(1);
      expect(fm.keywords).toEqual(['bad-tag']);
    });
  });

  // ─── migrateTagsProperty ──────────────────────────────────────────────────

  describe('migrateTagsProperty', () => {
    it('returns 0 when no library files exist', async () => {
      const app = makeApp({ markdownFiles: [] });
      const sm = new SidecarManager(app as any, defaults);
      expect(await sm.migrateTagsProperty('keywords', 'tags')).toBe(0);
    });

    it('migrates old property to new name and removes old key', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      let fm: any = { keywords: ['kw1', 'kw2'] };
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => { cb(fm); });
      const sm = new SidecarManager(app as any, defaults);
      const count = await sm.migrateTagsProperty('keywords', 'tags');
      expect(count).toBe(1);
      expect(fm.tags).toEqual(['kw1', 'kw2']);
      expect(fm.keywords).toBeUndefined();
    });

    it('skips files that do not have the old property', async () => {
      const file = { path: 'Library/file.md' };
      const app = makeApp({ markdownFiles: [file] });
      app.fileManager.processFrontMatter.mockImplementation(async (_f: any, cb: any) => {
        cb({ tags: ['existing'] });
      });
      const sm = new SidecarManager(app as any, defaults);
      expect(await sm.migrateTagsProperty('keywords', 'tags')).toBe(0);
    });
  });
});
