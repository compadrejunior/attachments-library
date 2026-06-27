import { App, normalizePath } from 'obsidian';
import { AttachmentsLibrarySettings } from './types';

export class BasesCreator {
  constructor(
    private app: App,
    private settings: AttachmentsLibrarySettings
  ) {}

  getBaseFilePath(): string {
    const folder = this.settings.baseFolderPath?.trim();
    if (!folder) return "Attachments Library.base";
    return normalizePath(`${folder}/Attachments Library.base`);
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
    return [
      "filters:",
      `  and:`,
      `    - file.inFolder("${this.settings.libraryFolder}")`,
      `    - not(file.name.contains(".base"))`,
      "",
      "properties:",
      `  attachment:`,
      `    displayName: "Arquivo"`,
      `  title:`,
      `    displayName: "Título"`,
      `  author:`,
      `    displayName: "Autor"`,
      `  subject:`,
      `    displayName: "Tema"`,
      `  genre:`,
      `    displayName: "Gênero"`,
      `  status:`,
      `    displayName: "Status"`,
      `  ${tagsKey}:`,
      `    displayName: "Tags"`,
      `  source:`,
      `    displayName: "Fonte"`,
      `  created:`,
      `    displayName: "Criado em"`,
      `  updated:`,
      `    displayName: "Atualizado em"`,
      `  _fileType:`,
      `    displayName: "Tipo"`,
      "",
      "views:",
      `  - type: table`,
      `    name: "Todos os Anexos"`,
      `    order:`,
      `      - title`,
      `    sort:`,
      `      - property: title`,
      `        direction: ASC`,
      "",
      `  - type: table`,
      `    name: "Não Lidos"`,
      `    filters:`,
      `      and:`,
      `        - status.equals("unread")`,
      `    sort:`,
      `      - property: created`,
      `        direction: DESC`,
      "",
      `  - type: table`,
      `    name: "Em Leitura"`,
      `    filters:`,
      `      and:`,
      `        - status.equals("reading")`,
      "",
      `  - type: table`,
      `    name: "Somente PDFs"`,
      `    filters:`,
      `      and:`,
      `        - _fileType.equals("pdf")`,
      `    sort:`,
      `      - property: author`,
      `        direction: ASC`,
    ].join('\n');
  }
}
