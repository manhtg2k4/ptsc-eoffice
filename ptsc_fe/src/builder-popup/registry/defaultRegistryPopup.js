
import FlexLayout from "@builder-popup/Layouts/FlexLayout";
import InputText from "@builder-popup/components/InputText";
import ColumnLayout from "@builder-popup/Layouts/ColumnLayout";
import RowLayout from "@builder-popup/Layouts/RowLayout";

export default {
  input: { displayName: "Trường nhập liệu", isLayout: false, component: InputText},
  // table: { displayName: "Bảng test", isLayout: false, component: DemoTablePage },
  row: { displayName: "Bố cục sổ", isLayout: true, component: RowLayout },
  column: { displayName: "Bố cục cột", isLayout: true, component: ColumnLayout },
  flex: { displayName: "Bố cục flex", isLayout: true, component: FlexLayout },
};

