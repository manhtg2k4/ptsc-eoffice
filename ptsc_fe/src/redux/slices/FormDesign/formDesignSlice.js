import { createSlice } from "@reduxjs/toolkit";

const formDesignSlice = createSlice({
	name: "formDesign",
	initialState: {
		code: '',
		fields: [],
		dataField: [],
		dataFieldTable: [],
		dataFieldTableInForm: [],
		dataFieldExport: [],
		dataFieldPopup: [],
		dataFormInTableInForm: [],
		formConfig: [],
		formTableInFormConfig: [],
		formConfigExport: [],
		dataFieldConfig: [],
		tableConfig: [],
		subtabCounts: {},
		value: { name: '' },
		multiDynamicForm: [],
		keyFormOnTable: {},
		currentTab: 0,
		idTableInForm: '',
		pagination: {
			total: 0,
			page: 1,
			rowsPerPage: 25,
			totalPages: 1,
		},
		fieldValues: {},
		arrFieldRef: [],
		recordDataTable: {},
		userFlow: [],
		codeMoreForm: '',
		valueField: [],
		isFormHasSignture: false
	},
	reducers: {
		setValue: (state, action) => {
			state.value = action.payload;
		},
		addFormConfig: (state, action) => {
			state.formConfig = action.payload;
		},

		addFormTableInFormConfig: (state, action) => {
			state.formTableInFormConfig = action.payload;
		},
		addFormConfigExport: (state, action) => {
			state.formConfigExport = action.payload;
		},
		addTableConfig: (state, action) => {
			state.tableConfig = action.payload;
		},
		addDataField: (state, action) => {
			state.dataField = action.payload;
		},
		addDataFieldTable: (state, action) => {
			state.dataFieldTable = action.payload;
		},
		addDataFieldTableInForm: (state, action) => {
			state.dataFieldTableInForm = action.payload;
		},
		addDataFormInTableInForm: (state, action) => {
			state.dataFormInTableInForm = action.payload;
		},
		setKeyFormOnTable: (state, action) => {
			state.keyFormOnTable = action.payload;
		},
		addDataFieldExport: (state, action) => {
			state.dataFieldExport = action.payload;
		},
		addDataFieldPopup: (state, action) => {
			state.dataFieldPopup = action.payload;
		},
		addDataFieldConfig: (state, action) => {
			state.dataFieldConfig = action.payload;
		},
		setCodeGlobal: (state, action) => {
			state.code = action.payload;
		},

		setMultiDynamicForm: (state, action) => {
			state.multiDynamicForm = action.payload;
		},
		setCurrentTab: (state, action) => {
			state.currentTab = action.payload;
		},
		setIdTableInForm: (state, action) => {
			state.idTableInForm = action.payload;
		},

		setSubtabCounts: (state, action) => {
			state.subtabCounts = action.payload;
		},
		setPagination: (state, action) => {
			state.pagination = action.payload;
		},
		setFieldValue: (state, action) => {
			state.fieldValues = { ...state.fieldValues, ...action.payload };
		},
		setArrFieldRef: (state, action) => {
			state.arrFieldRef = action.payload;
		},

		addRecordDataTable: (state, action) => {
			state.recordDataTable = action.payload;
		},
		addUserFlow: (state, action) => {
			state.userFlow = action.payload;
		},
		addCodeMoreForm: (state, action) => {
			state.codeMoreForm = action.payload;
		},
		addField: (state, action) => {
			const exists = state?.fields.find(f => f?.name === action.payload.name);
			if (!exists) {
				const fieldWithId = {
					...action.payload,
					id: action.payload.id || crypto.randomUUID()
				};
				state.fields.push(fieldWithId);
			}
		},
		addFields: (state, action) => {
			state.fields = action.payload;
		},
		updateField: (state, action) => {

			const index = state.fields.findIndex(f => f.id === action.payload.id);
			if (index !== -1) {
				state.fields[index] = { ...state.fields[index], ...action.payload };
			}
		},
		deleteField: (state, action) => {
			const index = state.fields.findIndex(f => f.id === action.payload);
			if (index !== -1) {
				state.fields.splice(index, 1);
			}
		},
		addValueField: (state, action) => {
			state.valueField = action.payload;
		},
		setIsFormHasSignture: (state, action) => {
			state.isFormHasSignture = action.payload;
		},
	},
});

export const {
	addDataFieldConfig,
	setValue,
	setCodeGlobal,
	addFormConfig,
	addFormConfigExport,
	addTableConfig,
	updateFormConfig,
	deleteFormConfig,
	setFormConfigs,
	resetFormConfigs,
	addDataField,
	setKeyFormOnTable,
	addDataFieldTable,
	addDataFieldTableInForm,
	addDataFieldExport,
	addDataFieldPopup,
	addDataFormInTableInForm,
	setMultiDynamicForm,
	setCurrentTab,
	setIdTableInForm,
	setPagination,
	addFormTableInFormConfig,
	setFieldValue,
	setArrFieldRef,
	addRecordDataTable,
	addUserFlow,
	setSubtabCounts,
	addCodeMoreForm,
	addField,
	addFields,
	updateField,
	deleteField,
	addValueField,
	setIsFormHasSignture
} = formDesignSlice.actions;

export default formDesignSlice.reducer;
