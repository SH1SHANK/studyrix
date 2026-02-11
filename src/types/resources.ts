export type SyllabusAssets = {
  provider: "google-drive";
  folderId: string;
  folderUrl?: string;
  visibility?: string;
};

export type ResourceCourse = {
  courseID: string;
  courseName: string | null;
  syllabusAssets: SyllabusAssets | null;
};

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
};

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  modifiedTime: string;
  mimeType: string;
  tags: string[];
};

export const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
