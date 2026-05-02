import React from "react";
import { Download } from "lucide-react";
import { getFileIcon } from "@/utils/file-icon.util";
import { truncateFileName } from "@/utils/render-file";

interface Props {
  documentFiles: any[];
  onDownload: (file: any) => void;
}

const DocumentList: React.FC<Props> = ({ documentFiles, onDownload }) => {
  if (documentFiles.length === 0) return null;

  return (
    <div className="space-y-1 mt-1">
      {documentFiles.map((file: any, index: number) => (
        <div
          key={index}
          className="flex items-center gap-3 p-2 bg-black/5 rounded-md"
        >
          <div>{getFileIcon(file.fileName)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {truncateFileName(file.fileName, 40)}
            </p>
            <p className="text-xs text-gray-500">
              {(file.fileSize / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(file);
            }}
            className="p-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default React.memo(DocumentList);
