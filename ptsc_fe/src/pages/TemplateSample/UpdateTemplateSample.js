import React, { memo, useState, useCallback, useEffect } from "react";
import { styled } from "@mui/material/styles";
import BaseSwiper from "@components/Swipper/BaseSwiper";
import LoadingDialog from "@components/LoadingDialog";
import { SkyGrid } from "@styles/SkyStyles";
import CustomInput from "@components/CustomInput/CustomInputBase";
import {
    StyleFormButtonBox,
    StyleSkyGrid,
    StyleTypography,
} from "@styles/TreeView/TreeView.styles";
import { FlexGrowBox, FooterActions, SectionCard, StyledBoxContainerContent } from "@styles/BaseSwiper/BaseSwiper.style";
import CustomButton from "@components/CustomButton";
import TreeView from "@components/TreeView";
import { API_TEMPLATE_SAMPLE } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import UpdateJobDialog from "./UpdateJobDialog";
import { calculateSiblingsDuration, flattenTree, formatMinutesToText, syncAllDurations } from "./utils";

const TemplateContainer = styled(StyledBoxContainerContent)(({ theme }) => ({
    paddingTop: theme.spacing(1),
}));

const TemplateSectionCard = styled(SectionCard)(({ theme }) => ({
    backgroundColor: "#FFFFFF",
    borderRadius: "14px",
    padding: theme.spacing(2.5),
    boxShadow: "0px 2px 2px rgba(0,0,0,0.07)",
    [theme.breakpoints.down("md")]: {
        padding: theme.spacing(2),
    },
}));

const TemplateInputWrapper = styled("div")(() => ({
    "& .MuiOutlinedInput-root": {
        minHeight: 40,
        borderRadius: "10px",
        backgroundColor: "#F9FAFB",
        "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#B9C2CA",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#B9C2CA",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#2364B0",
        },
        "&.Mui-disabled": {
            backgroundColor: "#F9FAFB !important",
        },
    },
}));

const TemplateFieldBlock = styled("div")(() => ({
    display: "flex",
    flexDirection: "column",
    gap: 6,
}));

const TemplateFieldLabel = styled("div")(({ theme }) => ({
    color: theme.palette.text.primary,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: "20px",
}));

const TemplateRequiredMark = styled("span")(() => ({
    color: "#EF5350",
    marginLeft: 2,
}));

const TemplateSaveButton = styled(CustomButton)(({ theme }) => ({
    width: 173,
    height: 40,
    borderRadius: "10px",
    backgroundColor: "#2364B0",
    borderColor: "#2364B0",
    color: "#FFFFFF",
    [theme.breakpoints.down("sm")]: {
        width: "100%",
    },
}));

const TemplateAddJobButton = styled(CustomButton)(({ theme }) => ({
    width: 201,
    height: 40,
    borderRadius: "10px",
    backgroundColor: "#2364B0",
    borderColor: "#2364B0",
    color: "#FFFFFF",
    [theme.breakpoints.down("md")]: {
        width: "100%",
    },
}));

const TemplateExpandAllButton = styled(CustomButton)(({ theme }) => ({
    width: "fit-content",
    minWidth: 155,
    height: 39,
    padding: "0 18px",
    borderRadius: "9.5px",
    borderColor: "#2364B0",
    color: "#2364B0",
    backgroundColor: "#FFFFFF",
    whiteSpace: "nowrap",
    [theme.breakpoints.down("sm")]: {
        width: "100%",
    },
}));

const TemplateCollapseAllButton = styled(CustomButton)(({ theme }) => ({
    width: 173,
    height: 40,
    borderRadius: "10px",
    backgroundColor: "#2364B0",
    borderColor: "#2364B0",
    color: "#FFFFFF",
    [theme.breakpoints.down("sm")]: {
        width: "100%",
    },
}));

const TemplateActionButtonsGrid = styled(StyleSkyGrid)(({ theme }) => ({
    width: "100%",
    [theme.breakpoints.down("sm")]: {
        flexDirection: "column",
    },
}));

const TemplateTreeWrapper = styled("div")(({ theme }) => ({
    marginLeft: 28,
    [theme.breakpoints.down("md")]: {
        marginLeft: 16,
    },
    [theme.breakpoints.down("sm")]: {
        marginLeft: 0,
    },
}));

const UpdateTemplateSample = (props) => {
    const { open, onClose, setReloadData = () => { }, id } = props;
    const toast = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [treeData, setTreeData] = useState([]);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        totalExecutionTime: "",
        description: "",
        status: 1
    });

    const [errors, setErrors] = useState({});

    const [isUpdateJobOpen, setIsUpdateJobOpen] = useState(false);
    const [selectedJobNode, setSelectedJobNode] = useState(null);

    useEffect(() => {
        const totalMinutes = calculateSiblingsDuration(treeData);
        setFormData(prev => ({
            ...prev,
            totalExecutionTime: formatMinutesToText(totalMinutes)
        }));
    }, [treeData]);

    useEffect(() => {
        if (id && open) {
            const fetchDetail = async () => {
                try {
                    setIsLoading(true);
                    const response = await axiosInstance.get(`${API_TEMPLATE_SAMPLE}/${id}`);
                    const result = response?.data?.data || response?.data || response;

                    setFormData({
                        name: result.name || "",
                        code: result.code || "",
                        totalExecutionTime: result.totalExecutionTime || "",
                        description: result.description || "",
                        status: result.status || 1
                    });
                    const mapTasks = (nodes) => (nodes || []).map(node => ({
                        ...node,
                        title: node.name || node.title || "",
                        name: node.name || node.title || "",
                        children: node.children ? mapTasks(node.children) : []
                    }));
                    setTreeData(mapTasks(result.tasks));
                } catch (error) {
                    toast("Không thể tải thông tin quy trình!", "error");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDetail();
        }
    }, [id, open, toast]);

    const handleChangeName = useCallback((e) => {
        const value = e?.target?.value;
        setFormData(prev => ({
            ...prev,
            name: value
        }));
    }, []);

    const handleChangeTotalExecutionTime = useCallback((e) => {
        const value = e?.target?.value;
        setFormData(prev => ({
            ...prev,
            totalExecutionTime: value
        }));
    }, []);

    const handleAddJob = useCallback(() => {
        setTreeData((prev) => [
            ...prev,
            {
                id: `new_${new Date().getTime()}`,
                title: "Công việc mới",
                name: "Công việc mới",
                children: [],
                expanded: true,
            },
        ]);
    }, []);

    const handleOpenUpdateJob = useCallback((node) => {
        setSelectedJobNode(node);
        setIsUpdateJobOpen(true);
    }, []);

    const handleCloseUpdateJob = useCallback(() => {
        setIsUpdateJobOpen(false);
        setSelectedJobNode(null);
    }, []);

    const handleSaveJobNode = useCallback((updatedNode) => {
        const updateNodeInTree = (nodes) => {
            return nodes.map(node => {
                const nodeId = node._id || node.id;
                const updatedId = updatedNode._id || updatedNode.id;

                if (nodeId && updatedId && nodeId === updatedId) {
                    return { ...node, ...updatedNode, children: node.children || [] };
                }

                if (node.children && node.children.length > 0) {
                    return { ...node, children: updateNodeInTree(node.children) };
                }

                return node;
            });
        };

        setTreeData(prev => {
            const updatedTree = updateNodeInTree(prev);
            return syncAllDurations(updatedTree);
        });
        handleCloseUpdateJob();
    }, [handleCloseUpdateJob]);

    const expandAllNodes = (nodes = []) => {
        return nodes.map(node => ({
            ...node,
            expanded: true,
            children: node.children ? expandAllNodes(node.children) : []
        }));
    };

    const handleExpandAll = () => {
        setTreeData(prev => expandAllNodes(prev));
    };

    const collapseAllNodes = (nodes = []) => {
        return nodes.map(node => ({
            ...node,
            expanded: false,
            children: node.children ? collapseAllNodes(node.children) : []
        }));
    };

    const handleCollapseAll = () => {
        setTreeData(prev => collapseAllNodes(prev));
    };

    const handleSaveUpdate = async () => {
        const newErrors = {};
        if (!formData.name) {
            newErrors.name = "Vui lòng nhập Tên quy trình!";
        }

        if (!treeData || treeData.length === 0) {
            toast("Quy trình phải có ít nhất một công việc!", "warning");
            return;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast("Vui lòng nhập đầy đủ thông tin bắt buộc!", "warning");
            return;
        }

        setErrors({});

        try {
            setIsLoading(true);
            const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

            const cleanTasks = (nodes, indexOffset = 0) => (nodes || []).map((node, index) => {
                const realId = node.id || node._id;
                const isNew = !realId || realId.toString().startsWith('new_');

                const cleanedNode = {
                    name: node.name || node.title || "",
                    description: node.description || node.note || "",
                    executionTime: node.executionTime ? String(node.executionTime) : "",
                    unit: (node.unit || "ngay").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D"),
                    priority: node.priority || "",
                    isApprovalRequired: !!node.isApprovalRequired,
                    deadlineReminder: node.deadlineReminder ? String(node.deadlineReminder) : "",
                    displayOrder: index + indexOffset,
                    note: node.note || node.description || "",
                    dependency: node.dependency || "",
                    reminderTime: node.reminderTime || "",
                    files: Array.isArray(node.files) ? node.files : [],
                    children: node.children ? cleanTasks(node.children) : []
                };

                if (!isNew && isUuid(realId)) {
                    cleanedNode.id = realId;
                }

                return cleanedNode;
            });

            const payload = {
                ...formData,
                tasks: cleanTasks(treeData),
            };

            await axiosInstance.patch(`${API_TEMPLATE_SAMPLE}/${id}`, payload);
            toast("Cập nhật thành công!", "success");

            onClose();
            setReloadData((prev) => prev + 1);
        } catch (error) {
            setIsLoading(false);
            toast(error?.response?.data?.message || "Cập nhật thất bại!", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseSwiper
            title="Cập nhật quy trình mẫu"
            open={open}
            onClose={onClose}
            type="edit"
            hideBackdrop
            setReloadData={setReloadData}
            footerVariant="templateSample"
            footer={
                <>
                    <FlexGrowBox />
                    <FooterActions>
                        <TemplateSaveButton
                            variant="primary"
                            disabled={isLoading}
                            onClick={handleSaveUpdate}
                        >
                            Lưu
                        </TemplateSaveButton>
                    </FooterActions>
                </>
            }
        >
            <TemplateContainer>
                <TemplateSectionCard>
                    <StyleTypography variant="h6">
                        THÔNG TIN QUY TRÌNH MẪU
                    </StyleTypography>

                                        <SkyGrid container spacing={2}>
                        <SkyGrid item xs={12} md={6}>
                            <TemplateFieldBlock>
                                <TemplateFieldLabel>
                                    Tên quy trình mẫu
                                    <TemplateRequiredMark>*</TemplateRequiredMark>
                                </TemplateFieldLabel>
                                <TemplateInputWrapper>
                                    <CustomInput
                                        placeholder="Nhập tên quy trình"
                                        fullWidth
                                        value={formData.name}
                                        onChange={handleChangeName}
                                        error={!!errors.name}
                                        helperText={errors.name}
                                    />
                                </TemplateInputWrapper>
                            </TemplateFieldBlock>
                        </SkyGrid>

                        <SkyGrid item xs={12} md={6}>
                            <TemplateFieldBlock>
                                <TemplateFieldLabel>
                                    Tổng thời gian thực hiện quy trình
                                </TemplateFieldLabel>
                                <TemplateInputWrapper>
                                    <CustomInput
                                        fullWidth
                                        value={formData.totalExecutionTime}
                                        onChange={handleChangeTotalExecutionTime}
                                        disabled
                                    />
                                </TemplateInputWrapper>
                            </TemplateFieldBlock>
                        </SkyGrid>
                    </SkyGrid>

                    <StyleFormButtonBox container spacing={2} mt={2}>
                        <SkyGrid item xs={12} md={6}>
                            <TemplateAddJobButton
                                variant="primary"
                                onClick={handleAddJob}
                            >
                                THÊM MỚI CÔNG VIỆC
                            </TemplateAddJobButton>
                        </SkyGrid>

                        <TemplateActionButtonsGrid item xs={12} md={6}>
                            <TemplateExpandAllButton
                                variant="outlined"
                                onClick={handleExpandAll}
                            >
                                MỞ RỘNG TẤT CẢ
                            </TemplateExpandAllButton>
                            <TemplateCollapseAllButton
                                variant="primary"
                                onClick={handleCollapseAll}
                            >
                                THU GỌN TẤT CẢ
                            </TemplateCollapseAllButton>
                        </TemplateActionButtonsGrid>
                    </StyleFormButtonBox>

                    <TemplateTreeWrapper>
                        <TreeView
                            treeData={treeData}
                            setTreeData={setTreeData}
                            onEdit={handleOpenUpdateJob}
                        />
                    </TemplateTreeWrapper>
                </TemplateSectionCard>
            </TemplateContainer>

            <LoadingDialog open={isLoading}>
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>

            <UpdateJobDialog
                open={isUpdateJobOpen}
                onClose={handleCloseUpdateJob}
                data={selectedJobNode}
                onSave={handleSaveJobNode}
                allTasks={flattenTree(treeData)}
            />
        </BaseSwiper>
    );
};

export default memo(UpdateTemplateSample);
