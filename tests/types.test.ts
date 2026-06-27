import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_METADATA } from '../src/types';

describe('DEFAULT_SETTINGS', () => {
  it('has attachmentsFolder "Attachments"', () => {
    expect(DEFAULT_SETTINGS.attachmentsFolder).toBe('Attachments');
  });

  it('has libraryFolder "Library"', () => {
    expect(DEFAULT_SETTINGS.libraryFolder).toBe('Library');
  });

  it('watchedExtensions includes .pdf and .epub', () => {
    expect(DEFAULT_SETTINGS.watchedExtensions).toContain('.pdf');
    expect(DEFAULT_SETTINGS.watchedExtensions).toContain('.epub');
  });

  it('watchedExtensions includes image and media types', () => {
    expect(DEFAULT_SETTINGS.watchedExtensions).toContain('.png');
    expect(DEFAULT_SETTINGS.watchedExtensions).toContain('.mp4');
  });

  it('autoCreateOnNew is true', () => {
    expect(DEFAULT_SETTINGS.autoCreateOnNew).toBe(true);
  });

  it('autoDeleteOnRemove is true', () => {
    expect(DEFAULT_SETTINGS.autoDeleteOnRemove).toBe(true);
  });

  it('mirrorFolderStructure is true', () => {
    expect(DEFAULT_SETTINGS.mirrorFolderStructure).toBe(true);
  });

  it('enablePdfMetadataExtraction is true', () => {
    expect(DEFAULT_SETTINGS.enablePdfMetadataExtraction).toBe(true);
  });

  it('enableDoiIsbnLookup is false', () => {
    expect(DEFAULT_SETTINGS.enableDoiIsbnLookup).toBe(false);
  });

  it('autoCreateBaseFile is true', () => {
    expect(DEFAULT_SETTINGS.autoCreateBaseFile).toBe(true);
  });

  it('tagsPropertyName is "tags"', () => {
    expect(DEFAULT_SETTINGS.tagsPropertyName).toBe('tags');
  });
});

describe('DEFAULT_METADATA', () => {
  it('has empty title', () => {
    expect(DEFAULT_METADATA.title).toBe('');
  });

  it('has empty author', () => {
    expect(DEFAULT_METADATA.author).toBe('');
  });

  it('has empty tags array', () => {
    expect(DEFAULT_METADATA.tags).toEqual([]);
  });

  it('has empty subject', () => {
    expect(DEFAULT_METADATA.subject).toBe('');
  });

  it('has empty genre', () => {
    expect(DEFAULT_METADATA.genre).toBe('');
  });

  it('has empty source', () => {
    expect(DEFAULT_METADATA.source).toBe('');
  });

  it('has status "unread"', () => {
    expect(DEFAULT_METADATA.status).toBe('unread');
  });

  it('has empty notes', () => {
    expect(DEFAULT_METADATA.notes).toBe('');
  });

  it('has _heuristic false', () => {
    expect(DEFAULT_METADATA._heuristic).toBe(false);
  });
});
