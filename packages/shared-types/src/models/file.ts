import type { FileType } from "../enums/file-type.js";

export interface File {
  fileKey: string;
  fileName: string;
  fileSize: number;
  type: FileType;
}