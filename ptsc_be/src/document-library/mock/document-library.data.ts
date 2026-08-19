// src/document-library/mock/document-library.data.ts
import { randomDate, randomOwner } from './mock-helpers';

export const DOCUMENT_LIBRARY_DATA = [
 { id: 'fd1', type: 'folder', name: 'Hồ sơ dự án', path: 'fd1' },
  { id: 'fd1a', type: 'folder', name: 'Archive', parentId: 'fd1', path: 'fd1/fd1a' },
  { id: 'fd1a1', type: 'folder', name: '2025', parentId: 'fd1a', path: 'fd1/fd1a/fd1a1' },
  { id: 'fd1a1a', type: 'folder', name: 'Q1', parentId: 'fd1a1', path: 'fd1/fd1a/fd1a1/fd1a1a' },
  { id: 'fd1b', type: 'folder', name: 'Khác (fd1b)', parentId: 'fd1', path: 'fd1/fd1b' },

  { id: 'fd2', type: 'folder', name: 'Biểu mẫu dùng chung', path: 'fd2' },
  { id: 'fd2a', type: 'folder', name: 'Templates', parentId: 'fd2', path: 'fd2/fd2a' },

  { id: 'fd3', type: 'folder', name: 'Ảnh sự kiện', path: 'fd3' },
  { id: 'fd3a', type: 'folder', name: 'Cropped', parentId: 'fd3', path: 'fd3/fd3a' },
  { id: 'fd3a1', type: 'folder', name: 'Social', parentId: 'fd3a', path: 'fd3/fd3a/fd3a1' },

  { id: 'fd4', type: 'folder', name: 'Videos', path: 'fd4' },
  { id: 'fd5', type: 'folder', name: 'Tài liệu nội bộ', path: 'fd5' },

  // documents in folders (with paths)
  { id: 101, type: 'file', name: 'Quy trình làm việc.docx', fileType: 'docx', parentId: 'fd1', path: 'fd1/101' },
  { id: 102, type: 'file', name: 'Báo cáo tháng 12.pdf', fileType: 'pdf', parentId: 'fd1', path: 'fd1/102' },
  { id: 103, type: 'file', name: 'Dữ liệu kinh doanh.xlsx', fileType: 'xlsx', parentId: 'fd1', path: 'fd1/103' },
  { id: 104, type: 'file', name: 'Trình bày Họp.pptx', fileType: 'pptx', parentId: 'fd1', path: 'fd1/104' },
  { id: 105, type: 'file', name: 'Mẫu phiếu.docx', fileType: 'docx', parentId: 'fd2', path: 'fd2/105' },
  { id: 106, type: 'file', name: 'Ghi chú.txt', fileType: 'txt', path: '106' },
  { id: 107, type: 'file', name: 'Danh sách khách hàng.csv', fileType: 'csv', parentId: 'fd2', path: 'fd2/107' },
  { id: 108, type: 'file', name: 'Hợp đồng - Công ty A.odt', fileType: 'odt', path: '108' },

  // images in folders
  { id: 201, type: 'file', name: 'Logo_công_ty.png', fileType: 'png', parentId: 'fd3', path: 'fd3/201' },
  { id: 202, type: 'file', name: 'Ảnh_event_01.jpg', fileType: 'jpg', parentId: 'fd3', path: 'fd3/202' },
  { id: 203, type: 'file', name: 'Ảnh_event_02.jpg', fileType: 'jpg', parentId: 'fd3', path: 'fd3/203' },
  { id: 204, type: 'file', name: 'icon-chart.svg', fileType: 'svg', parentId: 'fd3a', path: 'fd3/fd3a/204' },
  { id: 205, type: 'file', name: 'banner_social.png', fileType: 'png', parentId: 'fd3a1', path: 'fd3/fd3a/fd3a1/205' },

  // archives and installers
  { id: 301, type: 'file', name: 'Backup_2025-12-01.zip', fileType: 'zip', path: '301' },
  { id: 302, type: 'file', name: 'SourceCode_v1.2.tar.gz', fileType: 'tar.gz', path: '302' },
  { id: 303, type: 'file', name: 'installer_android.apk', fileType: 'apk', path: '303' },

  // media
  { id: 401, type: 'file', name: 'Hướng dẫn sử dụng.mp4', fileType: 'mp4', parentId: 'fd4', path: 'fd4/401' },
  { id: 402, type: 'file', name: 'Gặp gỡ khách hàng.mp3', fileType: 'mp3', path: '402' },

  // misc
  { id: 501, type: 'file', name: 'notes.md', fileType: 'md', path: '501' },
  { id: 502, type: 'file', name: 'config.json', fileType: 'json', path: '502' },
  { id: 503, type: 'file', name: 'diagram.drawio', fileType: 'drawio', path: '503' },
  { id: 504, type: 'file', name: 'README.txt', fileType: 'txt', path: '504' },

  // invoices inside archive folder and deeper year folder
  { id: 601, type: 'file', name: 'Invoice_0001.pdf', fileType: 'pdf', parentId: 'fd1a', path: 'fd1/fd1a/601' },
  { id: 602, type: 'file', name: 'Invoice_0002.pdf', fileType: 'pdf', parentId: 'fd1a', path: 'fd1/fd1a/602' },
  { id: 603, type: 'file', name: 'Invoice_0003.pdf', fileType: 'pdf', parentId: 'fd1a', path: 'fd1/fd1a/603' },
  { id: 610, type: 'file', name: 'Invoice_2025-01.pdf', fileType: 'pdf', parentId: 'fd1a1', path: 'fd1/fd1a/fd1a1/610' },
  { id: 611, type: 'file', name: 'Invoice_2025-02.pdf', fileType: 'pdf', parentId: 'fd1a1', path: 'fd1/fd1a/fd1a1/611' },

  { id: 604, type: 'file', name: 'Report-2025-Q1.xlsx', fileType: 'xlsx', path: '604' },
  { id: 605, type: 'file', name: 'Report-2025-Q2.xlsx', fileType: 'xlsx', path: '605' },
  { id: 606, type: 'file', name: 'Presentation_Final.pptx', fileType: 'pptx', path: '606' },
  { id: 607, type: 'file', name: 'long_filename_example_with_vietnamese_để_thử_ngắt_dòng và ký tự đặc biệt.docx', fileType: 'docx', path: '607' },

  // deeper nested example under fd1a1a
  { id: 'fd1a1a1', type: 'folder', name: 'January', parentId: 'fd1a1a', path: 'fd1/fd1a/fd1a1/fd1a1a/fd1a1a1' },
  { id: 701, type: 'file', name: 'Summary_Jan.pdf', fileType: 'pdf', parentId: 'fd1a1a1', path: 'fd1/fd1a/fd1a1/fd1a1a/fd1a1a1/701' },

  // a few more folders for organizing
  { id: 'fd6', type: 'folder', name: 'Lưu trữ 2024', path: 'fd6' },
  { id: 'fd7', type: 'folder', name: 'Templates', parentId: 'fd2', path: 'fd2/fd7' },
  { id: 'fd8', type: 'folder', name: 'Khác', path: 'fd8' },

    // ===== FAKE MANY FOLDERS FOR LOAD MORE TEST =====

  // root folders
  { id: 'fd10', type: 'folder', name: 'Công văn đến', path: 'fd10' },
  { id: 'fd11', type: 'folder', name: 'Công văn đi', path: 'fd11' },
  { id: 'fd12', type: 'folder', name: 'Hợp đồng', path: 'fd12' },
  { id: 'fd13', type: 'folder', name: 'Biên bản họp', path: 'fd13' },
  { id: 'fd14', type: 'folder', name: 'Quyết định', path: 'fd14' },
  { id: 'fd15', type: 'folder', name: 'Thông báo', path: 'fd15' },
  { id: 'fd16', type: 'folder', name: 'Tài liệu pháp lý', path: 'fd16' },
  { id: 'fd17', type: 'folder', name: 'Kế hoạch năm', path: 'fd17' },
  { id: 'fd18', type: 'folder', name: 'Báo cáo quý', path: 'fd18' },
  { id: 'fd19', type: 'folder', name: 'Ngân sách', path: 'fd19' },
  { id: 'fd20', type: 'folder', name: 'Nhân sự', path: 'fd20' },
  { id: 'fd21', type: 'folder', name: 'Tuyển dụng', path: 'fd21' },
  { id: 'fd22', type: 'folder', name: 'Đào tạo', path: 'fd22' },
  { id: 'fd23', type: 'folder', name: 'Lương & thưởng', path: 'fd23' },
  { id: 'fd24', type: 'folder', name: 'Đánh giá nhân sự', path: 'fd24' },
  { id: 'fd25', type: 'folder', name: 'Marketing', path: 'fd25' },
  { id: 'fd26', type: 'folder', name: 'Chiến dịch 2024', path: 'fd26' },
  { id: 'fd27', type: 'folder', name: 'Chiến dịch 2025', path: 'fd27' },
  { id: 'fd28', type: 'folder', name: 'Thiết kế', path: 'fd28' },
  { id: 'fd29', type: 'folder', name: 'Nội dung', path: 'fd29' },
  { id: 'fd30', type: 'folder', name: 'Tài chính', path: 'fd30' },
  { id: 'fd31', type: 'folder', name: 'Kế toán', path: 'fd31' },
  { id: 'fd32', type: 'folder', name: 'Hóa đơn', path: 'fd32' },
  { id: 'fd33', type: 'folder', name: 'Thuế', path: 'fd33' },
  { id: 'fd34', type: 'folder', name: 'Kiểm toán', path: 'fd34' },
  { id: 'fd35', type: 'folder', name: 'CNTT', path: 'fd35' },
  { id: 'fd36', type: 'folder', name: 'Hạ tầng', path: 'fd36' },
  { id: 'fd37', type: 'folder', name: 'Phần mềm', path: 'fd37' },
  { id: 'fd38', type: 'folder', name: 'Bảo mật', path: 'fd38' },
  { id: 'fd39', type: 'folder', name: 'Hỗ trợ kỹ thuật', path: 'fd39' },
  { id: 'fd40', type: 'folder', name: 'Khách hàng', path: 'fd40' },
  { id: 'fd41', type: 'folder', name: 'Dự án A', path: 'fd41' },
  { id: 'fd42', type: 'folder', name: 'Dự án B', path: 'fd42' },
  { id: 'fd43', type: 'folder', name: 'Dự án C', path: 'fd43' },

  // ===== SUB FOLDERS =====

  // Công văn đến
  { id: 'fd10_2024', type: 'folder', name: 'Năm 2024', parentId: 'fd10', path: 'fd10/fd10_2024' },
  { id: 'fd10_2025', type: 'folder', name: 'Năm 2025', parentId: 'fd10', path: 'fd10/fd10_2025' },
  { id: 'fd10_2025_q1', type: 'folder', name: 'Quý 1', parentId: 'fd10_2025', path: 'fd10/fd10_2025/fd10_2025_q1' },
  { id: 'fd10_2025_q2', type: 'folder', name: 'Quý 2', parentId: 'fd10_2025', path: 'fd10/fd10_2025/fd10_2025_q2' },

  // Hợp đồng
  { id: 'fd12_2024', type: 'folder', name: 'Hợp đồng 2024', parentId: 'fd12', path: 'fd12/fd12_2024' },
  { id: 'fd12_2025', type: 'folder', name: 'Hợp đồng 2025', parentId: 'fd12', path: 'fd12/fd12_2025' },

  // Nhân sự
  { id: 'fd20_hr01', type: 'folder', name: 'Hồ sơ nhân viên', parentId: 'fd20', path: 'fd20/fd20_hr01' },
  { id: 'fd20_hr02', type: 'folder', name: 'Hợp đồng lao động', parentId: 'fd20', path: 'fd20/fd20_hr02' },
  { id: 'fd20_hr03', type: 'folder', name: 'Quyết định nhân sự', parentId: 'fd20', path: 'fd20/fd20_hr03' },

  // Tài chính
  { id: 'fd30_2024', type: 'folder', name: 'Năm 2024', parentId: 'fd30', path: 'fd30/fd30_2024' },
  { id: 'fd30_2025', type: 'folder', name: 'Năm 2025', parentId: 'fd30', path: 'fd30/fd30_2025' },

  // CNTT
  { id: 'fd35_sys', type: 'folder', name: 'Hệ thống', parentId: 'fd35', path: 'fd35/fd35_sys' },
  { id: 'fd35_doc', type: 'folder', name: 'Tài liệu kỹ thuật', parentId: 'fd35', path: 'fd35/fd35_doc' },
  // tiếp tục hết toàn bộ list
].map((item, index) => ({
  ...item,
  createdAt: randomDate(index),
  owner: randomOwner(index),
}));
