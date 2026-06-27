import { App, TFile, normalizePath } from 'obsidian';
import { AttachmentsLibrarySettings, AttachmentMetadata, DEFAULT_METADATA } from './types';
import { PdfMetadataExtractor } from './pdf-extractor';

export class SidecarManager {
  private pdfExtractor: PdfMetadataExtractor;

  constructor(
    private app: App,
    private settings: AttachmentsLibrarySettings
  ) {
    this.pdfExtractor = new PdfMetadataExtractor(app);
  }

  getSidecarPath(attachmentPath: string): string {
    const relativePath = attachmentPath
      .replace(new RegExp(`^${this.escapeRegex(this.settings.attachmentsFolder)}/?`), "");

    if (this.settings.mirrorFolderStructure) {
      return normalizePath(`${this.settings.libraryFolder}/${relativePath}.md`);
    } else {
      const fileName = relativePath.split('/').pop() ?? relativePath;
      return normalizePath(`${this.settings.libraryFolder}/${fileName}.md`);
    }
  }

  getAttachmentPath(sidecarPath: string): string {
    return sidecarPath
      .replace(new RegExp(`^${this.escapeRegex(this.settings.libraryFolder)}/?`),
               this.settings.attachmentsFolder + "/")
      .replace(/\.md$/, "");
  }

  async createSidecar(attachmentFile: TFile): Promise<void> {
    const sidecarPath = this.getSidecarPath(attachmentFile.path);

    const existing = this.app.vault.getFileByPath(sidecarPath);
    if (existing) return;

    const sidecarFolder = sidecarPath.split('/').slice(0, -1).join('/');
    if (sidecarFolder) {
      await this.app.vault.createFolder(sidecarFolder).catch(() => {});
    }

    const metadata: AttachmentMetadata = {
      ...DEFAULT_METADATA,
      attachment: `[[${attachmentFile.path}]]`,
      created: new Date(attachmentFile.stat.ctime).toISOString().split('T')[0],
      updated: new Date(attachmentFile.stat.mtime).toISOString().split('T')[0],
      _fileType: attachmentFile.extension,
      _filePath: attachmentFile.path,
    };

    if (
      this.settings.enablePdfMetadataExtraction &&
      attachmentFile.extension === "pdf"
    ) {
      const extracted = await this.pdfExtractor.extract(attachmentFile);
      if (extracted.title) { metadata.title = extracted.title; metadata._heuristic = true; }
      if (extracted.author) { metadata.author = extracted.author; metadata._heuristic = true; }
      if (extracted.subject) metadata.subject = extracted.subject;
      if (extracted.keywords.length > 0) metadata.keywords = extracted.keywords;
    }

    const content = this.buildSidecarContent(metadata, attachmentFile.name);
    await this.app.vault.create(sidecarPath, content);
  }

  async updateSidecarDates(attachmentFile: TFile): Promise<void> {
    const sidecarPath = this.getSidecarPath(attachmentFile.path);
    const sidecar = this.app.vault.getFileByPath(sidecarPath);
    if (!sidecar) return;

    const updatedDate = new Date(attachmentFile.stat.mtime).toISOString().split('T')[0];

    await this.app.fileManager.processFrontMatter(sidecar, (fm) => {
      fm.updated = updatedDate;
    });
  }

  async renameSidecar(oldPath: string, newPath: string): Promise<void> {
    const oldSidecarPath = this.getSidecarPath(oldPath);
    const newSidecarPath = this.getSidecarPath(newPath);

    const sidecar = this.app.vault.getFileByPath(oldSidecarPath);
    if (!sidecar) return;

    await this.app.fileManager.processFrontMatter(sidecar, (fm) => {
      fm.attachment = `[[${newPath}]]`;
      fm._filePath = newPath;
      fm.updated = new Date().toISOString().split('T')[0];
    });

    const newFolder = newSidecarPath.split('/').slice(0, -1).join('/');
    if (newFolder) {
      await this.app.vault.createFolder(newFolder).catch(() => {});
    }

    await this.app.fileManager.renameFile(sidecar, newSidecarPath);
  }

  async deleteSidecar(attachmentPath: string): Promise<void> {
    const sidecarPath = this.getSidecarPath(attachmentPath);
    const sidecar = this.app.vault.getFileByPath(sidecarPath);
    if (!sidecar) return;
    await this.app.vault.trash(sidecar, true);
  }

  private buildSidecarContent(meta: AttachmentMetadata, fileName: string): string {
    const keywordsYaml = meta.keywords.length > 0
      ? `\n${meta.keywords.map(k => `  - "${k}"`).join('\n')}`
      : " []";

    return [
      "---",
      `attachment: "[[${meta._filePath}]]"`,
      `title: "${meta.title}"`,
      `author: "${meta.author}"`,
      `keywords:${keywordsYaml}`,
      `subject: "${meta.subject}"`,
      `genre: ""`,
      `source: ""`,
      `status: "${meta.status}"`,
      `notes: ""`,
      `created: "${meta.created}"`,
      `updated: "${meta.updated}"`,
      `_fileType: "${meta._fileType}"`,
      `_filePath: "${meta._filePath}"`,
      `_heuristic: ${meta._heuristic}`,
      "---",
      "",
      `# ${meta.title || fileName}`,
      "",
      `![[${meta._filePath}]]`,
      "",
    ].join('\n');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
