export const flattenUnits = (units) => {
  const result = [];

  const traverse = (unitList, parentId = null, level = 0) => {
    unitList.forEach((unit) => {
      const { child, ...rest } = unit;
      result.push({
        ...rest,
        parentId,
        level,
      });

      if (child && child.length > 0) {
        traverse(child, unit._id || unit.id || null, level + 1);
      }
    });
  };

  traverse(units);
  return result;
};

/**
 * Xử lý danh sách file trước khi upload: kiểm tra trùng lặp và đổi tên nếu cần
 * @param {Array} pendingFiles - Danh sách file đang chờ xử lý
 * @param {Array} uploadedFiles - Danh sách file đã tải lên trước đó
 * @param {Function} generateDuplicateName - Hàm tạo tên mới khi trùng (từ constants.js)
 * @returns {Array} Danh sách file đã được chuẩn hóa (đổi tên, gán path)
 */
export const processFilesForUpload = (pendingFiles, uploadedFiles, generateDuplicateName) => {
  // 1. Phân loại các mục mới theo Top Level
  const newTopLevelItems = {}; // { originalName: newName }
  const existingItems = new Set(uploadedFiles.map(f => {
    const path = f.path || f.webkitRelativePath || "";
    return path.includes("/") ? path.split("/")[0] : (f.name || f.file_name);
  }));

  pendingFiles.forEach(file => {
    const path = file.webkitRelativePath || "";
    const originalTopName = path.includes("/") ? path.split("/")[0] : (file.name || file.file_name);

    if (!newTopLevelItems[originalTopName]) {
      if (existingItems.has(originalTopName)) {
        // Tách tên và extension để đổi tên đúng (đặc biệt cho file lẻ)
        newTopLevelItems[originalTopName] = generateDuplicateName(originalTopName, Array.from(existingItems));
      } else {
        newTopLevelItems[originalTopName] = originalTopName;
      }
    }
  });

  return pendingFiles.map(file => {
    const originalPath = file.webkitRelativePath || "";
    const originalTopName = originalPath.includes("/") ? originalPath.split("/")[0] : file.name;
    const newTopName = newTopLevelItems[originalTopName];

    let finalFileName = file.name;
    let finalPath = originalPath;

    if (newTopName !== originalTopName) {
      if (originalPath.includes("/")) {
        // Đổi tên phần folder cha trong path
        const parts = originalPath.split("/");
        parts[0] = newTopName;
        finalPath = parts.join("/");
      } else {
        // Đổi tên file lẻ
        finalFileName = newTopName;
        finalPath = "";
      }
    }

    if (finalFileName !== file.name || (finalPath && finalPath !== originalPath)) {
      const newFile = new File([file], finalFileName, { type: file.type, lastModified: file.lastModified });
      newFile.path = finalPath || originalPath;
      return newFile;
    }

    file.path = originalPath;
    return file;
  });
};

/**
 * Chuyển đổi danh sách File objects thành cấu trúc cây phẳng (flattened tree) để hiển thị trong FileTreeTable
 * @param {Array} files - Danh sách File objects
 * @returns {Array} Danh sách các node sau khi đã được flatten
 */
/* eslint-disable camelcase */
export const convertFilesToTreeData = (files) => {
  if (!files || files.length === 0) return [];

  const fileMap = new Map(); // Map để lưu path -> node id
  const treeData = [];
  let tempIdCounter = 0;

  // Tạo id tạm thời cho mỗi file/folder
  const getTempId = () => `temp_${tempIdCounter++}`;

  // Hàm để lấy hoặc tạo folder node
  const getOrCreateFolder = (folderPath) => {
    if (!folderPath) return null;

    if (fileMap.has(folderPath)) {
      return fileMap.get(folderPath);
    }

    const parts = folderPath.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    // Tạo các folder cha nếu chưa có
    let currentPath = "";
    let parentNode = null;

    for (let i = 0; i < parts.length; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

      if (!fileMap.has(currentPath)) {
        const folderId = getTempId();
        const folderNode = {
          id: folderId,
          _id: folderId,
          file_name: parts[i],
          name: parts[i],
          type_file: "Thư mục",
          is_directory: 1,
          parent_id: parentNode ? parentNode.id : null,
          file: null,
        };

        fileMap.set(currentPath, folderNode);

        if (parentNode) {
          if (!parentNode.children) parentNode.children = [];
          parentNode.children.push(folderNode);
        } else {
          treeData.push(folderNode);
        }

        parentNode = folderNode;
      } else {
        parentNode = fileMap.get(currentPath);
      }
    }

    return parentNode;
  };

  // Xử lý từng file
  files.forEach((file) => {
    // Ưu tiên sử dụng file.path sau đó tới webkitRelativePath
    const relativePath = file.path || file.webkitRelativePath || "";
    const fileName = file.name || file.fileName || file.file_name || "";

    if (relativePath) {
      const pathParts = relativePath.split("/").filter(Boolean);

      if (pathParts.length > 1) {
        const folderPath = pathParts.slice(0, -1).join("/");
        const parentFolder = getOrCreateFolder(folderPath);

        const fileId = getTempId();
        const fileNode = {
          id: fileId,
          _id: fileId,
          file_name: pathParts[pathParts.length - 1],
          name: pathParts[pathParts.length - 1],
          type_file: "File",
          is_directory: 0,
          parent_id: parentFolder ? parentFolder.id : null,
          file: file,
        };

        if (parentFolder) {
          if (!parentFolder.children) parentFolder.children = [];
          parentFolder.children.push(fileNode);
        } else {
          treeData.push(fileNode);
        }
      } else {
        const fileId = file.id || file._id || getTempId();
        const fileNode = {
          id: fileId,
          _id: fileId,
          file_name: fileName,
          name: fileName,
          type_file: file.type_file || "File",
          is_directory: file.is_directory || 0,
          parent_id: file.parent_id || null,
          file: file instanceof File ? file : null,
          ...file,
        };
        treeData.push(fileNode);
      }
    } else {
      const fileId = file.id || file._id || getTempId();
      const fileNode = {
        id: fileId,
        _id: fileId,
        file_name: fileName,
        name: fileName,
        type_file: file.type_file || "File",
        is_directory: file.is_directory || 0,
        parent_id: file.parent_id || null,
        file: file instanceof File ? file : null,
        ...file,
      };
      treeData.push(fileNode);
    }
  });

  // Flatten tree thành array phẳng để FileTreeTable xử lý
  const flattenResult = [];
  const traverse = (nodes) => {
    nodes.forEach((node) => {
      const { children, ...rest } = node;
      flattenResult.push(rest);
      if (children && children.length > 0) {
        traverse(children);
      }
    });
  };

  traverse(treeData);
  return flattenResult;
};
/* eslint-enable camelcase */
