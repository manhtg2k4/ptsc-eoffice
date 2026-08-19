
// import React, { useEffect, useState } from "react";
// import { styled,
//     Typography,
//     Box,
//     Paper,
//     Divider,
//     CircularProgress,
//     Table,
//     TableHead,
//     TableBody,
//     TableRow,
//     TableCell,
//     Select,
//     Button,
// } from "@mui/material";
// import { useDispatch, useSelector } from "react-redux";
// import { fetchTemplateCategories } from "@redux/slices/AdministrationSystem/functionManagement";
// import { styled } from "@mui/material/styles";
// import api from "api";
// import { taskFeature } from "@EnvironmentFile/constants/urlConfig";

// // Style Paper
// const StyledPaper = styled(Paper)(({ theme }) => ({
//     padding: theme.spacing(3),
//     borderRadius: "12px",
//     boxShadow: theme.shadows[2],
// }));

// const FeatureConfig = ({ getTasks, saveDiagram, idList }) => {
//     const dispatch = useDispatch();
//     const [bpmnTasks, setBpmnTasks] = useState([]);
//     const [featureList, setFeatureList] = useState([]);
//     const [mergedData, setMergedData] = useState([]);
//     const [featureOptions, setFeatureOptions] = useState([]);
//     const [loading, setLoading] = useState(true);

//     // Fetch data
//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 setLoading(true);
//                 const tasksFromBpmn = await getTasks();
//                 setBpmnTasks(tasksFromBpmn || []);

//                 const { data: apiRes } = await dispatch(
//                     fetchTemplateCategories({ processID: idList })
//                 ).unwrap();

//                 const features = apiRes || [];
//                 setFeatureList(features);
//                 setFeatureOptions(features);
//             } catch (error) {
//                 logger.error("Error fetching data:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchData();
//     }, [dispatch, getTasks, idList]);

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 const res = await api.get(`${taskFeature}/process/${idList}`);
//                 if (res.data) {
//                     // Gán tasks từ DB vào state của bạn
//                     setMergedData(res.data.tasks);
//                 }
//             } catch (error) {
//                 logger.error("Lỗi khi load task features:", error);
//             }
//         };

//         if (idList) {
//             fetchData();
//         }
//     }, [idList]);

//     // Merge data
//     useEffect(() => {
//         if (bpmnTasks.length === 0) return;

//         const merged = bpmnTasks.map((task) => {
//             // Lấy feature từ DB (code)
//             const matchedFeature = featureList.find((f) => f.code === task.feature?.code);
//             return {
//                 ...task,
//                 feature: matchedFeature || task.feature || null
//             };
//         });

//         setMergedData(merged);
//     }, [bpmnTasks, featureList]);


//     const handleFeatureChange = (taskId, featureCode) => {
//         const selectedFeature = featureOptions.find((f) => f.code === featureCode);

//         setMergedData((prev) =>
//             prev.map((item) =>
//                 item.taskId === taskId
//                     ? { ...item, feature: selectedFeature || { code: featureCode } }
//                     : item
//             )
//         );
//     };

//     // 6. Lưu cấu hình
//     const handleSave = async () => {
//         try {
//             const payload = {
//                 processId: idList,
//                 tasks: mergedData.map(item => ({
//                     taskId: item.taskId,
//                     taskName: item.taskName,
//                     feature: {
//                         code: item.feature?.code || "",
//                     },
//                 })),
//             };

//             const checkRes = await api.get(`${taskFeature}/process/${idList}`);
//             if (checkRes.data) {
//                 await api.patch(`${taskFeature}/${checkRes.data._id}`, payload);
//                 logger.log("✅ Đã cập nhật task features!");
//             } else {
//                 await api.post(taskFeature, payload);
//                 logger.log("✅ Tạo mới task features!");
//             }
//         } catch (error) {
//             logger.error("❌ Lỗi khi lưu:", error);
//         }
//     };

//     return (
//         <StyledPaper>
//             <TitleTypography variant="h5" gutterBottom>
//                 Cấu hình BPMN Tasks
//             </TitleTypography>
//             <StyledDivider />

//             {loading ? (
//                 <LoadingContainer>
//                     <CircularProgress />
//                 </LoadingContainer>
//             ) : mergedData.length === 0 ? (
//                 <EmptyDataTypography>
//                     Không có task nào.
//                 </EmptyDataTypography>
//             ) : (
//                 <Table size="small">
//                     <TableHead>
//                         <TableRow>
//                             <TaskIdCell>Task ID</TaskIdCell>
//                             <HeaderTableCell>Tên task</HeaderTableCell>
//                             <HeaderTableCell>Mô tả</HeaderTableCell>
//                             <FeatureCell>Chức năng</FeatureCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {mergedData.map((item) => (
//                             <TableRow key={item.taskId} hover>
//                                 <TableCell>
//                                     <BoldTypography>{item.taskId}</BoldTypography>
//                                 </TableCell>
//                                 <TableCell>{item.taskName || "(No name)"}</TableCell>
//                                 <TableCell>{item.description || "-"}</TableCell>
//                                 <TableCell>
//                                     <FullWidthSelect
//                                         value={item.feature?.code || ""}
//                                         onChange={(e) => handleFeatureChange(item.taskId, e.target.value)}
//                                         displayEmpty
//                                     >
//                                         <MenuItem value="">
//                                             <em>Không có feature nào</em>
//                                         </MenuItem>
//                                         {featureList.map((f) => (
//                                             <MenuItem key={f.code} value={f.code}>
//                                                 {f.name}
//                                             </MenuItem>
//                                         ))}
//                                     </FullWidthSelect>
//                                 </TableCell>
//                             </TableRow>
//                         ))}
//                     </TableBody>
//                 </Table>
//             )}

//             <FooterContainer>
//                 <SaveButton
//                     onClick={handleSave}
//                     disabled={mergedData.length === 0}
//                 >
//                     Lưu cấu hình
//                 </SaveButton>
//             </FooterContainer>
//         </StyledPaper>
//     );
// };

// export default FeatureConfig;

import React, { useEffect, useState, useCallback } from "react";
import {
    Typography,
    Box,
    Paper,
    Divider,
    CircularProgress,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Select,
    MenuItem,
    Button,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { fetchTemplateCategories } from "@redux/slices/AdministrationSystem/functionManagement";
import { styled } from "@mui/material/styles";
import { taskFeature } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    borderRadius: "12px",
    boxShadow: theme.shadows[2],
}));

const TitleTypography = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
    marginBottom: theme.spacing(2),
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
}));

const EmptyDataTypography = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
}));

const HeaderTableCell = styled(TableCell)({
    fontWeight: 'bold',
});

const TaskIdCell = styled(HeaderTableCell)({
    width: 150,
});

const FeatureCell = styled(HeaderTableCell)({
    width: 200,
});

const BoldTypography = styled(Typography)({
    fontWeight: 'bold',
});

const FullWidthSelect = styled(Select)({
    width: '100%',
});

const FooterContainer = styled(Box)(({ theme }) => ({
    marginTop: theme.spacing(3),
    display: 'flex',
    justifyContent: 'flex-end',
}));

const SaveButton = styled(Button)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
}));

// const FeatureConfig = ({ getTasks, saveAndDeployDiagram, idList }) => {
const FeatureConfig = ({ getTasks, idList }) => {
    const dispatch = useDispatch();
    const [bpmnTasks, setBpmnTasks] = useState([]);
    const [featureList, setFeatureList] = useState([]);
    const [dbTasks, setDbTasks] = useState([]);
    const [mergedData, setMergedData] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Lấy tasks từ BPMN
    useEffect(() => {
        const fetchBpmnTasks = async () => {
            try {
                const tasksFromBpmn = await getTasks();
                setBpmnTasks(tasksFromBpmn || []);
            } catch (err) {
                logger.error("Lỗi lấy BPMN tasks:", err);
            }
        };
        fetchBpmnTasks();
    }, [getTasks]);

    // 2. Lấy danh sách chức năng
    useEffect(() => {
        const fetchFeatures = async () => {
            try {
                const { data: apiRes } = await dispatch(
                    fetchTemplateCategories({ processID: idList })
                ).unwrap();
                setFeatureList(apiRes || []);
            } catch (err) {
                logger.error("Lỗi lấy danh sách chức năng:", err);
            }
        };
        fetchFeatures();
    }, [dispatch, idList]);

    // 3. Lấy dữ liệu task-feature từ DB
    useEffect(() => {
        if (!idList) return;
        const fetchDbTasks = async () => {
            try {
                const res = await api.get(`${taskFeature}/process/${idList}`);
                setDbTasks(res.data?.tasks || []);
            } catch (err) {
                logger.error("Lỗi khi load task features từ DB:", err);
            }
        };
        fetchDbTasks();
    }, [idList]);

    // 4. Merge dữ liệu (chỉ chạy khi đủ 3 nguồn)
    useEffect(() => {
        if (bpmnTasks.length === 0 || featureList.length === 0) return;

        const merged = bpmnTasks.map((task) => {
            const taskFromDb = dbTasks.find(t => t.taskId === task.taskId);
            let feature = null;

            // Ưu tiên lấy từ DB nếu có
            if (taskFromDb?.feature?.code) {
                feature = featureList.find(f => f.code === taskFromDb.feature.code) || taskFromDb.feature;
            } else if (task.feature?.code) {
                // fallback lấy từ BPMN (nếu có)
                feature = featureList.find(f => f.code === task.feature.code) || task.feature;
            }

            return {
                ...task,
                feature
            };
        });

        setMergedData(merged);
        setLoading(false);
    }, [bpmnTasks, featureList, dbTasks]);

    // 5. Xử lý thay đổi select
    // const handleFeatureChange = (taskId, featureCode) => {
    //     const selectedFeature = featureList.find(f => f.code === featureCode) || { code: featureCode };
    //     setMergedData((prev) =>
    //         prev.map((item) =>
    //             item.taskId === taskId
    //                 ? { ...item, feature: selectedFeature }
    //                 : item
    //         )
    //     );
    // };

    const handleFeatureChange = useCallback((taskId, featureCode) => {
    const selectedFeature =
        featureList.find((f) => f.code === featureCode) || { code: featureCode };

    setMergedData((prev) =>
        prev.map((item) =>
            item.taskId === taskId
                ? { ...item, feature: selectedFeature }
                : item
        )
    );
    }, [featureList]);


    // 6. Lưu cấu hình
    const handleSave = async () => {
        try {
            const payload = {
                processId: idList,
                tasks: mergedData.map(item => ({
                    taskId: item.taskId,
                    taskName: item.taskName,
                    feature: {
                        code: item.feature?.code || "",
                    },
                })),
            };

            const checkRes = await api.get(`${taskFeature}/process/${idList}`);
            if (checkRes.data) {
                await api.patch(`${taskFeature}/${checkRes.data._id}`, payload);
                logger.log("✅ Đã cập nhật task features!");
            } else {
                await api.post(taskFeature, payload);
                logger.log("✅ Tạo mới task features!");
            }
        } catch (error) {
            logger.error("❌ Lỗi khi lưu:", error);
        }
    };

    const handleSelectChange = useCallback((taskId) => (e) => {
        handleFeatureChange(taskId, e.target.value);
    }, [handleFeatureChange]);

    return (
        <StyledPaper>
            <TitleTypography variant="h5" gutterBottom>
                Cấu hình BPMN Tasks
            </TitleTypography>
            <StyledDivider />

            {loading ? (
                <LoadingContainer>
                    <CircularProgress />
                </LoadingContainer>
            ) : mergedData.length === 0 ? (
                <EmptyDataTypography>
                    Không có task nào.
                </EmptyDataTypography>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TaskIdCell>Task ID</TaskIdCell>
                            <HeaderTableCell>Tên task</HeaderTableCell>
                            <HeaderTableCell>Mô tả</HeaderTableCell>
                            <FeatureCell>Chức năng</FeatureCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {mergedData.map((item) => (
                            <TableRow key={item.taskId} hover>
                                <TableCell>
                                    <BoldTypography>{item.taskId}</BoldTypography>
                                </TableCell>
                                <TableCell>{item.taskName || "(No name)"}</TableCell>
                                <TableCell>{item.description || "-"}</TableCell>
                                <TableCell>
                                    <FullWidthSelect
                                        size="small"
                                        value={item.feature?.code || ""}
                                        // onChange={(e) => handleFeatureChange(item.taskId, e.target.value)}
                                        onChange={handleSelectChange(item.taskId)}
                                        displayEmpty
                                    >
                                        <MenuItem value="">
                                            <em>Không có feature nào</em>
                                        </MenuItem>
                                        {featureList.map((f) => (
                                            <MenuItem key={f.code} value={f.code}>
                                                {f.name}
                                            </MenuItem>
                                        ))}
                                    </FullWidthSelect>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <FooterContainer>
                <SaveButton
                    onClick={handleSave}
                    disabled={mergedData.length === 0}
                >
                    Lưu cấu hình
                </SaveButton>
            </FooterContainer>
        </StyledPaper>
    );
};

export default FeatureConfig;
