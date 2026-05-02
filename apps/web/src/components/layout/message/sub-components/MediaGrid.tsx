import React from "react";

interface Props {
  mediaFiles: any[];
  onPreview: (index: number) => void;
  onLoad: () => void;
}

const MediaGrid: React.FC<Props> = ({ mediaFiles, onPreview, onLoad }) => {
  if (mediaFiles.length === 0) return null;

  return (
    <div
      className={`grid gap-1 ${
        mediaFiles.length === 1
          ? "grid-cols-1"
          : mediaFiles.length === 2
            ? "grid-cols-2"
            : "grid-cols-3"
      }`}
    >
      {mediaFiles.map((file: any, index: number) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-xl border bg-black group cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(index);
          }}
        >
          {file.type === "IMAGE" && (
            <img
              src={file.fileKey}
              className="w-full h-32 object-cover group-hover:scale-105 transition"
              onLoad={onLoad}
              alt="attachment"
            />
          )}
          {file.type === "VIDEO" && (
            <video
              src={file.fileKey}
              className="w-full h-32 object-cover"
              onLoadedMetadata={onLoad}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default React.memo(MediaGrid);
