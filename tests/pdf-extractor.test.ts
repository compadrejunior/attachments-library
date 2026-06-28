import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TFile, requestUrl } from 'obsidian';

const mockLoad = vi.hoisted(() => vi.fn());

vi.mock('pdf-lib', () => ({
  PDFDocument: { load: mockLoad },
}));

import { PdfMetadataExtractor, lookupDoi, lookupIsbn } from '../src/pdf-extractor';

function makePdfDoc(overrides: {
  title?: string | null;
  author?: string | null;
  subject?: string | null;
  keywords?: string | null;
  creationDate?: Date | null;
  modificationDate?: Date | null;
} = {}) {
  return {
    getTitle: vi.fn().mockReturnValue(overrides.title ?? null),
    getAuthor: vi.fn().mockReturnValue(overrides.author ?? null),
    getSubject: vi.fn().mockReturnValue(overrides.subject ?? null),
    getKeywords: vi.fn().mockReturnValue(overrides.keywords ?? null),
    getCreationDate: vi.fn().mockReturnValue(overrides.creationDate ?? null),
    getModificationDate: vi.fn().mockReturnValue(overrides.modificationDate ?? null),
  };
}

function makeTFile(path = 'Attachments/file.pdf'): TFile {
  const f = new TFile();
  f.path = path;
  f.extension = 'pdf';
  return f;
}

const mockApp = {
  vault: {
    readBinary: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  },
};

describe('PdfMetadataExtractor', () => {
  beforeEach(() => {
    mockLoad.mockClear();
    mockApp.vault.readBinary.mockClear();
  });

  describe('extract', () => {
    it('returns all metadata fields from a valid PDF', async () => {
      const creationDate = new Date('2023-01-15T00:00:00Z');
      const modificationDate = new Date('2024-06-01T00:00:00Z');
      mockLoad.mockResolvedValue(makePdfDoc({
        title: '  My Book  ',
        author: '  Jane Doe  ',
        subject: '  Science  ',
        keywords: 'ai, ml, deep-learning',
        creationDate,
        modificationDate,
      }));
      const extractor = new PdfMetadataExtractor(mockApp as any);
      const result = await extractor.extract(makeTFile());
      expect(result.title).toBe('My Book');
      expect(result.author).toBe('Jane Doe');
      expect(result.subject).toBe('Science');
      expect(result.keywords).toEqual(['ai', 'ml', 'deep-learning']);
      expect(result.creationDate).toBe('2023-01-15');
      expect(result.modificationDate).toBe('2024-06-01');
    });

    it('splits keywords by semicolon as well as comma', async () => {
      mockLoad.mockResolvedValue(makePdfDoc({ keywords: 'ai; ml; nlp' }));
      const extractor = new PdfMetadataExtractor(mockApp as any);
      const result = await extractor.extract(makeTFile());
      expect(result.keywords).toEqual(['ai', 'ml', 'nlp']);
    });

    it('returns empty values when PDF has no metadata', async () => {
      mockLoad.mockResolvedValue(makePdfDoc());
      const extractor = new PdfMetadataExtractor(mockApp as any);
      const result = await extractor.extract(makeTFile());
      expect(result.title).toBe('');
      expect(result.author).toBe('');
      expect(result.subject).toBe('');
      expect(result.keywords).toEqual([]);
      expect(result.creationDate).toBeNull();
      expect(result.modificationDate).toBeNull();
    });

    it('returns empty keywords array when keywords string is empty', async () => {
      mockLoad.mockResolvedValue(makePdfDoc({ keywords: '  ' }));
      const extractor = new PdfMetadataExtractor(mockApp as any);
      const result = await extractor.extract(makeTFile());
      expect(result.keywords).toEqual([]);
    });

    it('filters out blank keyword tokens', async () => {
      mockLoad.mockResolvedValue(makePdfDoc({ keywords: 'ai,,ml' }));
      const extractor = new PdfMetadataExtractor(mockApp as any);
      const result = await extractor.extract(makeTFile());
      expect(result.keywords).toEqual(['ai', 'ml']);
    });

    it('returns empty result when pdf-lib throws an error', async () => {
      mockLoad.mockRejectedValue(new Error('corrupt PDF'));
      const extractor = new PdfMetadataExtractor(mockApp as any);
      const result = await extractor.extract(makeTFile());
      expect(result.title).toBe('');
      expect(result.author).toBe('');
      expect(result.keywords).toEqual([]);
      expect(result.creationDate).toBeNull();
    });

    it('returns empty result when readBinary throws', async () => {
      mockApp.vault.readBinary.mockRejectedValueOnce(new Error('IO error'));
      const extractor = new PdfMetadataExtractor(mockApp as any);
      const result = await extractor.extract(makeTFile());
      expect(result.title).toBe('');
    });
  });
});

describe('lookupDoi', () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
  });

  it('returns title, author and subject on success', async () => {
    vi.mocked(requestUrl).mockResolvedValueOnce({
      json: {
        message: {
          title: ['Deep Learning'],
          author: [{ family: 'Goodfellow', given: 'Ian' }, { family: 'Bengio', given: 'Yoshua' }],
          subject: ['Computer Science'],
        },
      },
    } as any);
    const result = await lookupDoi('10.1000/xyz123');
    expect(result.title).toBe('Deep Learning');
    expect(result.author).toBe('Goodfellow, Ian; Bengio, Yoshua');
    expect(result.subject).toBe('Computer Science');
  });

  it('returns empty object when requestUrl throws (non-2xx)', async () => {
    vi.mocked(requestUrl).mockRejectedValueOnce(new Error('HTTP 404'));
    const result = await lookupDoi('10.bad/doi');
    expect(result).toEqual({});
  });

  it('returns empty object when requestUrl throws (network error)', async () => {
    vi.mocked(requestUrl).mockRejectedValueOnce(new Error('network error'));
    const result = await lookupDoi('10.bad/doi');
    expect(result).toEqual({});
  });

  it('handles missing optional fields gracefully', async () => {
    vi.mocked(requestUrl).mockResolvedValueOnce({ json: { message: {} } } as any);
    const result = await lookupDoi('10.1000/xyz');
    expect(result.title).toBe('');
    expect(result.author).toBe('');
    expect(result.subject).toBe('');
  });
});

describe('lookupIsbn', () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
  });

  it('returns title and subject on success', async () => {
    vi.mocked(requestUrl).mockResolvedValueOnce({
      json: { title: 'Clean Code', subjects: ['Software Engineering'] },
    } as any);
    const result = await lookupIsbn('9780132350884');
    expect(result.title).toBe('Clean Code');
    expect(result.subject).toBe('Software Engineering');
  });

  it('returns empty object when requestUrl throws (non-2xx)', async () => {
    vi.mocked(requestUrl).mockRejectedValueOnce(new Error('HTTP 404'));
    const result = await lookupIsbn('000');
    expect(result).toEqual({});
  });

  it('returns empty object when requestUrl throws (network error)', async () => {
    vi.mocked(requestUrl).mockRejectedValueOnce(new Error('offline'));
    const result = await lookupIsbn('000');
    expect(result).toEqual({});
  });

  it('handles missing optional fields gracefully', async () => {
    vi.mocked(requestUrl).mockResolvedValueOnce({ json: {} } as any);
    const result = await lookupIsbn('9780000000000');
    expect(result.title).toBe('');
    expect(result.subject).toBe('');
  });
});
