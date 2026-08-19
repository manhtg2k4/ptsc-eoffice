export const tasks = [
  {
    id: 1,
    name: 'Công việc cha',
    startDate: '2025-12-01',
    endDate: '2025-12-15',
    progress: 100,
    status: 'done', // done | doing | pending
    flag: 'high', // high | medium | low | null
    detail: {
      nguoiChuTri: 'Nguyễn Văn A',
      nguoiGiao: 'Tổng giám đốc',
      ngayBatDau: '1/12/2024'
    },
    children: [
      {
        id: 2,
        name: 'Công việc con 1',
        startDate: '2025-12-02',
        endDate: '2025-12-10',
        progress: 80,
        status: 'doing',
        flag: 'high',
        detail: {
          nguoiChuTri: 'Nguyễn Văn A',
          nguoiGiao: 'Tổng giám đốc',
          ngayBatDau: '2/12/2024'
        },
        children: []
      },
      {
        id: 3,
        name: 'Công việc con 2',
        startDate: '2025-12-05',
        endDate: '2025-12-20',
        progress: 60,
        status: 'doing',
        flag: 'medium',
        detail: {
          nguoiChuTri: 'Nguyễn Văn A',
          nguoiGiao: 'Tổng giám đốc',
          ngayBatDau: '5/12/2024'
        },
        children: [
          {
            id: 4,
            name: 'Công việc cháu 1',
            startDate: '2025-12-10',
            endDate: '2025-12-18',
            progress: 80,
            status: 'doing',
            flag: 'high',
            detail: {
              nguoiChuTri: 'Trần Văn B',
              nguoiGiao: 'Nguyễn Văn A',
              ngayBatDau: '10/12/2024'
            },
            children: []
          },
          {
            id: 5,
            name: 'Công việc cháu 2',
            startDate: '2025-12-12',
            endDate: '2025-12-25',
            progress: 90,
            status: 'doing',
            flag: 'low',
            detail: {
              nguoiChuTri: 'Lê Thị C',
              nguoiGiao: 'Nguyễn Văn A',
              ngayBatDau: '12/12/2024'
            },
            children: []
          }
        ]
      }
    ]
  },
  {
    id: 134,
    name: 'Công việc cha2',
    startDate: '2025-12-01',
    endDate: '2026-7-15',
    progress: 100,
    status: 'done', // done | doing | pending
    flag: 'high', // high | medium | low | null
    detail: {
      nguoiChuTri: 'Nguyễn Văn 123A',
      nguoiGiao: 'Tổng giám đốc',
      ngayBatDau: '1/12/2024'
    }
  },
  {
    id: 1213134,
    name: 'Công việc cha3',
    startDate: '2025-12-01',
    endDate: '2026-12-15',
    progress: 100,
    status: 'done', // done | doing | pending
    flag: 'high', // high | medium | low | null
    detail: {
      nguoiChuTri: 'Nguyễn Văn A22',
      nguoiGiao: 'Tổng giám đốc',
      ngayBatDau: '1/12/2024'
    }
  }
]
