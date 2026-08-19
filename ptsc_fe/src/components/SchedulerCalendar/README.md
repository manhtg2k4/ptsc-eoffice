# SchedulerCalendar Component

Component lịch họp toàn diện sử dụng FullCalendar với giao diện tiếng Việt và tích hợp Material-UI.

## 📦 Cài đặt

Các package đã được cài đặt:
```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
```

## 🎯 Tính năng

- ✅ Hiển thị lịch theo tháng, tuần, ngày
- ✅ Giao diện tiếng Việt
- ✅ Drag & drop sự kiện
- ✅ Click vào ngày/sự kiện
- ✅ Responsive design
- ✅ Tích hợp Material-UI
- ✅ Dữ liệu mẫu sẵn có

## 📖 Cách sử dụng

### Sử dụng cơ bản

```javascript
import SchedulerCalendar from './components/SchedulerCalendar';

function MyPage() {
  return <SchedulerCalendar />;
}
```

### Sử dụng với custom events

```javascript
import SchedulerCalendar from './components/SchedulerCalendar';

function MyPage() {
  const events = [
    {
      id: '1',
      title: 'Họp team',
      start: '2026-12-15',
      color: '#e3f2fd',
      textColor: '#1976d2'
    },
    {
      id: '2',
      title: 'Review dự án',
      start: '2026-12-16T10:00:00',
      end: '2026-12-16T11:00:00',
      color: '#ffebee',
      textColor: '#d32f2f'
    }
  ];

  const handleEventClick = (event) => {
    console.log('Event clicked:', event);
  };

  const handleDateClick = (arg) => {
    console.log('Date clicked:', arg.dateStr);
  };

  const handleEventDrop = (dropInfo) => {
    console.log('Event moved:', dropInfo);
  };

  return (
    <SchedulerCalendar
      events={events}
      onEventClick={handleEventClick}
      onDateClick={handleDateClick}
      onEventDrop={handleEventDrop}
      editable={true}
    />
  );
}
```

## 🎨 Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `events` | Array | `[]` | Danh sách sự kiện (nếu rỗng sẽ dùng dữ liệu mẫu) |
| `onEventClick` | Function | - | Callback khi click vào sự kiện |
| `onDateClick` | Function | - | Callback khi click vào ngày |
| `onEventDrop` | Function | - | Callback khi kéo thả sự kiện |
| `editable` | Boolean | `true` | Cho phép kéo thả và chỉnh sửa |

## 📁 Cấu trúc Event Object

```javascript
{
  id: 'unique-id',           // ID duy nhất
  title: 'Tiêu đề sự kiện',  // Tiêu đề hiển thị
  start: '2026-12-15',       // Ngày bắt đầu (ISO format)
  end: '2026-12-15',         // Ngày kết thúc (optional)
  color: '#e3f2fd',          // Màu nền
  textColor: '#1976d2'       // Màu chữ
}
```

## 🎨 Tùy chỉnh màu sắc

Các màu được khuyến nghị:

```javascript
// Màu xanh (mặc định)
{ color: '#e3f2fd', textColor: '#1976d2' }

// Màu đỏ
{ color: '#ffebee', textColor: '#d32f2f' }

// Màu xám
{ color: '#f5f5f5', textColor: '#757575' }

// Màu xanh lá
{ color: '#e8f5e9', textColor: '#388e3c' }

// Màu cam
{ color: '#fff3e0', textColor: '#f57c00' }
```

## 📂 Files

- `src/components/SchedulerCalendar/index.js` - Component chính
- `src/components/SchedulerCalendar/styles.css` - Custom styles
- `src/pages/DemoScheduler/index.js` - Trang demo

## 🚀 Demo

Để xem demo, import và sử dụng `DemoSchedulerPage`:

```javascript
import DemoSchedulerPage from './pages/DemoScheduler';

// Thêm vào routes
<Route path="/demo-scheduler" element={<DemoSchedulerPage />} />
```

## 📝 Lưu ý

- Component sử dụng dữ liệu mẫu nếu không truyền `events` prop
- Ngày bắt đầu tuần là Thứ Hai (firstDay: 1)
- Hiển thị tối đa 3 sự kiện mỗi ngày, phần còn lại hiển thị "+X khác"
- Tất cả text đã được dịch sang tiếng Việt
