export const getFileIcon = (fileName: string) => {
  if (fileName.endsWith(".pdf"))
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/pdf/default.svg"
        alt="PDF"
        width="24"
        height="24"
      />
    );
  if (fileName.endsWith(".doc") || fileName.endsWith(".docx"))
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/microsoft-word/default.svg"
        alt="word"
        className="w-6 h-6"
      />
    );

  if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx"))
    return (
      <img
        src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/microsoft-excel/default.svg"
        alt="excel"
        className="w-6 h-6"
      />
    );
  return (
    <img
      src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/files/default.svg"
      alt="Files"
      width="24"
      height="24"
    />
  );
};
