# Quick Start - FormButton Plugin System

## Cách sử dụng nhanh

### 1. Tạo Custom Dialog của bạn

Tạo file mới: `FormButton/plugins/myDialog.plugin.js`

```javascript
import React from 'react';
import CustomDialog from '@components/CustomDialog/CustomDialog';

const MyCustomDialog = ({ open, onClose, dataDetail }) => {
  return (
    <CustomDialog 
      open={open} 
      title="My Custom Dialog" 
      onClose={onClose}
      onSave={() => {
        // Logic của bạn
        onClose();
      }}
    >
      <div>Content của dialog</div>
    </CustomDialog>
  );
};

export default {
  name: 'MyCustomDialog',
  component: MyCustomDialog,
  mapProps: (openDialog, allProps) => ({
    open: openDialog?.MyCustomDialog || false,
    onClose: () => allProps.handleCloseDialog?.('MyCustomDialog'),
    dataDetail: allProps.dataDetail,
  }),
};
```

### 2. Sử dụng Dialog

Trong code, gọi:

```javascript
setOpenDialog({ MyCustomDialog: true });
```

### 3. Xong!

Plugin sẽ tự động được phát hiện và hoạt động.

## Chi tiết

- Xem [plugins/README.md](./README.md) để có hướng dẫn đầy đủ
- Xem [example.plugin.js](./example.plugin.js) để có ví dụ chi tiết
