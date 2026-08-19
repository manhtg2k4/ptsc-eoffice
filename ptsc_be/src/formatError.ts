import { ValidationError } from '@nestjs/common';

function formatErrors(errors: ValidationError[], parentPath = ''): any[] {
  const result: { field: string; message: string }[] = [];

  for (const error of errors) {
    // Xây dựng đường dẫn field
    let propertyPath: string;
    if (parentPath) {
      // Nếu property là số (index của mảng), format theo dạng parentPath[index]
      if (!isNaN(Number(error.property))) {
        propertyPath = `${parentPath}[${error.property}]`;
      } else {
        propertyPath = `${parentPath}.${error.property}`;
      }
    } else {
      propertyPath = error.property;
    }

    // Nếu có constraints (lỗi validation trực tiếp), thêm vào kết quả
    if (error.constraints && Object.keys(error.constraints).length > 0) {
      const messages = Object.values(error.constraints);
      result.push({
        field: propertyPath,
        message: messages[0], // Lấy message đầu tiên
      });
    }

    // Xử lý children (nested objects/arrays)
    if (error.children && error.children.length > 0) {
      result.push(...formatErrors(error.children, propertyPath));
    }
  }

  return result;
}

export { formatErrors };
