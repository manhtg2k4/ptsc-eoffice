# Hướng dẫn Rollback chi tiết Frontend (FE)

Tài liệu này ghi lại chi tiết chính xác từng dòng code đã được sửa đổi trên Frontend (FE) thuộc dự án `fe-tancang`. Bạn có thể sử dụng tài liệu này để hoàn tác thủ công bằng tay hoặc yêu cầu tôi thực hiện hoàn tác bất kỳ lúc nào.

---

## Các file Frontend đã chỉnh sửa:
1. `fe-tancang/src/components/SuggestTransferProcess/indexV2.js`
2. `fe-tancang/src/components/SuggestTransferProcess/RenderTableTreeSuggestTransferProcess.js`

---

## 1. Chi tiết thay đổi tại file `indexV2.js`

### Thay đổi 1: Lấy `documentHistory` từ Redux và tính toán danh sách ID bị khóa (`alreadySentUserIds`)
* **Vị trí**: Khoảng dòng **290** (dưới đoạn khai báo selectors từ `state.user`)
* **Đoạn code đã thêm**:
```javascript
  const { documentHistory } = useSelector((state) => state.unit || {});

  const alreadySentUserIds = useMemo(() => {
    const ids = new Set();
    const isThemXuLyAction = actionCode === "THEM_XU_LY" || codeAvailableActions === "THEM_XU_LY";
    if (isThemXuLyAction && Array.isArray(documentHistory)) {
      documentHistory.forEach((row) => {
        if (Array.isArray(row.childs)) {
          row.childs.forEach((child) => {
            if (child?.stageStatus !== "Đã xử lý") {
              if (child.receiver?._id) ids.add(child.receiver._id);
              if (child.receiver?.id) ids.add(child.receiver.id);
            }
          });
        }
      });
    }

    return ids;
  }, [documentHistory]);
```
* **Cách rollback thủ công**: Xóa bỏ hoàn toàn đoạn code trên.

---

### Thay đổi 2: Loại bỏ các user bị khóa khỏi logic tự động tích chọn khi chỉ có duy nhất 1 user
* **Vị trí**: Khoảng dòng **906** (trong khối `useEffect` tự động chọn `chiDao`)
* **Đoạn code đã sửa**:
```javascript
    // Trước khi sửa:
    const allUsers = getAllUsers(dataMergeUserAndUnit);

    // Sau khi sửa:
    const allUsers = getAllUsers(dataMergeUserAndUnit).filter((user) => {
      const uId = user._id || user.id;
      return !alreadySentUserIds.has(uId);
    });
```
* **Cách rollback thủ công**: Thay thế đoạn "Sau khi sửa" bằng đoạn "Trước khi sửa", đồng thời xóa `alreadySentUserIds` khỏi mảng dependencies ở cuối `useEffect` này:
```javascript
  // Thay thế:
  }, [dataMergeUserAndUnit, canTransferRoom, alreadySentUserIds]);
  // Về lại:
  }, [dataMergeUserAndUnit, canTransferRoom]);
```

---

### Thay đổi 3: Loại bỏ các user bị khóa khỏi logic tự động tích chọn vai trò Văn thư (`VAN_THU_TCT`)
* **Vị trí**: Khoảng dòng **941** (trong khối `useEffect` của `targetRole === "VAN_THU_TCT"`)
* **Đoạn code đã sửa**:
```javascript
    // Trước khi sửa:
    const firstUser = allUnits.find((unit) => unit.types === "user" || unit.type === "user");

    // Sau khi sửa:
    const firstUser = allUnits.find((unit) => {
      const isUser = unit.types === "user" || unit.type === "user";
      if (!isUser) return false;
      const uId = unit._id || unit.id;
      return !alreadySentUserIds.has(uId);
    });
```
* **Cách rollback thủ công**: Thay thế đoạn "Sau khi sửa" bằng đoạn "Trước khi sửa", đồng thời xóa `alreadySentUserIds` khỏi mảng dependencies ở cuối `useEffect` này:
```javascript
  // Thay thế:
  }, [dataMergeUserAndUnit, targetRole, alreadySentUserIds]);
  // Về lại:
  }, [dataMergeUserAndUnit, targetRole]);
```

---

### Thay đổi 4: Truyền prop `disabledUserIds` vào component `RenderTableTree`
* **Vị trí**: Cả 2 nơi gọi `<RenderTableTree ... />` trong hàm render (khoảng dòng **1365** và **1393**)
* **Đoạn code đã sửa**: Thêm dòng dưới đây vào danh sách props của cả 2 component:
```javascript
                  disabledUserIds={alreadySentUserIds}
```
* **Cách rollback thủ công**: Xóa dòng `disabledUserIds={alreadySentUserIds}` ở cả 2 component này đi.

---
---

## 2. Chi tiết thay đổi tại file `RenderTableTreeSuggestTransferProcess.js`

### Thay đổi 1: Nhận prop `disabledUserIds` trong component `Row`
* **Vị trí**: Đoạn khai báo tham số đầu vào của hàm `Row` (dòng **175**)
* **Đoạn code đã sửa**:
```javascript
    // Sau khi sửa (đã thêm disabledUserIds vào cuối):
    errors,
    setDeadlineError,
    disabledUserIds,
  }) => {
```
* **Cách rollback thủ công**: Xóa `, disabledUserIds` trong danh sách tham số.

---

### Thay đổi 2: Tích hợp logic disable vào `isDisabled` của `Row`
* **Vị trí**: Khối `useMemo` của biến `isDisabled` (dòng **213**)
* **Đoạn code đã sửa**:
```javascript
    // Trước khi sửa:
    const isDisabled = useMemo(() => {
      if (!canTransferRoom) return false;
      // ...
      return false;
    }, [canTransferRoom, item, isParentUnitSelected, isAnyChildUserSelected, hasChild]);

    // Sau khi sửa (đã thêm check disabledUserIds và mảng dependencies):
    const isDisabled = useMemo(() => {
      const itemId = item?._id ?? item?.id;
      if (itemId && disabledUserIds?.has(itemId)) {
        return true;
      }

      if (!canTransferRoom) return false;
      // ...
      return false;
    }, [canTransferRoom, item, isParentUnitSelected, isAnyChildUserSelected, hasChild, disabledUserIds]);
```
* **Cách rollback thủ công**: Thay thế khối `isDisabled` về lại dạng trước khi sửa.

---

### Thay đổi 3: Truyền `disabledUserIds` xuống đệ quy các `Row` con
* **Vị trí**: Khối `childItems` bên dưới `Row` (dòng **244**)
* **Đoạn code đã sửa**: Thêm dòng dưới đây vào component `<Row ... />` bên trong hàm map của `childItems`:
```javascript
          disabledUserIds={disabledUserIds}
```
Đồng thời thêm `disabledUserIds` vào mảng dependencies ở cuối `useMemo` của `childItems`:
```javascript
    }, [
      // ...
      setDeadlineError,
      disabledUserIds,
    ]);
```
* **Cách rollback thủ công**: Xóa dòng `disabledUserIds={disabledUserIds}` và xóa `disabledUserIds` trong mảng dependencies.

---

### Thay đổi 4: Cập nhật hàm so sánh tùy biến của `React.memo` cho `Row`
* **Vị trí**: Khoảng dòng **428** (ở cuối component `Row`)
* **Đoạn code đã sửa**:
```javascript
    // Trước khi sửa:
    if (
      // ...
      prevProps.errors === nextProps.errors &&
      prevProps.setDeadlineError === nextProps.setDeadlineError
    ) {

    // Sau khi sửa (đã thêm check disabledUserIds):
    if (
      // ...
      prevProps.errors === nextProps.errors &&
      prevProps.setDeadlineError === nextProps.setDeadlineError &&
      prevProps.disabledUserIds === nextProps.disabledUserIds
    ) {
```
* **Cách rollback thủ công**: Xóa dòng check `disabledUserIds` đi.

---

### Thay đổi 5: Nhận prop `disabledUserIds` trong component chính `RenderTableTree`
* **Vị trí**: Tham số đầu vào của component `RenderTableTree` (khoảng dòng **461**)
* **Đoạn code đã sửa**:
```javascript
  // Sau khi sửa (đã thêm disabledUserIds vào cuối):
  setDeadlineError,
  // hideCheckboxes
  disabledUserIds,
}) => {
```
* **Cách rollback thủ công**: Xóa `, disabledUserIds` đi.

---

### Thay đổi 6: Truyền prop `disabledUserIds` từ `RenderTableTree` vào các `Row` gốc
* **Vị trí**: Khối render `<Row ... />` ở cuối file (khoảng dòng **651**)
* **Đoạn code đã sửa**: Thêm dòng sau vào component `<Row ... />`:
```javascript
              disabledUserIds={disabledUserIds}
```
* **Cách rollback thủ công**: Xóa dòng đó đi.

---

### Thay đổi 7: Khai báo `PropTypes` cho `disabledUserIds`
* **Vị trí**: Khối `RenderTableTree.propTypes` (khoảng dòng **674**)
* **Đoạn code đã sửa**: Thêm dòng sau vào cuối object cấu hình propTypes:
```javascript
  disabledUserIds: PropTypes.object,
```
* **Cách rollback thủ công**: Xóa dòng đó đi.
