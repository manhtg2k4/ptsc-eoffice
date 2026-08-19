

import TableLayout from "@builder-form/Layouts/TableLayout";

import InputText from "@builder-form/components/InputText";

import DemoTablePage from "@builder-form/components/DemoTablePage";
import ActionSection from "@builder-form/components/ActionSection";

import Subtab from "@builder-form/components/Subtab";
import SearchSection from "@builder-form/components/SearchSection";
import PaginationSection from "@builder-form/components/PaginationSection";



import ColumnLayout from "@builder-form/Layouts/ColumnLayout";
import RowLayout from "@builder-form/Layouts/RowLayout";


export default {
  action: { displayName: "Hành động", isLayout: false, component: ActionSection, },
    pagination: { displayName: "Phân trang", isLayout: false, component: PaginationSection, },
  
	subtab: { displayName: "Tab", isLayout: false, component: Subtab },
	search: { displayName: "Tìm kiếm", isLayout: false, component: SearchSection },
  input: { displayName: "Trường nhập liệu", isLayout: false, component: InputText},
  table: { displayName: "Bảng", isLayout: false, component: DemoTablePage },
  row: { displayName: "Bố cục sổ", isLayout: true, component: RowLayout },
  column: { displayName: "Bố cục cột", isLayout: true, component: ColumnLayout },
  flex: { displayName: "Bố cục bảng", isLayout: true, component: TableLayout },
};

