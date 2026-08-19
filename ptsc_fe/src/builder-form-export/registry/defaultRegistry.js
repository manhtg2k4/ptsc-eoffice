
// import FlexLayout from "../Layouts/FlexLayout";
import InputText from "@builder-form-export/components/InputText";
// import ColumnLayout from "../Layouts/ColumnLayout";
// import RowLayout from "../Layouts/RowLayout";


import FlexLayout from "@layout/FlexLayout";
// import InputText from "@component/InputText";
import ColumnLayout from "@layout/ColumnLayout";
import RowLayout from "@layout/RowLayout";
export default {
  input: { displayName: "Trường nhập liệu", isLayout: false, component: InputText},
  // table: { displayName: "Bảng test", isLayout: false, component: DemoTablePage },
  row: { displayName: "Bố cục sổ", isLayout: true, component: RowLayout },
  column: { displayName: "Bố cục cột", isLayout: true, component: ColumnLayout },
  flex: { displayName: "Bố cục flex", isLayout: true, component: FlexLayout },
};
