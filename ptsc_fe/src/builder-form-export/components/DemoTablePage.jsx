import CustomTableBorder from "@components/CustomTableBorder";
import React, { useState } from "react";

const fakeUsers = [
  { id: "u1", name: "Nguyễn Văn A", email: "a@example.com", role: "Admin" },
  { id: "u2", name: "Trần Thị B", email: "b@example.com", role: "User" },
  { id: "u3", name: "Lê Văn C", email: "c@example.com", role: "Editor" },
];
const DemoTablePage = () => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [pagination, setPagination] = useState({
    total: 3,
    page: 1,
    rowsPerPage: 25,
    totalPages: 1,
  });

  const handleSelectRows = (ids) => {
    setSelectedIds(ids);
  };
  const handleDeleteRow = (id) => {
    alert(`Đã xóa user có ID: ${id}`);
  };
  const handlePageChange = ({ page, rowsPerPage }) => {
    setPagination((prev) => ({
      ...prev,
      page,
      rowsPerPage,
    }));
  };

  return (
    <CustomTableBorder
      type="user"
      data={fakeUsers}
      formatId="id"
      // color="primary"
      showIndexColumn
      showCheckboxColumn
      onSelect={handleSelectRows}
      onDeleteRow={handleDeleteRow}
      pagination={pagination}
      onPage={handlePageChange}
      defaultValues={selectedIds}
    />
  );
};

export default DemoTablePage;
