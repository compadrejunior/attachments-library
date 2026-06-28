import { describe, it, expect, vi } from 'vitest';
import { BasesCreator } from '../src/bases-creator';
import { DEFAULT_SETTINGS, AttachmentsLibrarySettings } from '../src/types';

vi.mock('../src/i18n/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
  t: vi.fn((key: string) => key),
}));

const BASE_NAME = 'Attachments Library.base';

function makeApp(opts: {
  fileAtPath?: string | null;
  fileManagerRename?: ReturnType<typeof vi.fn>;
} = {}) {
  const { fileAtPath = null, fileManagerRename = vi.fn().mockResolvedValue(undefined) } = opts;
  return {
    vault: {
      getFileByPath: vi.fn((p: string) =>
        p === fileAtPath ? { path: p } : null
      ),
      create: vi.fn().mockResolvedValue(undefined),
      createFolder: vi.fn().mockResolvedValue(undefined),
    },
    fileManager: {
      renameFile: fileManagerRename,
    },
  };
}

describe('BasesCreator', () => {
  const settings: AttachmentsLibrarySettings = { ...DEFAULT_SETTINGS };

  // ─── getBaseFilePathForFolder ───────────────────────────────────────────────

  describe('getBaseFilePathForFolder', () => {
    it('returns root path for empty string', () => {
      const creator = new BasesCreator({} as any, settings);
      expect(creator.getBaseFilePathForFolder('')).toBe(BASE_NAME);
    });

    it('returns root path for whitespace string', () => {
      const creator = new BasesCreator({} as any, settings);
      expect(creator.getBaseFilePathForFolder('   ')).toBe(BASE_NAME);
    });

    it('returns folder-prefixed path when folder is provided', () => {
      const creator = new BasesCreator({} as any, settings);
      expect(creator.getBaseFilePathForFolder('Databases')).toBe(`Databases/${BASE_NAME}`);
    });

    it('normalizes nested folder path', () => {
      const creator = new BasesCreator({} as any, settings);
      expect(creator.getBaseFilePathForFolder('My/Nested/Folder')).toBe(`My/Nested/Folder/${BASE_NAME}`);
    });
  });

  // ─── getBaseFilePath ────────────────────────────────────────────────────────

  describe('getBaseFilePath', () => {
    it('returns root path when baseFolderPath is empty', () => {
      const creator = new BasesCreator({} as any, { ...settings, baseFolderPath: '' });
      expect(creator.getBaseFilePath()).toBe(BASE_NAME);
    });

    it('returns root path when baseFolderPath is whitespace', () => {
      const creator = new BasesCreator({} as any, { ...settings, baseFolderPath: '   ' });
      expect(creator.getBaseFilePath()).toBe(BASE_NAME);
    });

    it('returns folder-prefixed path when baseFolderPath is set', () => {
      const creator = new BasesCreator({} as any, { ...settings, baseFolderPath: 'Databases' });
      expect(creator.getBaseFilePath()).toBe(`Databases/${BASE_NAME}`);
    });

    it('normalizes nested folder path', () => {
      const creator = new BasesCreator({} as any, { ...settings, baseFolderPath: 'My/Nested/Folder' });
      expect(creator.getBaseFilePath()).toBe(`My/Nested/Folder/${BASE_NAME}`);
    });
  });

  // ─── createOrUpdateBaseFile ─────────────────────────────────────────────────

  describe('createOrUpdateBaseFile', () => {
    it('does nothing when base file already exists at root', async () => {
      const app = makeApp({ fileAtPath: BASE_NAME });
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      expect(app.vault.create).not.toHaveBeenCalled();
    });

    it('does nothing when base file already exists in configured folder', async () => {
      const app = makeApp({ fileAtPath: `Databases/${BASE_NAME}` });
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: 'Databases' });
      await creator.createOrUpdateBaseFile();
      expect(app.vault.create).not.toHaveBeenCalled();
    });

    it('creates the base file at root when baseFolderPath is empty', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      expect(app.vault.create).toHaveBeenCalledWith(BASE_NAME, expect.any(String));
    });

    it('creates the base file inside the configured folder', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: 'Databases' });
      await creator.createOrUpdateBaseFile();
      expect(app.vault.create).toHaveBeenCalledWith(`Databases/${BASE_NAME}`, expect.any(String));
    });

    it('creates the folder before creating the file when baseFolderPath is set', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: 'Databases' });
      await creator.createOrUpdateBaseFile();
      expect(app.vault.createFolder).toHaveBeenCalledWith('Databases');
      expect(app.vault.create).toHaveBeenCalled();
    });

    it('does not call createFolder when baseFolderPath is empty', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      expect(app.vault.createFolder).not.toHaveBeenCalled();
    });

    it('still creates the file even when createFolder rejects (folder already exists)', async () => {
      const app = makeApp();
      app.vault.createFolder.mockRejectedValue(new Error('folder exists'));
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: 'Databases' });
      await creator.createOrUpdateBaseFile();
      expect(app.vault.create).toHaveBeenCalledWith(`Databases/${BASE_NAME}`, expect.any(String));
    });

    it('base file content references the libraryFolder setting', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, libraryFolder: 'MyLib', baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('file.inFolder("MyLib")');
    });

    it('base file content uses the configured tagsPropertyName', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, tagsPropertyName: 'keywords', baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('keywords:');
    });

    it('base file content uses a single file.inFolder() filter without a .base exclusion', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).not.toContain('not(file.name.contains(".base"))');
      expect(content).toContain('file.inFolder(');
    });

    it('base file content includes all expected views', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('bases.views.all');
      expect(content).toContain('bases.views.unread');
      expect(content).toContain('bases.views.reading');
      expect(content).toContain('bases.views.pdfsOnly');
    });

    it('base file content includes all metadata properties', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('attachment:');
      expect(content).toContain('title:');
      expect(content).toContain('author:');
      expect(content).toContain('status:');
      expect(content).toContain('_fileType:');
    });

    it('base file content includes notes in the properties section', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('notes:');
    });

    it('each view order list contains all visible (non-underscore) fields', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      const viewsSection = content.slice(content.indexOf('views:'));
      for (const field of ['file.name', 'title', 'author', 'subject', 'genre', 'status', 'source', 'notes', 'created', 'updated']) {
        expect(viewsSection).toContain(`- ${field}`);
      }
    });

    it('order lists use the configured tagsPropertyName', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, tagsPropertyName: 'keywords', baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      const viewsSection = content.slice(content.indexOf('views:'));
      expect(viewsSection).toContain('- keywords');
    });

    it('order lists do not include _fileType (underscore fields excluded from visible columns)', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      const viewsSection = content.slice(content.indexOf('views:'));
      // '_fileType\n' is an order list item; '_fileType.equals(...)' in filters is allowed
      expect(viewsSection).not.toContain('- _fileType\n');
    });

    it('_fileType remains defined in the properties section for use by filters', async () => {
      const app = makeApp();
      const creator = new BasesCreator(app as any, { ...settings, baseFolderPath: '' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      const propertiesSection = content.slice(content.indexOf('properties:'), content.indexOf('views:'));
      expect(propertiesSection).toContain('_fileType:');
    });
  });

  // ─── moveBaseFile ───────────────────────────────────────────────────────────

  describe('moveBaseFile', () => {
    it('does nothing when old and new paths are the same (both root)', async () => {
      const renameFile = vi.fn();
      const app = makeApp({ fileManagerRename: renameFile });
      const creator = new BasesCreator(app as any, settings);
      await creator.moveBaseFile('', '');
      expect(renameFile).not.toHaveBeenCalled();
    });

    it('does nothing when old and new paths are the same (same folder)', async () => {
      const renameFile = vi.fn();
      const app = makeApp({ fileManagerRename: renameFile });
      const creator = new BasesCreator(app as any, settings);
      await creator.moveBaseFile('Databases', 'Databases');
      expect(renameFile).not.toHaveBeenCalled();
    });

    it('does nothing when the file does not exist at old path', async () => {
      const renameFile = vi.fn();
      const app = makeApp({ fileAtPath: null, fileManagerRename: renameFile });
      const creator = new BasesCreator(app as any, settings);
      await creator.moveBaseFile('', 'Databases');
      expect(renameFile).not.toHaveBeenCalled();
    });

    it('moves file from root to a folder', async () => {
      const renameFile = vi.fn().mockResolvedValue(undefined);
      const existingFile = { path: BASE_NAME };
      const app = makeApp({ fileAtPath: BASE_NAME, fileManagerRename: renameFile });
      const creator = new BasesCreator(app as any, settings);
      await creator.moveBaseFile('', 'Databases');
      expect(app.vault.createFolder).toHaveBeenCalledWith('Databases');
      expect(renameFile).toHaveBeenCalledWith(existingFile, `Databases/${BASE_NAME}`);
    });

    it('moves file from a folder to root', async () => {
      const renameFile = vi.fn().mockResolvedValue(undefined);
      const existingFile = { path: `Databases/${BASE_NAME}` };
      const app = makeApp({ fileAtPath: `Databases/${BASE_NAME}`, fileManagerRename: renameFile });
      const creator = new BasesCreator(app as any, settings);
      await creator.moveBaseFile('Databases', '');
      expect(app.vault.createFolder).not.toHaveBeenCalled();
      expect(renameFile).toHaveBeenCalledWith(existingFile, BASE_NAME);
    });

    it('moves file from one folder to another', async () => {
      const renameFile = vi.fn().mockResolvedValue(undefined);
      const existingFile = { path: `OldFolder/${BASE_NAME}` };
      const app = makeApp({ fileAtPath: `OldFolder/${BASE_NAME}`, fileManagerRename: renameFile });
      const creator = new BasesCreator(app as any, settings);
      await creator.moveBaseFile('OldFolder', 'NewFolder');
      expect(app.vault.createFolder).toHaveBeenCalledWith('NewFolder');
      expect(renameFile).toHaveBeenCalledWith(existingFile, `NewFolder/${BASE_NAME}`);
    });

    it('trims whitespace from folder names before computing paths', async () => {
      const renameFile = vi.fn().mockResolvedValue(undefined);
      const existingFile = { path: BASE_NAME };
      const app = makeApp({ fileAtPath: BASE_NAME, fileManagerRename: renameFile });
      const creator = new BasesCreator(app as any, settings);
      await creator.moveBaseFile('  ', '  Databases  ');
      expect(renameFile).toHaveBeenCalledWith(existingFile, `Databases/${BASE_NAME}`);
    });

    it('still moves the file even when createFolder rejects (folder already exists)', async () => {
      const renameFile = vi.fn().mockResolvedValue(undefined);
      const existingFile = { path: BASE_NAME };
      const app = makeApp({ fileAtPath: BASE_NAME, fileManagerRename: renameFile });
      app.vault.createFolder.mockRejectedValue(new Error('folder exists'));
      const creator = new BasesCreator(app as any, settings);
      await creator.moveBaseFile('', 'Databases');
      expect(renameFile).toHaveBeenCalledWith(existingFile, `Databases/${BASE_NAME}`);
    });
  });
});
