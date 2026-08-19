
import TableLayout from "@builder-table/Layouts/TableLayout";
import Subtab from "@builder-table/components/Subtab";

import DemoTablePage from "@builder-table/components/DemoTablePage";
import SearchSection from "@builder-table/components/SearchSection";
import ActionSection from "@builder-table/components/ActionSection";
import PaginationSection from "@builder-table/components/PaginationSection";
import FunctionalProperties from "@builder-table/components/FunctionalProperties";
import MoreAction from "@builder-table/components/MoreAction";
import ColumnConfigSection from "@builder-table/components/ColumnConfigSection";


export default {
	
	pagination: { displayName: "Phân trang", isLayout: false, component: PaginationSection, },
	action: { displayName: "Hành động", isLayout: false, component: ActionSection, },
	subtab: { displayName: "Tab", isLayout: false, component: Subtab },
	functionalProperties: { displayName: "Thuộc tính chức năng", isLayout: false, component: FunctionalProperties },
	moreAction: { displayName: "Menu tab", isLayout: false, component: MoreAction },
	search: { displayName: "Tìm kiếm", isLayout: false, component: SearchSection },
	columnConfig: { displayName: "Cài đặt cột", isLayout: false, component: ColumnConfigSection },
	table: { displayName: "Bảng", isLayout: false, component: DemoTablePage },
	flex: { displayName: "Bố cục bảng", isLayout: true, component: TableLayout },
};

