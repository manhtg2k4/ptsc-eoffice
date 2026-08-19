// import InputPhone from '../layoutComponent/InputPhone.jsx';
// import CustomTable from '../layoutComponent/CustomTable.jsx';
// import RowLayout from '../layoutComponent/RowLayout.jsx';
// import ColumnLayout from '../layoutComponent/ColumnLayout.jsx';
// import Grid3Layout from '../layoutComponent/Grid3Layout.jsx';


import InputPhone from '@component/InputPhone.jsx';
import CustomTable from '@components/CustomTable/CustomTable';
import ColumnLayout from '@layout/ColumnLayout';
import Grid3Layout from '@layout/Grid3Layout';
import RowLayout from '@layout/RowLayout';
export const registry = {
  phone: { component: InputPhone, displayName: 'Input Phone' },
  table: { component: CustomTable, displayName: 'Custom Table' },
  row: { component: RowLayout, displayName: 'Row Layout' },
  column: { component: ColumnLayout, displayName: 'Column Layout' },
  grid3: { component: Grid3Layout, displayName: 'Grid 3x3' }
};
