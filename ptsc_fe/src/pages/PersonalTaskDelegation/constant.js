import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import * as yup from "yup";

const schema = yup.object().shape({
    toUserId: yup
        .mixed()
        .required("Vui lòng chọn người được ủy quyền"),

    startDate: yup
        .date()
        .transform((value, originalValue) => {
            if (originalValue === "null" || originalValue === "") return null;
            return value;
        })
        .nullable()
        .required("Vui lòng chọn ngày bắt đầu"),

    endDate: yup
        .date()
        .transform((value, originalValue) => {
            if (originalValue === "null" || originalValue === "") return null;
            return value;
        })
        .nullable()
        .required("Vui lòng chọn ngày kết thúc")
        .when("startDate", ([startDate], schema) =>
            startDate && !isNaN(new Date(startDate))
                ? schema.min(startDate, "Ngày kết thúc không được nhỏ hơn ngày bắt đầu")
                : schema
        ),
});

export const columns = [
    {
        row: 'toUser',
        label: 'Người được uỷ quyền',

        isShow: true,
        wrapContent: true,
        width: 300

    },
    {
        row: 'startDate',
        label: 'Ngày bắt đầu',
        isShow: true,
        wrapContent: true,
        width: 250
    },
    {
        row: 'endDate',
        label: 'Hạn chót',
        isShow: true,
        wrapContent: true,
        width: 250


    },
    {
        row: 'status',
        label: 'Trạng thái',
        width: 300,
        isShow: true

    },
];

export const PERSONAL_TASK_DELEGATION_FILTER_CONFIG = [
    {
        name: 'Người được ủy quyền',
        code: 'toUserId',
        type: 'asyncAutocompleteV2',
        label:'Người được ủy quyền',
        optionValue:'name',
        gridSize: 'full',
        placeholder: 'Chọn người được ủy quyền',
        apiUrl: `${APP_BASE}/api/users/by-task-role?typeTaskUser=director`,
        multiple: true,
    },
    {
        name: 'Trạng thái',
        code: 'status',
        type: 'multiSelect',
        gridSize: 'full',
        placeholder: 'Chọn trạng thái',
        multiple: true,
        crmSourceCode: 'STATUS_PERSONAL_TASK_DELEGATION'
    }
];

export default schema;