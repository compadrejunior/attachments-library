import { App, Notice } from 'obsidian';
import { AttachmentsLibrarySettings } from './types';
import { SidecarManager } from './sidecar-manager';

export class BackfillManager {
  constructor(
    private app: App,
    private settings: AttachmentsLibrarySettings,
    private sidecarManager: SidecarManager
  ) {}

  async runBackfill(): Promise<void> {
    const attachmentsFolder = this.app.vault.getFolderByPath(
      this.settings.attachmentsFolder
    );

    if (!attachmentsFolder) {
      new Notice(`[Attachments Library] Pasta "${this.settings.attachmentsFolder}" não encontrada.`);
      return;
    }

    const allFiles = this.app.vault.getFiles().filter(f =>
      f.path.startsWith(this.settings.attachmentsFolder + "/") &&
      this.settings.watchedExtensions.includes("." + f.extension) &&
      !f.path.startsWith(this.settings.libraryFolder + "/")
    );

    const total = allFiles.length;
    let processed = 0;
    let created = 0;
    let skipped = 0;

    new Notice(`[Attachments Library] Iniciando indexação de ${total} arquivos...`);

    for (let i = 0; i < allFiles.length; i += 10) {
      const batch = allFiles.slice(i, i + 10);

      await Promise.all(batch.map(async (file) => {
        const sidecarPath = this.sidecarManager.getSidecarPath(file.path);
        const exists = this.app.vault.getFileByPath(sidecarPath);

        if (exists) {
          skipped++;
        } else {
          await this.sidecarManager.createSidecar(file);
          created++;
        }
        processed++;
      }));

      if (processed % 50 === 0 || processed === total) {
        new Notice(
          `[Attachments Library] ${processed}/${total} — ${created} criados, ${skipped} já existiam`
        );
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    new Notice(`[Attachments Library] ✅ Indexação completa: ${created} notas criadas, ${skipped} já existiam.`);
  }
}
