import React from "react";
import { Ionicons } from "@expo/vector-icons";

export const getFileIcon = (fileName: string, size = 24) => {
  if (fileName.endsWith(".pdf"))
    return <Ionicons name="document-text" size={size} color="#ef4444" />;
  
  if (fileName.endsWith(".doc") || fileName.endsWith(".docx"))
    return <Ionicons name="document" size={size} color="#2563eb" />;

  if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx"))
    return <Ionicons name="grid" size={size} color="#16a34a" />;
    
  if (fileName.endsWith(".zip") || fileName.endsWith(".rar"))
    return <Ionicons name="archive" size={size} color="#ca8a04" />;

  return <Ionicons name="document-outline" size={size} color="#6b7280" />;
};
