export interface AttachmentsLibrarySettings {
  attachmentsFolder: string;
  libraryFolder: string;
  watchedExtensions: string[];
  autoCreateOnNew: boolean;
  autoDeleteOnRemove: boolean;
  mirrorFolderStructure: boolean;
  enablePdfMetadataExtraction: boolean;
  enableDoiIsbnLookup: boolean;
  autoCreateBaseFile: boolean;
}

export interface AttachmentMetadata {
  attachment: string;
  title: string;
  author: string;
  keywords: string[];
  subject: string;
  genre: string;
  source: string;
  status: AttachmentStatus;
  notes: string;
  created: string;
  updated: string;
  _fileType: string;
  _filePath: string;
  _heuristic: boolean;
}

export type AttachmentStatus =
  "unread" | "reading" | "done" | "archived" | "discarded";

export const DEFAULT_METADATA: Omit<AttachmentMetadata, 'attachment' | 'created' | 'updated' | '_fileType' | '_filePath'> = {
  title: "",
  author: "",
  keywords: [],
  subject: "",
  genre: "",
  source: "",
  status: "unread",
  notes: "",
  _heuristic: false,
};

export const DEFAULT_SETTINGS: AttachmentsLibrarySettings = {
  attachmentsFolder: "Attachments",
  libraryFolder: "Library",
  watchedExtensions: [".pdf", ".epub", ".docx", ".xlsx", ".pptx",
                      ".png", ".jpg", ".jpeg", ".gif", ".mp4", ".mp3", ".zip"],
  autoCreateOnNew: true,
  autoDeleteOnRemove: true,
  mirrorFolderStructure: true,
  enablePdfMetadataExtraction: true,
  enableDoiIsbnLookup: false,
  autoCreateBaseFile: true,
};
