import GanttExample from "@components/CustomGantt/GanttExample";
import CustomTableBorder from "@components/CustomTableBorder";
import CustomTableBorderCalendarTree from "@components/CustomTableBorder/CustomTableBorderCalendarTree";
import CustomTableBorderTree from "@components/CustomTableBorder/CustomTableBorderTree";
import KanbanPage from "@pages/DemoKanban";
// import { KanbanDemo } from "@routers/lazyComponents";


export const DISPLAY_TYPE_OPTIONS = [
  { value: "list", label: "Danh sách", component: CustomTableBorder },
  { value: "tree", label: "Cây", component: CustomTableBorderTree},
  { value: "kanban", label: "Kanban",component: KanbanPage},
  // { value: "kanban", label: "Kanban",component: KanbanDemo},
  { value: "calander", label: "Lịch",component: CustomTableBorderCalendarTree},
  { value: "grantt", label: "Grantt", component:  GanttExample},
];