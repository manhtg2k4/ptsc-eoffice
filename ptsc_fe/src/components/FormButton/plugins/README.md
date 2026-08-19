# Hướng dẫn tạo Custom Plugin cho FormButton

## Giới thiệu

Thư mục này cho phép bạn tạo các custom dialog/popup riêng mà không cần chỉnh sửa file `index.js` chính của FormButton. Mỗi plugin sẽ tự động được phát hiện và tích hợp vào hệ thống.

## Cách tạo Plugin

### Bước 1: Tạo file plugin

Tạo một file mới trong thư mục này với format: `<tên-plugin>.plugin.js`

Ví dụ: `myCustomDialog.plugin.js`

### Bước 2: Định nghĩa Plugin Structure

File plugin phải export default một object với cấu trúc sau:

```javascript
import React from 'react';
import CustomDialog from '@components/CustomDialog/CustomDialog';

// Component dialog của bạn
const MyCustomDialog = ({ open, onClose, onSave, dataDetail, ...props }) => {
  return (
    <CustomDialog
      open={open}
      title="My Custom Dialog"
      onClose={onClose}
      onSave={onSave}
    >
      {/* Nội dung dialog của bạn */}
      <div>Custom content here...</div>
    </CustomDialog>
  );
};

// Export plugin
export default {
  // Tên duy nhất của plugin (REQUIRED)
  name: 'MyCustomDialog',
  
  // Component React để render (REQUIRED)
  component: MyCustomDialog,
  
  // Function để map props từ FormButton vào component (OPTIONAL)
  // Nhận vào (openDialog, allProps) và return props cho component
  mapProps: (openDialog, allProps) => ({
    open: openDialog?.MyCustomDialog || false,
    onClose: () => allProps.handleCloseDialog?.('MyCustomDialog'),
    dataDetail: allProps.dataDetail,
    setReloadData: allProps.setReloadData,
    // ... các props khác
  }),
  
  // Metadata (OPTIONAL)
  meta: {
    description: 'Dialog tùy chỉnh của tôi',
    author: 'Your Name',
    version: '1.0.0'
  }
};
```

### Bước 3: Sử dụng Plugin

Plugin sẽ tự động được load khi FormButton khởi tạo. Để mở dialog, bạn cần:

1. Set state `openDialog` với key là tên plugin:
```javascript
setOpenDialog({ MyCustomDialog: true });
```

2. Hoặc từ `handleMainActionClick`, map action type vào tên plugin trong `ACTION_MAP`

## Props có sẵn trong mapProps

Function `mapProps` nhận vào object `allProps` chứa tất cả props từ FormButton:

- `openDialog` - State hiện tại của các dialogs
- `dataDetail` - Chi tiết dữ liệu (document, workItem, etc.)
- `setReloadData` - Function để reload data sau khi thực hiện action
- `onClose` - Function để đóng appbar/modal chính
- `documentId` - ID của document
- `workItem` - Work item ID
- `userId` - User ID hiện tại
- `actionCode` - Action code hiện tại
- `sharedComponents` - Các components được share (Button, Input, toast, etc.)
- `handleCloseDialog` - Function để đóng dialog

## Best Practices

1. **Đặt tên rõ ràng**: Tên plugin nên mô tả rõ chức năng
2. **Xử lý lỗi**: Luôn có try-catch khi gọi API
3. **Clean up**: Đóng dialog và reset state sau khi hoàn thành
4. **Reusability**: Tái sử dụng các component có sẵn từ `sharedComponents`
5. **Documentation**: Thêm meta description để người khác hiểu plugin của bạn

## Ví dụ Plugin hoàn chỉnh

Xem file `example.plugin.js` trong thư mục này để có ví dụ chi tiết.

## Troubleshooting

**Plugin không được load?**
- Kiểm tra file có đuôi `.plugin.js` không
- Kiểm tra export default có đúng format không
- Xem console log để biết lỗi cụ thể

**Dialog không mở?**
- Kiểm tra tên trong `openDialog` khớp với plugin name không
- Verify `mapProps` return đúng prop `open`

**Props không được truyền đúng?**
- Check function `mapProps` có return đúng props không
- Console log `allProps` để xem props nào có sẵn
