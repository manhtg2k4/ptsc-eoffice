const statusColors = {
  1: {
    light: "#e0e0e0",
    dark: "#424242",
    text: null, // Sẽ dùng theme.palette.text.primary
  },
  6: {
    light: "#fff9c4", // Chờ điều chỉnh
    dark: "#f9a825",
    text: "#FFA600", // Text tối cho cả 2 mode vì background sáng
  },
  2: {
    light: "#DBEAFE", // Đang thực hiện
    dark: "#1976d2",
    text: "#0062AD",
  },
  3: {
    light: "#FEF9C2", // Chờ phê duyệt
    dark: "#fbc02d",
    text: "#FFA600",
  },
  4: {
    light: "#D0FFDE", // Hoàn thành
    dark: "#4caf50",
    text: "#007222",
  },
  5: {
    light: "#FFDCD9", // Hủy
    dark: "#f44336",
    text: "#F44336",
  },

  // 7: {
  //   light: "#ffcdd2", // Từ chối điều chỉnh
  //   dark: "#FF6B6B",
  //   text: "#000000", // Text tối cho cả 2 mode vì background sáng
  // },
};
export const statusOrder = [1, 6, 2, 3, 4, 5];
export const statusMapColumns = {
  1: {
    title: "Công việc mới",
    colors: statusColors[1],
    items: [],
  },
 6: {
    title: "Điều chỉnh",
    colors: statusColors[6],
    items: [],
  },
  2: {
    title: "Đang thực hiện",
    colors: statusColors[2],
    items: [],
  },
  3: {
    title: "Chờ phê duyệt",
    colors: statusColors[3],
    items: [],
  },
  4: {
    title: "Hoàn thành",
    colors: statusColors[4],
    items: [],
  },
 5: {
    title: "Hủy",
    colors: statusColors[5],
    items: [],
  },
  // 7: {
  //   title: "Từ chối điều chỉnh",
  //   colors: statusColors[7],
  //   items: [],
  // },
};
