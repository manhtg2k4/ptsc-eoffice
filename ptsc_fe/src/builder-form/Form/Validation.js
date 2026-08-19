import * as yup from "yup";

export function buildSchema(fields) {
  const shape = {};
  
  fields.forEach((f) => {
    let validator;

    switch (f.type) {
      case "text":
      case "number":
      case "extractUser":
        validator = yup.string().trim();
        if (f.required) {
          validator = validator.required(`${f.label} là bắt buộc`);
        }
      
        if (f.minLength) {
          validator = validator.min(
            f.minLength,
            `${f.label} phải có ít nhất ${f.minLength} ký tự`
          );
        }
        if (f.maxLength) {
          validator = validator.max(
            f.maxLength,
            `${f.label} không được vượt quá ${f.maxLength} ký tự`
          );
        }
        break;

      case "enum":
      case "autocomplete":
      case "dynamicFormList":
      case "nextHandlers":
        // Giá trị có thể là object {label, value} hoặc chỉ là value
        validator = yup
          .mixed()
          .test("is-selected", `${f.label} là bắt buộc`, (val) => {
            if (!f.required) return true;
            return val != null && val !== "" && (val.value !== undefined || val.value !== null);
          });
        break;

      case "table":
        // Giá trị là một chuỗi JSON của mảng
        validator = yup
          .string()
          .test("is-not-empty-array", `${f.label} là bắt buộc`, (val) => {
            if (!f.required) return true;
            if (!val || typeof val !== "string") return false;
            try {
              const arr = JSON.parse(val);
              return Array.isArray(arr) && arr.length > 0;
            } catch (e) {
              return false;
            }
          });
        break;

      case "date":
      case "datetime":
      case "time":
        validator = yup.string().trim();
        if (f.required) {
          validator = validator.required(`${f.label} là bắt buộc`);
        }
        break;

      case "file":
        validator = yup.mixed(); // Cho phép cả File object và string (ID)
        if (f.required) {
          validator = validator.test('is-required', `${f.label || 'Tệp đính kèm'} là bắt buộc`, value => value != null && value !== '');
        }
        break;
    }
  
    shape[f.name] = yup.object({
      value: validator,
    });
  });

  return yup.object().shape(shape);
}
