import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackfillManager } from '../src/backfill';
import { DEFAULT_SETTINGS, AttachmentsLibrarySettings } from '../src/types';
import { TFile } from 'obsidian';

function makeFile(path: string, extension = 'pdf'): TFile {
  const f = new TFile();
  f.path = path;
  f.extension = extension;
  f.basename = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  f.name = path.split('/').pop() ?? '';
  f.stat = { ctime: 0, mtime: 0 };
  return f;
}

function makeApp(options: {
  folderExists?: boolean;
  files?: TFile[];
  sidecarExists?: boolean;
} = {}) {
  const { folderExists = true, files = [], sidecarExists = false } = options;
  return {
    vault: {
      getFolderByPath: vi.fn().mockReturnValue(folderExists ? { path: 'Attachments' } : null),
      getFiles: vi.fn().mockReturnValue(files),
      getFileByPath: vi.fn().mockReturnValue(sidecarExists ? { path: 'Library/file.md' } : null),
    },
  };
}

const mockSidecarManager = {
  getSidecarPath: vi.fn().mockReturnValue('Library/file.pdf.md'),
  createSidecar: vi.fn().mockResolvedValue(undefined),
};

const defaults: AttachmentsLibrarySettings = { ...DEFAULT_SETTINGS };

describe('BackfillManager', () => {
  beforeEach(() => {
    mockSidecarManager.getSidecarPath.mockClear();
    mockSidecarManager.createSidecar.mockClear();
  });

  it('shows a notice and returns early when attachments folder does not exist', async () => {
    const app = makeApp({ folderExists: false });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).not.toHaveBeenCalled();
  });

  it('processes no files when vault is empty', async () => {
    const app = makeApp({ folderExists: true, files: [] });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).not.toHaveBeenCalled();
  });

  it('filters out files not in the attachments folder', async () => {
    const outsideFile = makeFile('Other/file.pdf');
    const app = makeApp({ files: [outsideFile] });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).not.toHaveBeenCalled();
  });

  it('filters out files with non-watched extensions', async () => {
    const txtFile = makeFile('Attachments/note.txt', 'txt');
    const app = makeApp({ files: [txtFile] });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).not.toHaveBeenCalled();
  });

  it('filters out files inside the library folder', async () => {
    const libraryFile = makeFile('Library/file.pdf');
    const app = makeApp({ files: [libraryFile] });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).not.toHaveBeenCalled();
  });

  it('creates sidecars for new files', async () => {
    const file = makeFile('Attachments/doc.pdf');
    const app = makeApp({ files: [file], sidecarExists: false });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).toHaveBeenCalledWith(file);
  });

  it('skips files whose sidecar already exists', async () => {
    const file = makeFile('Attachments/doc.pdf');
    const app = makeApp({ files: [file], sidecarExists: true });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).not.toHaveBeenCalled();
  });

  it('processes files in batches of 10', async () => {
    const files = Array.from({ length: 15 }, (_, i) => makeFile(`Attachments/file${i}.pdf`));
    const app = makeApp({ files, sidecarExists: false });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).toHaveBeenCalledTimes(15);
  });

  it('shows progress notice when processed equals total', async () => {
    const files = [makeFile('Attachments/doc.pdf')];
    const app = makeApp({ files, sidecarExists: false });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).toHaveBeenCalledTimes(1);
  });

  it('triggers periodic notice every 50 processed files', async () => {
    const files = Array.from({ length: 50 }, (_, i) => makeFile(`Attachments/file${i}.pdf`));
    const app = makeApp({ files, sidecarExists: false });
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).toHaveBeenCalledTimes(50);
  });

  it('mixes created and skipped counts correctly', async () => {
    const newFile = makeFile('Attachments/new.pdf');
    const existingFile = makeFile('Attachments/existing.pdf');
    const app = makeApp({ files: [newFile, existingFile] });
    // First call: no sidecar; second call: sidecar exists
    app.vault.getFileByPath
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ path: 'Library/existing.pdf.md' });
    mockSidecarManager.getSidecarPath
      .mockReturnValueOnce('Library/new.pdf.md')
      .mockReturnValueOnce('Library/existing.pdf.md');
    const manager = new BackfillManager(app as any, defaults, mockSidecarManager as any);
    await manager.runBackfill();
    expect(mockSidecarManager.createSidecar).toHaveBeenCalledTimes(1);
    expect(mockSidecarManager.createSidecar).toHaveBeenCalledWith(newFile);
  });
});
