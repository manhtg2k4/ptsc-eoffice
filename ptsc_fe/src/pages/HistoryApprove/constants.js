// import dayjs from "dayjs";

export const columns = [
    {
        row: 'name',
        label: 'Tên công việc',
        width: 300,
        isShow: true,
        wrapContent: true
    },
    {
        row: 'typeRequest',
        label: 'Loại yêu cầu',
        width: 200,
        isShow: true

    },
    {
        row: 'sender',
        label: 'Người gửi',
        width: 200,
        isShow: true
    },
    {
        row: 'dateSent',
        label: 'Ngày gửi',
        width: 150,
        isShow: true
    },
    {
        row: 'processedAt',
        label: 'Ngày phê duyệt',
        width: 150,
        isShow: true,
        // accessor: (row) => dayjs(row.processAt).format('DD/MM/YYYY'), 
    },
    {
        row: 'typeTask',
        label: 'Nguồn công việc',
        width: 150,
        isShow: true
    },
    {
        row: 'processStatus',     
        label: 'Trạng thái công việc',
        width: 150,
        isShow: true
    },
];


export const advancedFilterConfig = [
    // Hàng 1: Loại yêu cầu | Người gửi
    {
        key: "typeRequest",
        label: "Loại yêu cầu",
        type: "select",
        gridSize: "half",
        crmSourceCode: "LOAIYEUCAU", // Lấy từ crmSource
    },
    {
        key: "sender",
        label: "Người gửi",
        type: "select",
        gridSize: "half",
        optionsProp: "senderOptions",
    },
   
    {
        key: "typeTask",
        label: "Nguồn công việc",
        type: "select",
        gridSize: "half",
        crmSourceCode: "NGUONCONGVIEC",
    },

  
    {
        key: "processStatus",
        label: "Trạng thái công việc",
        type: "select",
        gridSize: "half",
        crmSourceCode: "TRANGTHAIPHEDUYET",
    },

     // Hàng 2: Ngày gửi | Nguồn công việc
    {
        key: "dateSent",
        label: "Ngày gửi",
        type: "dateRange",
        gridSize: "half",
        fromKey: "dateSent.startDate",
        toKey: "dateSent.endDate",
    },
    // Ngày phê duyệt
    {
        key: "endDate",
        label: "Ngày phê duyệt",
        type: "dateRange",
        gridSize: "half",
        fromKey: "endDate.startDate",
        toKey: "endDate.endDate",
    },
];

export const filter = [
  {
    name: 'Tên công việc', code: 'name',
  },
 
]