export const formatFileSize = (bytes) => {
  // Convert string to number if needed
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  
  if (!numBytes || numBytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return Math.round((numBytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const getFileIcon = (fileName) => {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  const iconMap = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "🎯",
    pptx: "🎯",
    txt: "📃",
    rtf: "📃",
  };
  return iconMap[ext] || "📎";
};
