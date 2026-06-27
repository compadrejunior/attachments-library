import { describe, it, expect, vi } from 'vitest';
import { BasesCreator } from '../src/bases-creator';
import { DEFAULT_SETTINGS, AttachmentsLibrarySettings } from '../src/types';

function makeApp(fileExists: boolean) {
  return {
    vault: {
      getFileByPath: vi.fn().mockReturnValue(fileExists ? { path: 'Attachments Library.base' } : null),
      create: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('BasesCreator', () => {
  const settings: AttachmentsLibrarySettings = { ...DEFAULT_SETTINGS };

  describe('createOrUpdateBaseFile', () => {
    it('does nothing when base file already exists', async () => {
      const app = makeApp(true);
      const creator = new BasesCreator(app as any, settings);
      await creator.createOrUpdateBaseFile();
      expect(app.vault.create).not.toHaveBeenCalled();
    });

    it('creates the base file when it does not exist', async () => {
      const app = makeApp(false);
      const creator = new BasesCreator(app as any, settings);
      await creator.createOrUpdateBaseFile();
      expect(app.vault.create).toHaveBeenCalledWith('Attachments Library.base', expect.any(String));
    });

    it('base file content references the libraryFolder setting', async () => {
      const app = makeApp(false);
      const creator = new BasesCreator(app as any, { ...settings, libraryFolder: 'MyLib' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('file.inFolder("MyLib")');
    });

    it('base file content uses the configured tagsPropertyName', async () => {
      const app = makeApp(false);
      const creator = new BasesCreator(app as any, { ...settings, tagsPropertyName: 'keywords' });
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('keywords:');
    });

    it('base file content excludes .base files via filter', async () => {
      const app = makeApp(false);
      const creator = new BasesCreator(app as any, settings);
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('not(file.name.contains(".base"))');
    });

    it('base file content includes all expected views', async () => {
      const app = makeApp(false);
      const creator = new BasesCreator(app as any, settings);
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('Todos os Anexos');
      expect(content).toContain('Não Lidos');
      expect(content).toContain('Em Leitura');
      expect(content).toContain('Somente PDFs');
    });

    it('base file content includes all metadata properties', async () => {
      const app = makeApp(false);
      const creator = new BasesCreator(app as any, settings);
      await creator.createOrUpdateBaseFile();
      const content: string = (app.vault.create.mock.calls[0] as any[])[1];
      expect(content).toContain('attachment:');
      expect(content).toContain('title:');
      expect(content).toContain('author:');
      expect(content).toContain('status:');
      expect(content).toContain('_fileType:');
    });

    it('checks for file at the fixed base path', async () => {
      const app = makeApp(false);
      const creator = new BasesCreator(app as any, settings);
      await creator.createOrUpdateBaseFile();
      expect(app.vault.getFileByPath).toHaveBeenCalledWith('Attachments Library.base');
    });
  });
});
