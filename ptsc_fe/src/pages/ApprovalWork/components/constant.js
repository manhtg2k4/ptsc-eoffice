
export const columns = [
  { name: "Tên công việc", row: "name", accessor: (row) => row.name },
  { name: "Loại yêu cầu", row: "result", accessor: (row) => row.result },
  { name: "Người gửi", row: "sender", accessor: (row) => row.sender },
  { name: "Ngày gửi", row: "dateSent",  accessor: (row) => row.dateSent},
  { name: "Ngày phê duyệt", row: "approveAt", accessor: (row) => row.approveAt },
  { name: "Nguồn công việc", row: "typeTask", accessor: (row) => row.typeTask},
];

export const filters = [
  { name: "Tên công việc", code: "name" },
  { name: "Loại yêu cầu", code: "result" },
  { name: "Người gửi", code: "sender" },
];

// Không cần schema và giá trị mặc định vì đây là màn hình chỉ hiển thị
export const templateSchema = null;
