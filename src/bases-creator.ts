import { App } from 'obsidian';
import { AttachmentsLibrarySettings } from './types';

export class BasesCreator {
  constructor(
    private app: App,
    private settings: AttachmentsLibrarySettings
  ) {}

  async createOrUpdateBaseFile(): Promise<void> {
    const basePath = "Attachments Library.base";
    const existing = this.app.vault.getFileByPath(basePath);
    if (existing) return;

    const content = this.buildBaseContent();
    await this.app.vault.create(basePath, content);
  }

  private buildBaseContent(): string {
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
      `  keywords:`,
      `    displayName: "Palavras-chave"`,
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
