
export const listTableSelectOptions = [
  {
    label: "Thống kê văn bản đi theo thời gian",
    value: "outGoingDocumentStatsByTime",
    api: '/api/outgoing-documents/list/report-outgoing-by-time',
    viewConfigCode: 'tkvbdtheothoigian'
  },
  {
    label: "Thống kê tiến độ trình ký văn bản đi",
    value: "outGoingDocumentProcessingStats",
    api: '/api/outgoing-documents/list/statistic-process-sign',
    viewConfigCode: 'tktiendotrinhky'
  },
  {
    label: "Thống kê văn bản đi theo người ký",
    value: "outGoingDocumentsBySigner",
    api: '/api/outgoing-documents/list/statistics-by-signer',
    viewConfigCode: 'tkvbdtheonguoiky'
  },
  {
    label: "Theo dõi trạng thái liên thông văn bản",
    value: "trackDocumentInteroperabilityStatus",
    api: '/api/outgoing-documents/list/interoperability-status',
    viewConfigCode: 'tdttlienthong'
  }
]
