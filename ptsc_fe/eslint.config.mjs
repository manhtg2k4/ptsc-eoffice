import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginImport from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";



/** @type {import('eslint').Linter.FlatConfig[]} */
export default [

  // Cấu hình bỏ qua các thư mục không cần kiểm tra
  {
    ignores: [
      "node_modules/**",
      "build/**",
      "dist/**",
      "*.config.js",
      "webpack.config.js",
      "commitlint.config.js",
    ],
  },
  // Cấm import trực tiếp từ MUI trong thư mục pages
  {
    files: ["src/pages/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mui/*"],
              message: "Không được phép import trực tiếp từ thư viện MUI trong thư mục pages. Vui lòng sử dụng các components từ thư mục components."
            }
          ]
        }
      ]
    }
  },
   {
    files: ["src/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../components/*", "../../components/*", "../../../components/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @components/..."
            },
            {
              group: ["../pages/*", "../../pages/*", "../../../pages/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @pages/..."
            },
            {
              group: ["../hooks/*", "../../hooks/*", "../../../hooks/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @hooks/..."
            },
            {
              group: ["../utils/*", "../../utils/*", "../../../utils/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @utils/..."
            },
            {
              group: ["../services/*", "../../services/*", "../../../services/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @services/..."
            },
            {
              group: ["../redux/*", "../../redux/*", "../../../redux/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @redux/..."
            },
            {
              group: ["../styles/*", "../../styles/*", "../../../styles/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @styles/..."
            },
            {
              group: ["../layouts/*", "../../layouts/*", "../../../layouts/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @layouts/..."
            },
            {
              group: ["../config/*", "../../config/*", "../../../config/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @config/..."
            },
            {
              group: ["../assets/*", "../../assets/*", "../../../assets/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @assets/..."
            },
            {
              group: ["../routers/*", "../../routers/*", "../../../routers/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @routers/..."
            },
            {
              group: ["../EnvironmentFile/*", "../../EnvironmentFile/*", "../../../EnvironmentFile/*"],
              message: "Không được dùng đường dẫn tương đối. Hãy dùng: @EnvironmentFile/..."
            },
            // Bắt tất cả các trường hợp còn lại
            {
              group: ["../*", "../../*", "../../../*"],
              message: "Không được dùng đường dẫn tương đối. Hãy sử dụng alias (bắt đầu bằng @)."
            }
          ]
        }
      ]
    }
  },

  {
    files: ["src/components/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Chặn các import đi ra ngoài (../) và trỏ đến file .styles.js
              group: ["../*.styles", "../**/*.styles"],
              message: "Hãy định nghĩa style trong thư mục component hoặc sử dụng style chung từ @styles."
            }
          ]
        }
      ]
    }
  },


  {
    files: ["src/**/*.{js,jsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "ImportDeclaration[source.value=/^\\./]",
          "message": "Chỉ được phép sử dụng alias (bắt đầu bằng '@') để import. Vui lòng không sử dụng đường dẫn tương đối."
        }
      ]
    }
  },

  {
    files: ["src/components/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Chặn các import đi ra ngoài (../) và trỏ đến file .styles.js
              group: ["../*.styles", "../**/*.styles"],
              message: "Hãy định nghĩa style trong thư mục component hoặc sử dụng style chung từ @styles."
            }
          ]
        }
      ]
    }
  },

  // Áp dụng cho toàn bộ file JS/JSX
 {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        "logger": "readonly",
        "process": "readonly",
      },
    },
  },

  // Cấu hình cơ bản từ ESLint và React
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,

  // Cấu hình plugin import
  {
    plugins: {
      import: pluginImport,
    },
    rules: {
      ...pluginImport.configs.recommended.rules,

      // Tắt lỗi khi import chưa resolve (tuỳ môi trường)
      "import/no-unresolved": "off",

      // Quy tắc sắp xếp import (mở comment nếu muốn dùng)
      // "import/order": [
      //   "warn",
      //   {
      //     groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
      //     pathGroups: [
      //       {
      //         pattern: "react",
      //         group: "external",
      //         position: "before",
      //       },
      //     ],
      //     pathGroupsExcludedImportTypes: ["react"],
      //     "newlines-between": "always",
      //     alphabetize: { order: "asc", caseInsensitive: true },
      //   },
      // ],
      "import/no-duplicates": "warn",
    },
  },

  // Cấu hình React Hooks và các quy tắc React nâng cao
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // React Rules
      "react/react-in-jsx-scope": "off",
      "react/no-array-index-key": "warn",
      "react/jsx-boolean-value": ["warn", "never"],
      "react/prop-types": "off", // ✅ TẮT prop-types validation
      "react/jsx-props-no-spreading": "off", // ✅ CHO PHÉP spread props

     // ❌ CẤM INLINE FUNCTION trong JSX
      "react/jsx-no-bind": [
        "error",
        {
          "ignoreRefs": true,           // Cho phép ref callbacks
          // Cho phép arrow functions nói chung (ví dụ: trong callbacks, khai báo hằng)
          // Chúng ta sẽ chặn riêng các inline event handler (onClick=() => ...) bằng
          // rules `no-restricted-syntax` phía dưới để chỉ nhắm tới trường hợp viết
          // trực tiếp hàm trong thuộc tính JSX.
          "allowArrowFunctions": true,
          "allowFunctions": true,       // Cho phép function thường
          "allowBind": false,           // Cấm .bind()
          "ignoreDOMComponents": false  // Áp dụng cho cả DOM components (div, button,...)
        }
      ],

      // ❌ CẤM CamelCase
        "camelcase": [
          "error",
          {
            "properties": "always",     // Áp dụng cho cả thuộc tính (obj.userName => lỗi)
            "ignoreDestructuring": false, // Không bỏ qua khi destructuring
            "ignoreImports": false,     // Không bỏ qua import
            "ignoreGlobals": true,      // Cho phép global có camelCase (React, window.someAPIKey)
            "allow": [],                // Nếu cần cho phép riêng, thê mtên biến vào đây
          }
        ],

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "react/no-unknown-property": ["error", { "ignore": ["jsx", "global"] }],

      // Code style / clean code
      "no-console": ["error"],
      "no-unused-vars": "error",
      "no-debugger": "error",

      // ❌ CẤM các props styling (chặn dùng sx, style, className, p, m,...) 
      // Bao gồm cả transient props ($display, $width,...)
      "react/forbid-component-props": [
        "error",
        {
          forbid: [
            // Core styling props
            "sx", "style", "className",

            // Layout
            "display", "position", "top", "right", "bottom", "left",
            "zIndex", "overflow", "overflowX", "overflowY",
            
            // Layout với $ prefix (transient props)
            "$display", "$position", "$top", "$right", "$bottom", "$left",
            "$zIndex", "$overflow", "$overflowX", "$overflowY",

            // Flexbox
            "flex", "flexGrow", "flexShrink", "flexBasis", "flexWrap", "flexDirection",
            "alignItems", "alignContent", "alignSelf", "justifyContent", "justifyItems",
            "justifySelf", "gap", "rowGap", "columnGap", "order",
            
            // Flexbox với $ prefix
            "$flex", "$flexGrow", "$flexShrink", "$flexBasis", "$flexWrap", "$flexDirection",
            "$alignItems", "$alignContent", "$alignSelf", "$justifyContent", "$justifyItems",
            "$justifySelf", "$gap", "$rowGap", "$columnGap", "$order",

            // Grid
            "gridTemplateColumns", "gridTemplateRows", "gridTemplateAreas",
            "gridColumn", "gridRow", "gridArea", "gridAutoFlow",
            "gridAutoColumns", "gridAutoRows",
            
            // Grid với $ prefix
            "$gridTemplateColumns", "$gridTemplateRows", "$gridTemplateAreas",
            "$gridColumn", "$gridRow", "$gridArea", "$gridAutoFlow",
            "$gridAutoColumns", "$gridAutoRows",

            // Sizing
            "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
            "boxSizing",
            
            // Sizing với $ prefix
            "$width", "$height", "$minWidth", "$minHeight", "$maxWidth", "$maxHeight",
            "$boxSizing",

            // Spacing
            "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
            "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
            
            // Spacing với $ prefix
            "$padding", "$paddingTop", "$paddingRight", "$paddingBottom", "$paddingLeft",
            "$margin", "$marginTop", "$marginRight", "$marginBottom", "$marginLeft",

            // // MUI shorthand props
            // "p", "pt", "pr", "pb", "pl", "px", "py",
            // "m", "mt", "mr", "mb", "ml", "mx", "my",
            
            // // MUI shorthand với $ prefix
            // "$p", "$pt", "$pr", "$pb", "$pl", "$px", "$py",
            // "$m", "$mt", "$mr", "$mb", "$ml", "$mx", "$my",

            // Typography
            "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight",
            "letterSpacing", "textAlign", "textTransform", "textDecoration",
            "whiteSpace", "wordBreak", "wordWrap",
            
            // Typography với $ prefix
            "$fontFamily", "$fontSize", "$fontWeight", "$fontStyle", "$lineHeight",
            "$letterSpacing", "$textAlign", "$textTransform", "$textDecoration",
            "$whiteSpace", "$wordBreak", "$wordWrap",

            // Colors
            "color", "backgroundColor", "bgcolor", "bgColor", "opacity",
            
            // Colors với $ prefix
            "$color", "$backgroundColor", "$bgcolor", "$bgColor", "$opacity",

            // Borders
            "border", "borderTop", "borderRight", "borderBottom", "borderLeft",
            "borderColor", "borderWidth", "borderStyle", "borderRadius",
            
            // Borders với $ prefix
            "$border", "$borderTop", "$borderRight", "$borderBottom", "$borderLeft",
            "$borderColor", "$borderWidth", "$borderStyle", "$borderRadius",

            // Effects
            "boxShadow", "textShadow", "transform", "transition", "animation",
            
            // Effects với $ prefix
            "$boxShadow", "$textShadow", "$transform", "$transition", "$animation",

            // // MUI Grid responsive props
            // "xs", "sm", "md", "lg", "xl",
            // MUI Grid responsive props
            
            
            // // MUI Grid với $ prefix
            // "$xs", "$sm", "$md", "$lg", "$xl",
          ],
        },
      ],

      // ❌ CẤM destructuring props có tên liên quan đến styling
      "no-restricted-syntax": [
        "error",
        // Chặn destructure styling props (bao gồm cả $ prefix)
        {
          selector: "VariableDeclarator[id.type='ObjectPattern'] Property[key.name=/^(\\$)?(sx|style|className|width|height|padding|margin|color|backgroundColor|display|flex|grid|border|p|pt|pr|pb|pl|px|py|m|mt|mr|mb|ml|mx|my|bgcolor|xs|sm|md|lg|xl|alignItems|justifyContent|flexDirection|gap|position|top|left|right|bottom|zIndex|overflow|borderRadius|fontFamily|fontSize|fontWeight|lineHeight|textAlign|boxShadow|transition|transform|animation|opacity)$/]",
        },
        // Chặn truy cập props.sx, props.style, props.$width,...
        {
          selector: "MemberExpression[object.name='props'][property.name=/^(\\$)?(sx|style|className|width|height|padding|margin|color|backgroundColor|p|m|pt|pr|pb|pl|px|py|mt|mr|mb|ml|mx|my|bgcolor|display|flex|alignItems|justifyContent|gap|position|borderRadius)$/]",
        },
        // Chặn thay đổi style trong event handlers
        {
          selector: "JSXAttribute[name.name=/^(on[A-Z])/] Literal[value=/style|className|sx/]",
        },
        // Chặn spread object có styling props: {...{sx: ...}}, {...{$width: ...}}
        {
          selector: "JSXSpreadAttribute > ObjectExpression > Property[key.name=/^(\\$)?(sx|style|className|width|height|padding|margin|color|backgroundColor|display|flex|grid|border|p|pt|pr|pb|pl|px|py|m|mt|mr|mb|ml|mx|my|bgcolor|xs|sm|md|lg|xl)$/]",
        },
        // Chặn JSX attribute có tên bắt đầu bằng $ và chứa styling keywords
        {
          selector: "JSXAttribute[name.name=/^\\$(display|width|height|padding|margin|color|background|flex|grid|align|justify|gap|position|border|font|text|box|transform|transition|animation|opacity|overflow|zIndex)/]",
        },
        // Chặn template literal có chứa style/className: `${styles.xxx}`
        {
          selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral",
        },
        // Chặn conditional styling: condition ? 'class1' : 'class2'
        {
          selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > ConditionalExpression",
        },
        // Chặn array/object methods tạo className động
        {
          selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > CallExpression[callee.property.name=/^(join|concat|map|filter)$/]",
        },
          {
          selector: "JSXAttribute[name.name=/^on[A-Z]/] > JSXExpressionContainer > ArrowFunctionExpression",
          message: "Avoid inline arrow functions for event handlers — move the handler to a stable function or use useCallback",
        },
        {
          selector: "JSXAttribute[name.name=/^on[A-Z]/] > JSXExpressionContainer > FunctionExpression",
          message: "Avoid inline function expressions for event handlers — move the handler to a stable function or use useCallback",
        },
      ],
    },
  },
];
