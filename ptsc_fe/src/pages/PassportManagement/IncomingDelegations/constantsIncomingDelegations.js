import * as Yup from "yup";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export const defaultValueIncomingDelegations = {
    nameDelegation: "", // Người mượn/Đoàn ra
    delegationLeader: "", // Trưởng đoàn
    position: "",
    numberOfMembers: "", // Số lượng thành viên
    receivedGifts: "", // Quà tặng của đối tác
    incomingDate: "", // Ngày đến
    outgoingDate: "", // Ngày về
    partnerGifts: "", // Quà tặng phía TCT
    meetingContent: "", // Nội dung buổi tiếp đón
    note: "", // Ghi chú
    listOfReceptionMembers: [], // Danh sách thành viên tiếp đón
    nationality: "", // Quốc tịch
    originType: "" // Nguồn gốc đoàn vào
};

export const incomingDelegationsSchema = Yup.object({
    nameDelegation: Yup.string()
        .transform((value) => (value ? value.trim() : ""))
        .required("Tên đoàn không được để trống")
        .max(200, "Tên đoàn tối đa 200 ký tự"),

    originType: Yup.mixed()
        .nullable()
        .required("Đến từ không được để trống")
        .test("is-object-or-id", "Đến từ không được để trống", (value) => {
            if (value === null || value === undefined || value === "") return false;
            if (typeof value === "object") return !!value?.id || !!value?.value;
            return typeof value === "number" || typeof value === "string";
        }),

    // delegationLeader: Yup.string()
    // 	.transform((value) => (value ? value.trim() : ""))
    // 	.required("Trưởng đoàn không được để trống")
    // 	.max(200, "Trưởng đoàn tối đa 200 ký tự"),

    delegationLeader: Yup.mixed()
        .nullable()
        .required("Trưởng đoàn không được để trống")
        .test("is-object-or-id", "Trưởng đoàn không được để trống", (value) => {
            if (value === null || value === undefined || value === "") return false;
            if (typeof value === "object") return !!value?.id || !!value?.value;
            return typeof value === "number" || typeof value === "string";
        }),
    // numberOfMembers: Yup.number()
    // 	.typeError("Số lượng thành viên phải là số nguyên")
    // 	.integer("Số lượng thành viên phải là số nguyên")
    // 	.min(1, "Số lượng thành viên phải lớn hơn 0")
    // 	.required("Số lượng thành viên không được để trống"),

    incomingDate: Yup.string()
        .required("Ngày đến không được để trống")
        .test("is-valid-date", "Ngày đến không hợp lệ!", (value) =>
            dayjs(value).isValid()
        ),
    // .test(
    //   "incoming-not-past",
    //   "Ngày đến không được nhỏ hơn ngày hiện tại!",
    //   (value) => {
    //     if (!value || !dayjs(value).isValid()) return true;
    //     return dayjs(value).isSameOrAfter(dayjs(), "day");
    //   }
    // ),

    outgoingDate: Yup.string()
        .required("Ngày về không được để trống")
        .test("is-valid-date", "Ngày về không hợp lệ!", (value) =>
            dayjs(value).isValid()
        )
        // .test(
        // 	"outgoing-not-past",
        // 	"Ngày về không được nhỏ hơn ngày hiện tại!",
        // 	(value) => {
        // 		if (!value || !dayjs(value).isValid()) return true;
        // 		return dayjs(value).isSameOrAfter(dayjs(), "day");
        // 	}
        // )
        .test(
            "outgoing-after-incoming",
            "Ngày về phải lớn hơn hoặc bằng ngày đến!",
            function (value) {
                const { incomingDate } = this.parent;
                if (!value || !incomingDate || !dayjs(value).isValid()) return true;
                if (!dayjs(incomingDate).isValid()) return true;
                return dayjs(value).isSameOrAfter(dayjs(incomingDate), "day");
            }
        ),
});