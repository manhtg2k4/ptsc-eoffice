// Example tree data structure for TreeView component
export const EXAMPLE_TREE_DATA = [
  {
    id: '1',
    title: 'Quy trình mẫu 1',
    children: [
      {
        id: '1-1',
        title: 'Công việc 1.1',
        children: [
          {
            id: '1-1-1',
            title: 'Công việc 1.1.1'
          },
          {
            id: '1-1-2',
            title: 'Công việc 1.1.2'
          }
        ]
      },
      {
        id: '1-2',
        title: 'Công việc 1.2'
      }
    ]
  },
  {
    id: '2',
    title: 'Quy trình mẫu 2',
    children: [
      {
        id: '2-1',
        title: 'Công việc 2.1'
      }
    ]
  }
]
