import { createSlice } from '@reduxjs/toolkit';
import { tableComponents } from '@builder-table/components/tableComponentRegistry';

const hiddenDialogKeysList = [
    tableComponents.MEETING_CALENDAR?.dialogKey,
    tableComponents.LEADERSHIP_DUTY_SCHEDULE_HAS_SUBMENU?.dialogKey,
    tableComponents.LEADERSHIP_SCHEDULE?.dialogKey
];

const initialState = {
  hiddenDialogKeys: hiddenDialogKeysList.filter(Boolean),
};

const tableConfigSlice = createSlice({
  name: 'tableConfig',
  initialState,
  reducers: {
    setHiddenDialogKeys: (state, action) => {
      state.hiddenDialogKeys = action.payload;
    },
    addHiddenDialogKey: (state, action) => {
      if (!state.hiddenDialogKeys.includes(action.payload)) {
        state.hiddenDialogKeys.push(action.payload);
      }
    },
    removeHiddenDialogKey: (state, action) => {
      state.hiddenDialogKeys = state.hiddenDialogKeys.filter(key => key !== action.payload);
    },
  },
});

export const { setHiddenDialogKeys, addHiddenDialogKey, removeHiddenDialogKey } = tableConfigSlice.actions;

export default tableConfigSlice.reducer;
