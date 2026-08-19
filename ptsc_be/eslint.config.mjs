import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  {
    rules: {
      "no-unused-vars": "error",  // ❌ Báo lỗi nếu có biến không dùng
      "no-undef": "error",         // ❌ Báo lỗi nếu dùng biến chưa khai báo
      "no-unsafe-optional-chaining": "error",
      "@typescript-eslint/no-explicit-any": "off", // Tắt cảnh báo `any`
      "@typescript-eslint/no-unsafe-member-access": "off", // Tắt lỗi truy cập `any`
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];