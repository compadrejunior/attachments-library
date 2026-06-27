import { Plugin, TAbstractFile, TFile } from 'obsidian';
import { AttachmentsLibrarySettings, DEFAULT_SETTINGS } from './types';
import { SidecarManager } from './sidecar-manager';
import { BackfillManager } from './backfill';
import { BasesCreator } from './bases-creator';
import { AttachmentsLibrarySettingsTab } from './settings';

export default class AttachmentsLibraryPlugin extends Plugin {
  settings: AttachmentsLibrarySettings;
  sidecarManager: SidecarManager;
  private backfillManager: BackfillManager;
  private basesCreator: BasesCreator;

  async onload() {
    await this.loadSettings();

    this.sidecarManager = new SidecarManager(this.app, this.settings);
    this.backfillManager = new BackfillManager(this.app, this.settings, this.sidecarManager);
    this.basesCreator = new BasesCreator(this.app, this.settings);

    this.app.workspace.onLayoutReady(async () => {
      this.registerVaultEvents();

      if (this.settings.autoCreateBaseFile) {
        await this.basesCreator.createOrUpdateBaseFile();
      }
    });

    this.addCommand({
      id: 'backfill-all',
      name: 'Indexar todos os arquivos existentes (Backfill)',
      callback: () => this.runBackfill(),
    });

    this.addCommand({
      id: 'create-sidecar-for-active',
      name: 'Criar nota de metadados para o arquivo ativo',
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return false;
        if (checking) return true;
        void this.sidecarManager.createSidecar(activeFile);
        return true;
      },
    });

    this.addSettingTab(new AttachmentsLibrarySettingsTab(this.app, this));
  }

  private registerVaultEvents(): void {
    this.registerEvent(
      this.app.vault.on('create', (file: TAbstractFile) => {
        if (!this.settings.autoCreateOnNew) return;
        if (!(file instanceof TFile)) return;
        if (!this.isWatchedAttachment(file)) return;

        setTimeout(() => { void this.sidecarManager.createSidecar(file); }, 500);
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', async (file: TAbstractFile) => {
        if (!this.settings.autoDeleteOnRemove) return;
        if (!(file instanceof TFile)) return;
        if (!this.isWatchedAttachment(file)) return;

        await this.sidecarManager.deleteSidecar(file.path);
      })
    );

    this.registerEvent(
      this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
        if (!(file instanceof TFile)) return;

        const wasWatched = this.isPathWatchedAttachment(oldPath, file.extension);
        const isWatched = this.isWatchedAttachment(file);

        if (wasWatched && isWatched) {
          await this.sidecarManager.renameSidecar(oldPath, file.path);
        } else if (wasWatched && !isWatched) {
          await this.sidecarManager.deleteSidecar(oldPath);
        } else if (!wasWatched && isWatched) {
          await this.sidecarManager.createSidecar(file);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('modify', async (file: TAbstractFile) => {
        if (!(file instanceof TFile)) return;
        if (!this.isWatchedAttachment(file)) return;
        await this.sidecarManager.updateSidecarDates(file);
      })
    );
  }

  private isWatchedAttachment(file: TFile): boolean {
    return this.isPathWatchedAttachment(file.path, file.extension) &&
           this.settings.watchedExtensions.includes("." + file.extension);
  }

  private isPathWatchedAttachment(path: string, extension?: string): boolean {
    const inAttachments = path.startsWith(this.settings.attachmentsFolder + "/") &&
                          !path.startsWith(this.settings.libraryFolder + "/");
    if (!inAttachments) return false;
    if (extension !== undefined) {
      return this.settings.watchedExtensions.includes("." + extension);
    }
    return true;
  }

  async runBackfill(): Promise<void> {
    await this.backfillManager.runBackfill();
  }

  async migrateTagsProperty(oldName: string, newName: string): Promise<number> {
    return this.sidecarManager.migrateTagsProperty(oldName, newName);
  }

  async sanitizeSidecarTags(): Promise<number> {
    return this.sidecarManager.sanitizeSidecarTags();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<AttachmentsLibrarySettings>);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
