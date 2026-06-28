import { PDFDocument } from 'pdf-lib';
import { App, TFile, requestUrl } from 'obsidian';

export interface PdfExtractedMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  creationDate: string | null;
  modificationDate: string | null;
}

export class PdfMetadataExtractor {
  constructor(private app: App) {}

  async extract(file: TFile): Promise<PdfExtractedMetadata> {
    const emptyResult: PdfExtractedMetadata = {
      title: "", author: "", subject: "", keywords: [],
      creationDate: null, modificationDate: null,
    };

    try {
      const arrayBuffer = await this.app.vault.readBinary(file);

      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
      });

      const title = pdfDoc.getTitle()?.trim() ?? "";
      const author = pdfDoc.getAuthor()?.trim() ?? "";
      const subject = pdfDoc.getSubject()?.trim() ?? "";
      const rawKeywords = pdfDoc.getKeywords()?.trim() ?? "";
      const creationDate = pdfDoc.getCreationDate()?.toISOString().split('T')[0] ?? null;
      const modificationDate = pdfDoc.getModificationDate()?.toISOString().split('T')[0] ?? null;

      const keywords = rawKeywords
        ? rawKeywords.split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0)
        : [];

      return { title, author, subject, keywords, creationDate, modificationDate };
    } catch (err) {
      console.warn(`[Attachments Library] Could not extract PDF metadata from ${file.path}:`, err);
      return emptyResult;
    }
  }
}

interface CrossRefAuthor { family: string; given: string; }
interface CrossRefWork { title?: string[]; author?: CrossRefAuthor[]; subject?: string[]; }
interface CrossRefResponse { message: CrossRefWork; }

export async function lookupDoi(doi: string): Promise<Partial<PdfExtractedMetadata>> {
  try {
    const response = await requestUrl(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    const data = response.json as CrossRefResponse;
    const work = data.message;
    return {
      title: work.title?.[0] ?? "",
      author: work.author?.map(a => `${a.family}, ${a.given}`).join("; ") ?? "",
      subject: work.subject?.[0] ?? "",
    };
  } catch {
    return {};
  }
}

interface OpenLibraryBook { title?: string; subjects?: string[]; }

export async function lookupIsbn(isbn: string): Promise<Partial<PdfExtractedMetadata>> {
  try {
    const response = await requestUrl(`https://openlibrary.org/isbn/${isbn}.json`);
    const data = response.json as OpenLibraryBook;
    return {
      title: data.title ?? "",
      subject: data.subjects?.[0] ?? "",
    };
  } catch {
    return {};
  }
}
