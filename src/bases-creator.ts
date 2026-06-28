import { App, normalizePath } from 'obsidian';
import { AttachmentsLibrarySettings } from './types';
import { t } from './i18n/i18n';

export class BasesCreator {
  constructor(
    private app: App,
    private settings: AttachmentsLibrarySettings
  ) {}

  getBaseFilePathForFolder(folder: string): string {
    const f = folder?.trim();
    if (!f) return "Attachments Library.base";
    return normalizePath(`${f}/Attachments Library.base`);
  }

  getBaseFilePath(): string {
    return this.getBaseFilePathForFolder(this.settings.baseFolderPath);
  }

  async createOrUpdateBaseFile(): Promise<void> {
    const basePath = this.getBaseFilePath();
    const existing = this.app.vault.getFileByPath(basePath);
    if (existing) return;

    const folder = this.settings.baseFolderPath?.trim();
    if (folder) {
      await this.app.vault.createFolder(folder).catch(() => {});
    }

    const content = this.buildBaseContent();
    await this.app.vault.create(basePath, content);
  }

  async moveBaseFile(oldFolder: string, newFolder: string): Promise<void> {
    const baseName = "Attachments Library.base";
    const oldPath = oldFolder.trim()
      ? normalizePath(`${oldFolder.trim()}/${baseName}`)
      : baseName;
    const newPath = newFolder.trim()
      ? normalizePath(`${newFolder.trim()}/${baseName}`)
      : baseName;

    if (oldPath === newPath) return;

    const existingFile = this.app.vault.getFileByPath(oldPath);
    if (!existingFile) return;

    if (newFolder.trim()) {
      await this.app.vault.createFolder(newFolder.trim()).catch(() => {});
    }

    await this.app.fileManager.renameFile(existingFile, newPath);
  }

  private buildBaseContent(): string {
    const tagsKey = this.settings.tagsPropertyName;
    const orderList = [
      "      - file.name",
      "      - title",
      "      - author",
      "      - subject",
      "      - genre",
      "      - status",
      `      - ${tagsKey}`,
      "      - source",
      "      - notes",
      "      - created",
      "      - updated",
    ].join('\n');
    return [
      "filters:",
      `  file.inFolder("${this.settings.libraryFolder}")`,
      "",
      "properties:",
      `  attachment:`,
      `    displayName: "${t('bases.columns.file')}"`,
      `  title:`,
      `    displayName: "${t('bases.columns.title')}"`,
      `  author:`,
      `    displayName: "${t('bases.columns.author')}"`,
      `  subject:`,
      `    displayName: "${t('bases.columns.subject')}"`,
      `  genre:`,
      `    displayName: "${t('bases.columns.genre')}"`,
      `  status:`,
      `    displayName: "${t('bases.columns.status')}"`,
      `  ${tagsKey}:`,
      `    displayName: "${t('bases.columns.tags')}"`,
      `  source:`,
      `    displayName: "${t('bases.columns.source')}"`,
      `  notes:`,
      `    displayName: "${t('bases.columns.notes')}"`,
      `  created:`,
      `    displayName: "${t('bases.columns.createdAt')}"`,
      `  updated:`,
      `    displayName: "${t('bases.columns.updatedAt')}"`,
      `  _fileType:`,
      `    displayName: "${t('bases.columns.type')}"`,
      "",
      "views:",
      `  - type: table`,
      `    name: "${t('bases.views.all')}"`,
      `    order:`,
      orderList,
      `    sort:`,
      `      - property: title`,
      `        direction: ASC`,
      "",
      `  - type: table`,
      `    name: "${t('bases.views.unread')}"`,
      `    order:`,
      orderList,
      `    filters:`,
      `      and:`,
      `        - status.equals("unread")`,
      `    sort:`,
      `      - property: created`,
      `        direction: DESC`,
      "",
      `  - type: table`,
      `    name: "${t('bases.views.reading')}"`,
      `    order:`,
      orderList,
      `    filters:`,
      `      and:`,
      `        - status.equals("reading")`,
      "",
      `  - type: table`,
      `    name: "${t('bases.views.pdfsOnly')}"`,
      `    order:`,
      orderList,
      `    filters:`,
      `      and:`,
      `        - _fileType.equals("pdf")`,
      `    sort:`,
      `      - property: author`,
      `        direction: ASC`,
    ].join('\n');
  }
}
