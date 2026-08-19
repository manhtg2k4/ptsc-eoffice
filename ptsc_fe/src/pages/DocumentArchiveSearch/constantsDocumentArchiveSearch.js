export const columnsDocumentArchiveSearch = [
  { row: "fileCode", name: "Số và ký hiệu hồ sơ", width: 150, isShow: true },
  {
    row: "title",
    name: "Tiêu đề hồ sơ",
    width: 300,
    isShow: true,
    isIcon: true,
  },
  // { row: "abstractNote", label: "Loại hồ sơ", width: 150, isShow: true },
];

export const filterDocumentArchiveSearch = [
  { name: "Số và ký hiệu hồ sơ", code: "fileCode" },
  { name: "Tiêu đề hồ sơ", code: "title" },
];

export const advancedFilterConfigDocumentArchiveSearch = [
  {
    key: "typeObj",
    label: "Loại đối tượng",
    type: "select",
    gridSize: "full",
    options: [
      { label: "Hồ sơ", value: "folder" },
      { label: "Tài liệu", value: "groupFile" },
		],
		isConfig: true,
  },
  {
    key: "createdAt",
    label: "Ngày khởi tạo hồ sơ",
    type: "dateRange",
    gridSize: "full",
    fromKey: "createdAtStart",
		toKey: "createdAtEnd",
		objectTypeKey: "folder",
  },
	{
		// key: "quantityDoc",
		label: "Số lượng tài liệu (trong khoảng)",
		type: "numberRange",
		gridSize: "full",
		fromKey: "docStart",
		toKey: "docEnd",
		objectTypeKey: "folder",
	},
  {
    key: "formationYear",
    label: "Năm",
    type: "select",
    gridSize: "full",
		crmSourceCode: "YEAR",
		objectTypeKey: "folder",
  },
  {
    key: "releaseDate",
    label: "Ngày ban hành",
    type: "dateRange",
    gridSize: "full",
    fromKey: "releaseDate.startDate",
		toKey: "releaseDate.endDate",
		objectTypeKey: "folder",
  },
  {
    key: "retentionPeriod",
    label: "Thời hạn bảo quản",
    type: "select",
    gridSize: "full",
		crmSourceCode: "S96",
		objectTypeKey: "folder",
  },
  {
    key: "recordState",
    label: "Trạng thái",
    type: "select",
    gridSize: "full",
    options: [
      { label: "Đang thu thập", value: 1 },
      { label: "Đã lưu trữ", value: 2 },
		],
		objectTypeKey: "folder",
	},
	{
		// key: "quantityDoc",
		label: "Dung lượng (mb)",
		type: "numberRange",
		gridSize: "full",
		fromKey: "fileSizeStart",
		toKey: "fileSizeEnd",
		objectTypeKey: "groupFile",
	},
];
