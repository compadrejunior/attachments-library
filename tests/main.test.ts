import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TFile, TAbstractFile } from 'obsidian';
import { DEFAULT_SETTINGS } from '../src/types';

vi.mock('../src/i18n/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
  t: vi.fn((key: string) => key),
}));

// Shared mock instances — defined before vi.mock so factories can close over them
const mockSidecarInstance = vi.hoisted(() => ({
  createSidecar: vi.fn(),
  deleteSidecar: vi.fn(),
  renameSidecar: vi.fn(),
  updateSidecarDates: vi.fn(),
  migrateTagsProperty: vi.fn(),
  sanitizeSidecarTags: vi.fn(),
  getSidecarPath: vi.fn(),
}));

const mockBackfillInstance = vi.hoisted(() => ({
  runBackfill: vi.fn(),
}));

const mockBasesCreatorInstance = vi.hoisted(() => ({
  createOrUpdateBaseFile: vi.fn(),
  moveBaseFile: vi.fn(),
}));

vi.mock('../src/sidecar-manager', () => ({
  SidecarManager: vi.fn(function () { return mockSidecarInstance; }),
}));

vi.mock('../src/backfill', () => ({
  BackfillManager: vi.fn(function () { return mockBackfillInstance; }),
}));

vi.mock('../src/bases-creator', () => ({
  BasesCreator: vi.fn(function () { return mockBasesCreatorInstance; }),
}));

import AttachmentsLibraryPlugin from '../src/main';
import { SidecarManager } from '../src/sidecar-manager';
import { BackfillManager } from '../src/backfill';
import { BasesCreator } from '../src/bases-creator';

function makeFile(props: { path: string; extension: string }): TFile {
  const f = new TFile();
  f.path = props.path;
  f.extension = props.extension;
  f.basename = props.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  f.name = props.path.split('/').pop() ?? '';
  f.stat = { ctime: 0, mtime: 0 };
  return f;
}

function makeAbstractFile(path: string): TAbstractFile {
  const f = new TAbstractFile();
  f.path = path;
  return f;
}

function makeApp() {
  const vaultCallbacks: Record<string, Function> = {};
  const commands: any[] = [];
  const app = {
    vault: {
      on: vi.fn((event: string, cb: Function) => {
        vaultCallbacks[event] = cb;
        return `ref:${event}`;
      }),
    },
    workspace: {
      onLayoutReady: vi.fn((cb: Function) => cb()),
      getActiveFile: vi.fn().mockReturnValue(null),
    },
    fileManager: {},
  };
  return { app, vaultCallbacks, commands };
}

async function createPlugin(settingsOverride?: Partial<typeof DEFAULT_SETTINGS>) {
  const { app, vaultCallbacks, commands } = makeApp();
  const plugin = new AttachmentsLibraryPlugin();
  plugin.app = app as any;
  plugin.loadData = vi.fn().mockResolvedValue(settingsOverride ?? {});
  plugin.saveData = vi.fn().mockResolvedValue(undefined);
  plugin.addCommand = vi.fn((cmd: any) => commands.push(cmd));
  plugin.addSettingTab = vi.fn();
  plugin.registerEvent = vi.fn();
  await plugin.onload();
  return { plugin, app, vaultCallbacks, commands };
}

describe('AttachmentsLibraryPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidecarInstance.createSidecar.mockResolvedValue(undefined);
    mockSidecarInstance.deleteSidecar.mockResolvedValue(undefined);
    mockSidecarInstance.renameSidecar.mockResolvedValue(undefined);
    mockSidecarInstance.updateSidecarDates.mockResolvedValue(undefined);
    mockSidecarInstance.migrateTagsProperty.mockResolvedValue(5);
    mockSidecarInstance.sanitizeSidecarTags.mockResolvedValue(3);
    mockBackfillInstance.runBackfill.mockResolvedValue(undefined);
    mockBasesCreatorInstance.createOrUpdateBaseFile.mockResolvedValue(undefined);
    mockBasesCreatorInstance.moveBaseFile.mockResolvedValue(undefined);
  });

  // ─── lifecycle ────────────────────────────────────────────────────────────

  describe('onload', () => {
    it('loads settings from stored data', async () => {
      const { plugin } = await createPlugin({ attachmentsFolder: 'MyAttachments' });
      expect(plugin.settings.attachmentsFolder).toBe('MyAttachments');
    });

    it('merges stored data with defaults', async () => {
      const { plugin } = await createPlugin({});
      expect(plugin.settings.autoCreateOnNew).toBe(DEFAULT_SETTINGS.autoCreateOnNew);
    });

    it('instantiates SidecarManager', async () => {
      await createPlugin();
      expect(SidecarManager).toHaveBeenCalled();
    });

    it('instantiates BackfillManager', async () => {
      await createPlugin();
      expect(BackfillManager).toHaveBeenCalled();
    });

    it('instantiates BasesCreator', async () => {
      await createPlugin();
      expect(BasesCreator).toHaveBeenCalled();
    });

    it('creates base file when autoCreateBaseFile is true', async () => {
      await createPlugin({ autoCreateBaseFile: true });
      expect(mockBasesCreatorInstance.createOrUpdateBaseFile).toHaveBeenCalled();
    });

    it('does not create base file when autoCreateBaseFile is false', async () => {
      await createPlugin({ autoCreateBaseFile: false });
      expect(mockBasesCreatorInstance.createOrUpdateBaseFile).not.toHaveBeenCalled();
    });

    it('registers two commands', async () => {
      const { commands } = await createPlugin();
      expect(commands).toHaveLength(2);
      expect(commands[0].id).toBe('backfill-all');
      expect(commands[1].id).toBe('create-sidecar-for-active');
    });

    it('adds a settings tab', async () => {
      const { plugin } = await createPlugin();
      expect(plugin.addSettingTab).toHaveBeenCalled();
    });
  });

  // ─── loadSettings / saveSettings ──────────────────────────────────────────

  describe('loadSettings', () => {
    it('assigns merged settings to this.settings', async () => {
      const { plugin } = await createPlugin({ libraryFolder: 'Notes' });
      expect(plugin.settings.libraryFolder).toBe('Notes');
    });
  });

  describe('saveSettings', () => {
    it('calls saveData with current settings', async () => {
      const { plugin } = await createPlugin();
      await plugin.saveSettings();
      expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
    });
  });

  // ─── public delegates ──────────────────────────────────────────────────────

  describe('runBackfill', () => {
    it('delegates to backfillManager', async () => {
      const { plugin } = await createPlugin();
      await plugin.runBackfill();
      expect(mockBackfillInstance.runBackfill).toHaveBeenCalled();
    });
  });

  describe('migrateTagsProperty', () => {
    it('delegates to sidecarManager and returns count', async () => {
      const { plugin } = await createPlugin();
      const count = await plugin.migrateTagsProperty('old', 'new');
      expect(count).toBe(5);
    });
  });

  describe('sanitizeSidecarTags', () => {
    it('delegates to sidecarManager and returns count', async () => {
      const { plugin } = await createPlugin();
      const count = await plugin.sanitizeSidecarTags();
      expect(count).toBe(3);
    });
  });

  describe('moveBaseFile', () => {
    it('delegates to basesCreator', async () => {
      const { plugin } = await createPlugin();
      await plugin.moveBaseFile('OldFolder', 'NewFolder');
      expect(mockBasesCreatorInstance.moveBaseFile).toHaveBeenCalledWith('OldFolder', 'NewFolder');
    });
  });

  // ─── backfill command ─────────────────────────────────────────────────────

  describe('backfill command callback', () => {
    it('calls runBackfill', async () => {
      const { plugin, commands } = await createPlugin();
      const runBackfillSpy = vi.spyOn(plugin, 'runBackfill');
      commands[0].callback();
      expect(runBackfillSpy).toHaveBeenCalled();
    });
  });

  // ─── create-sidecar command ───────────────────────────────────────────────

  describe('create-sidecar-for-active command checkCallback', () => {
    it('returns false when no active file', async () => {
      const { commands, app } = await createPlugin();
      app.workspace.getActiveFile.mockReturnValue(null);
      expect(commands[1].checkCallback(true)).toBe(false);
    });

    it('returns true when checking and active file exists', async () => {
      const { commands, app } = await createPlugin();
      app.workspace.getActiveFile.mockReturnValue(makeFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      expect(commands[1].checkCallback(true)).toBe(true);
    });

    it('creates sidecar and returns true when not checking', async () => {
      const { commands, app } = await createPlugin();
      const activeFile = makeFile({ path: 'Attachments/file.pdf', extension: 'pdf' });
      app.workspace.getActiveFile.mockReturnValue(activeFile);
      const result = commands[1].checkCallback(false);
      expect(result).toBe(true);
      expect(mockSidecarInstance.createSidecar).toHaveBeenCalledWith(activeFile);
    });
  });

  // ─── vault 'create' event ─────────────────────────────────────────────────

  describe("vault 'create' event", () => {
    it('does nothing when autoCreateOnNew is false', async () => {
      const { vaultCallbacks } = await createPlugin({ autoCreateOnNew: false });
      await vaultCallbacks['create'](makeFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      expect(mockSidecarInstance.createSidecar).not.toHaveBeenCalled();
    });

    it('does nothing when the file is not a TFile', async () => {
      const { vaultCallbacks } = await createPlugin({ autoCreateOnNew: true });
      await vaultCallbacks['create'](makeAbstractFile('Attachments/file.pdf'));
      expect(mockSidecarInstance.createSidecar).not.toHaveBeenCalled();
    });

    it('does nothing for unwatched extension', async () => {
      const { vaultCallbacks } = await createPlugin({ autoCreateOnNew: true });
      await vaultCallbacks['create'](makeFile({ path: 'Attachments/file.txt', extension: 'txt' }));
      expect(mockSidecarInstance.createSidecar).not.toHaveBeenCalled();
    });

    it('does nothing for file outside attachments folder', async () => {
      const { vaultCallbacks } = await createPlugin({ autoCreateOnNew: true });
      await vaultCallbacks['create'](makeFile({ path: 'Other/file.pdf', extension: 'pdf' }));
      expect(mockSidecarInstance.createSidecar).not.toHaveBeenCalled();
    });

    it('schedules createSidecar via setTimeout for a watched TFile', async () => {
      vi.useFakeTimers();
      const { vaultCallbacks } = await createPlugin({ autoCreateOnNew: true });
      const file = makeFile({ path: 'Attachments/doc.pdf', extension: 'pdf' });
      await vaultCallbacks['create'](file);
      expect(mockSidecarInstance.createSidecar).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
      expect(mockSidecarInstance.createSidecar).toHaveBeenCalledWith(file);
      vi.useRealTimers();
    });
  });

  // ─── vault 'delete' event ─────────────────────────────────────────────────

  describe("vault 'delete' event", () => {
    it('does nothing when autoDeleteOnRemove is false', async () => {
      const { vaultCallbacks } = await createPlugin({ autoDeleteOnRemove: false });
      await vaultCallbacks['delete'](makeFile({ path: 'Attachments/file.pdf', extension: 'pdf' }));
      expect(mockSidecarInstance.deleteSidecar).not.toHaveBeenCalled();
    });

    it('does nothing when the file is not a TFile', async () => {
      const { vaultCallbacks } = await createPlugin({ autoDeleteOnRemove: true });
      await vaultCallbacks['delete'](makeAbstractFile('Attachments/file.pdf'));
      expect(mockSidecarInstance.deleteSidecar).not.toHaveBeenCalled();
    });

    it('does nothing for unwatched extension', async () => {
      const { vaultCallbacks } = await createPlugin({ autoDeleteOnRemove: true });
      await vaultCallbacks['delete'](makeFile({ path: 'Attachments/file.txt', extension: 'txt' }));
      expect(mockSidecarInstance.deleteSidecar).not.toHaveBeenCalled();
    });

    it('deletes sidecar for a watched TFile', async () => {
      const { vaultCallbacks } = await createPlugin({ autoDeleteOnRemove: true });
      const file = makeFile({ path: 'Attachments/doc.pdf', extension: 'pdf' });
      await vaultCallbacks['delete'](file);
      expect(mockSidecarInstance.deleteSidecar).toHaveBeenCalledWith(file.path);
    });
  });

  // ─── vault 'rename' event ─────────────────────────────────────────────────

  describe("vault 'rename' event", () => {
    it('does nothing when file is not a TFile', async () => {
      const { vaultCallbacks } = await createPlugin();
      await vaultCallbacks['rename'](makeAbstractFile('Attachments/new.pdf'), 'Attachments/old.pdf');
      expect(mockSidecarInstance.renameSidecar).not.toHaveBeenCalled();
    });

    it('renames sidecar when both old and new paths are watched', async () => {
      const { vaultCallbacks } = await createPlugin();
      const file = makeFile({ path: 'Attachments/new.pdf', extension: 'pdf' });
      await vaultCallbacks['rename'](file, 'Attachments/old.pdf');
      expect(mockSidecarInstance.renameSidecar).toHaveBeenCalledWith('Attachments/old.pdf', 'Attachments/new.pdf');
    });

    it('deletes sidecar when file moved out of watched scope', async () => {
      const { vaultCallbacks } = await createPlugin();
      const file = makeFile({ path: 'Other/new.pdf', extension: 'pdf' });
      await vaultCallbacks['rename'](file, 'Attachments/old.pdf');
      expect(mockSidecarInstance.deleteSidecar).toHaveBeenCalledWith('Attachments/old.pdf');
    });

    it('creates sidecar when file moved into watched scope', async () => {
      const { vaultCallbacks } = await createPlugin();
      const file = makeFile({ path: 'Attachments/new.pdf', extension: 'pdf' });
      await vaultCallbacks['rename'](file, 'Other/old.pdf');
      expect(mockSidecarInstance.createSidecar).toHaveBeenCalledWith(file);
    });

    it('does nothing when both old and new paths are unwatched', async () => {
      const { vaultCallbacks } = await createPlugin();
      const file = makeFile({ path: 'Other/new.pdf', extension: 'pdf' });
      await vaultCallbacks['rename'](file, 'Other/old.pdf');
      expect(mockSidecarInstance.renameSidecar).not.toHaveBeenCalled();
      expect(mockSidecarInstance.deleteSidecar).not.toHaveBeenCalled();
      expect(mockSidecarInstance.createSidecar).not.toHaveBeenCalled();
    });
  });

  // ─── vault 'modify' event ─────────────────────────────────────────────────

  describe("vault 'modify' event", () => {
    it('does nothing when file is not a TFile', async () => {
      const { vaultCallbacks } = await createPlugin();
      await vaultCallbacks['modify'](makeAbstractFile('Attachments/file.pdf'));
      expect(mockSidecarInstance.updateSidecarDates).not.toHaveBeenCalled();
    });

    it('does nothing for unwatched extension', async () => {
      const { vaultCallbacks } = await createPlugin();
      await vaultCallbacks['modify'](makeFile({ path: 'Attachments/file.txt', extension: 'txt' }));
      expect(mockSidecarInstance.updateSidecarDates).not.toHaveBeenCalled();
    });

    it('updates sidecar dates for a watched TFile', async () => {
      const { vaultCallbacks } = await createPlugin();
      const file = makeFile({ path: 'Attachments/doc.pdf', extension: 'pdf' });
      await vaultCallbacks['modify'](file);
      expect(mockSidecarInstance.updateSidecarDates).toHaveBeenCalledWith(file);
    });
  });
});
