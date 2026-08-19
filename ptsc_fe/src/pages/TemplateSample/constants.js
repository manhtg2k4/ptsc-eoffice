import * as yup from "yup";

export const defaultValues = {
    name: '',
    timeTotal:''
};


export const schema = yup.object().shape({
    name: yup.string().required("Vui lòng nhập tên quy trình mẫu"),
    // timeTotal: yup.number().typeError("Vui lòng nhập tổng thời gian quy trình mẫu").required("Vui lòng nhập tổng thời gian quy trình mẫu"),
});