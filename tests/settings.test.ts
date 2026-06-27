import { describe, it, expect, vi, beforeEach } from 'vitest';

const settingInstances = vi.hoisted<any[]>(() => []);

vi.mock('obsidian', () => {
  class TAbstractFile { path = ''; }
  class TFile extends TAbstractFile {
    extension = ''; basename = ''; name = '';
    stat = { ctime: 0, mtime: 0 };
  }
  class Plugin {
    app: any = {}; manifest: any = {};
    constructor(app?: any) { if (app) this.app = app; }
    async loadData() { return {}; }
    async saveData(_d: any) {}
    addCommand(_c: any) {}
    addSettingTab(_t: any) {}
    registerEvent(_e: any) {}
  }
  class PluginSettingTab {
    containerEl: any = {
      empty: () => {},
      createEl: (_tag: string, _opts?: any) => ({
        empty: () => {},
        createEl: () => ({}),
      }),
    };
    constructor(public app: any, public plugin: any) {}
  }
  class Notice { constructor(_m: string) {} }
  const normalizePath = (p: string) => p.replace(/\\/g, '/').replace(/\/{2,}/g, '/');

  class Setting {
    _textCbs: any[] = [];
    _toggleCbs: any[] = [];
    _btnCbs: any[] = [];

    constructor(_el: any) {
      settingInstances.push(this);
    }
    setName(_n: string) { return this; }
    setDesc(_d: string) { return this; }

    addText(cb: (t: any) => void) {
      const self = this;
      const text = {
        setPlaceholder: (_v: string) => text,
        setValue: (_v: string) => text,
        onChange: (fn: any) => { self._textCbs.push(fn); return text; },
      };
      cb(text);
      return this;
    }

    addToggle(cb: (t: any) => void) {
      const self = this;
      const toggle = {
        setValue: (_v: boolean) => toggle,
        onChange: (fn: any) => { self._toggleCbs.push(fn); return toggle; },
      };
      cb(toggle);
      return this;
    }

    addButton(cb: (b: any) => void) {
      const self = this;
      const btn = {
        setButtonText: (_v: string) => btn,
        setCta: () => btn,
        onClick: (fn: any) => { self._btnCbs.push(fn); return btn; },
      };
      cb(btn);
      return this;
    }
  }

  return { TAbstractFile, TFile, Plugin, PluginSettingTab, Notice, normalizePath, Setting };
});

import { AttachmentsLibrarySettingsTab } from '../src/settings';
import { DEFAULT_SETTINGS } from '../src/types';

function makePlugin(overrides?: any) {
  return {
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    saveSettings: vi.fn().mockResolvedValue(undefined),
    runBackfill: vi.fn().mockResolvedValue(undefined),
    migrateTagsProperty: vi.fn().mockResolvedValue(7),
    sanitizeSidecarTags: vi.fn().mockResolvedValue(4),
    moveBaseFile: vi.fn().mockResolvedValue(undefined),
  };
}

const mockApp = {};

function createTab(plugin: any) {
  const tab = new AttachmentsLibrarySettingsTab(mockApp as any, plugin as any);
  settingInstances.length = 0;
  tab.display();
  return tab;
}

// Setting order in display():
// [0]  attachmentsFolder        (text)
// [1]  libraryFolder            (text)
// [2]  mirrorFolderStructure    (toggle)
// [3]  baseFolderPath           (text + button "Mover")
// [4]  autoCreateOnNew          (toggle)
// [5]  autoDeleteOnRemove       (toggle)
// [6]  tagsPropertyName         (text)
// [7]  renameProperty           (text + button)
// [8]  sanitizeTags             (button)
// [9]  enablePdfMetadataExtraction (toggle)
// [10] enableDoiIsbnLookup      (toggle)
// [11] backfill                 (button)

describe('AttachmentsLibrarySettingsTab', () => {
  beforeEach(() => {
    settingInstances.length = 0;
  });

  it('creates the expected number of settings', () => {
    const plugin = makePlugin();
    createTab(plugin);
    expect(settingInstances).toHaveLength(12);
  });

  // ─── attachmentsFolder ────────────────────────────────────────────────────

  describe('attachmentsFolder onChange', () => {
    it('trims and saves non-empty value', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[0]._textCbs[0]('  MyFolder  ');
      expect(plugin.settings.attachmentsFolder).toBe('MyFolder');
      expect(plugin.saveSettings).toHaveBeenCalled();
    });

    it('defaults to "Attachments" when value is empty', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[0]._textCbs[0]('   ');
      expect(plugin.settings.attachmentsFolder).toBe('Attachments');
    });
  });

  // ─── libraryFolder ────────────────────────────────────────────────────────

  describe('libraryFolder onChange', () => {
    it('trims and saves non-empty value', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[1]._textCbs[0]('  MyLib  ');
      expect(plugin.settings.libraryFolder).toBe('MyLib');
      expect(plugin.saveSettings).toHaveBeenCalled();
    });

    it('defaults to "Library" when value is empty', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[1]._textCbs[0]('');
      expect(plugin.settings.libraryFolder).toBe('Library');
    });
  });

  // ─── mirrorFolderStructure ────────────────────────────────────────────────

  describe('mirrorFolderStructure onChange', () => {
    it('saves the toggled value', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[2]._toggleCbs[0](false);
      expect(plugin.settings.mirrorFolderStructure).toBe(false);
      expect(plugin.saveSettings).toHaveBeenCalled();
    });
  });

  // ─── baseFolderPath ───────────────────────────────────────────────────────

  describe('baseFolderPath (Mover button)', () => {
    it('text onChange updates pending value but does not save', () => {
      const plugin = makePlugin({ baseFolderPath: '' });
      createTab(plugin);
      settingInstances[3]._textCbs[0]('Databases');
      expect(plugin.saveSettings).not.toHaveBeenCalled();
      expect(plugin.settings.baseFolderPath).toBe('');
    });

    it('Mover button saves new folder and calls moveBaseFile', async () => {
      vi.useFakeTimers();
      const plugin = makePlugin({ baseFolderPath: '' });
      createTab(plugin);
      settingInstances[3]._textCbs[0]('Databases');
      await settingInstances[3]._btnCbs[0]();
      expect(plugin.settings.baseFolderPath).toBe('Databases');
      expect(plugin.saveSettings).toHaveBeenCalled();
      expect(plugin.moveBaseFile).toHaveBeenCalledWith('', 'Databases');
      vi.useRealTimers();
    });

    it('Mover button uses trimmed folder value', async () => {
      vi.useFakeTimers();
      const plugin = makePlugin({ baseFolderPath: '' });
      createTab(plugin);
      settingInstances[3]._textCbs[0]('  Databases  ');
      await settingInstances[3]._btnCbs[0]();
      expect(plugin.settings.baseFolderPath).toBe('Databases');
      expect(plugin.moveBaseFile).toHaveBeenCalledWith('', 'Databases');
      vi.useRealTimers();
    });

    it('second Mover click uses previously applied folder as old folder', async () => {
      vi.useFakeTimers();
      const plugin = makePlugin({ baseFolderPath: '' });
      createTab(plugin);
      // First move: '' → 'Databases'
      settingInstances[3]._textCbs[0]('Databases');
      await settingInstances[3]._btnCbs[0]();
      // Second move: 'Databases' → 'Archive'
      settingInstances[3]._textCbs[0]('Archive');
      await settingInstances[3]._btnCbs[0]();
      expect(plugin.moveBaseFile).toHaveBeenNthCalledWith(2, 'Databases', 'Archive');
      vi.useRealTimers();
    });
  });

  // ─── autoCreateOnNew ──────────────────────────────────────────────────────

  describe('autoCreateOnNew onChange', () => {
    it('saves the toggled value', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[4]._toggleCbs[0](false);
      expect(plugin.settings.autoCreateOnNew).toBe(false);
      expect(plugin.saveSettings).toHaveBeenCalled();
    });
  });

  // ─── autoDeleteOnRemove ───────────────────────────────────────────────────

  describe('autoDeleteOnRemove onChange', () => {
    it('saves the toggled value', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[5]._toggleCbs[0](false);
      expect(plugin.settings.autoDeleteOnRemove).toBe(false);
      expect(plugin.saveSettings).toHaveBeenCalled();
    });
  });

  // ─── tagsPropertyName ─────────────────────────────────────────────────────

  describe('tagsPropertyName onChange', () => {
    it('trims and saves non-empty value', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[6]._textCbs[0]('  keywords  ');
      expect(plugin.settings.tagsPropertyName).toBe('keywords');
      expect(plugin.saveSettings).toHaveBeenCalled();
    });

    it('defaults to "tags" when value is empty', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[6]._textCbs[0]('');
      expect(plugin.settings.tagsPropertyName).toBe('tags');
    });
  });

  // ─── rename property setting ──────────────────────────────────────────────

  describe('rename property setting', () => {
    it('rename button does nothing when input is empty', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[7]._btnCbs[0]();
      expect(plugin.migrateTagsProperty).not.toHaveBeenCalled();
    });

    it('rename button calls migrateTagsProperty with entered name', async () => {
      vi.useFakeTimers();
      const plugin = makePlugin({ tagsPropertyName: 'tags' });
      createTab(plugin);
      // Set the input first via onChange
      settingInstances[7]._textCbs[0]('old-name');
      await settingInstances[7]._btnCbs[0]();
      expect(plugin.migrateTagsProperty).toHaveBeenCalledWith('old-name', 'tags');
      vi.useRealTimers();
    });
  });

  // ─── sanitize tags button ─────────────────────────────────────────────────

  describe('sanitize tags button', () => {
    it('calls sanitizeSidecarTags', async () => {
      vi.useFakeTimers();
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[8]._btnCbs[0]();
      expect(plugin.sanitizeSidecarTags).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  // ─── enablePdfMetadataExtraction ──────────────────────────────────────────

  describe('enablePdfMetadataExtraction onChange', () => {
    it('saves the toggled value', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[9]._toggleCbs[0](false);
      expect(plugin.settings.enablePdfMetadataExtraction).toBe(false);
      expect(plugin.saveSettings).toHaveBeenCalled();
    });
  });

  // ─── enableDoiIsbnLookup ──────────────────────────────────────────────────

  describe('enableDoiIsbnLookup onChange', () => {
    it('saves the toggled value', async () => {
      const plugin = makePlugin();
      createTab(plugin);
      await settingInstances[10]._toggleCbs[0](true);
      expect(plugin.settings.enableDoiIsbnLookup).toBe(true);
      expect(plugin.saveSettings).toHaveBeenCalled();
    });
  });

  // ─── backfill button ──────────────────────────────────────────────────────

  describe('backfill button', () => {
    it('calls runBackfill', () => {
      const plugin = makePlugin();
      createTab(plugin);
      settingInstances[11]._btnCbs[0]();
      expect(plugin.runBackfill).toHaveBeenCalled();
    });
  });
});
