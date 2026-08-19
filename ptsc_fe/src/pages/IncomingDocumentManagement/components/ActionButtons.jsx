import React, { useCallback, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, MenuItem, Tooltip } from "@mui/material";
import CustomDrawer from "@components/DynamicForm/CustomDrawer";
import { getTableComponentByKey } from "@builder-table/components/tableComponentRegistry";
import { getComponentByKey } from "@builder-table/components/componentRegistry";
import { setGlobalTableState } from "@utils/GlobalTableState";
import { SpecificComponentWrapper } from "@builder-table/components/DemoTablePage.styles";
import MenuIcon from "@mui/icons-material/Menu";
// Import icons
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
// import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
// import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
// import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
// import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import DraftsIcon from "@mui/icons-material/Drafts";
// import ReplyIcon from "@mui/icons-material/Reply";
import PostAddRoundedIcon from "@mui/icons-material/PostAddRounded";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";

import { useSelector } from "react-redux";
import ButtonOutline from "@components/CustomButtonOutline";

// Danh sách này nên được đồng bộ với `CustomTableBorder/index.js` hoặc chuyển ra một file dùng chung
const iconOptions = [
  { name: "Add", icon: <AddOutlinedIcon />, displayName: "Tạo hồ sơ công việc" },
  //   { name: "Edit", icon: <EditOutlinedIcon />, displayName: "Cập nhật" },
  //   { name: "Delete", icon: <DeleteOutlinedIcon />, displayName: "Xóa" },
  { name: "Search", icon: <SearchOutlinedIcon />, displayName: "Tìm kiếm" },
  //   { name: "Save", icon: <SaveOutlinedIcon />, displayName: "Lưu" },
  //   {
  //     name: "Download",
  //     icon: <DownloadOutlinedIcon />,
  //     displayName: "Tải xuống",
  //   },
  //   { name: "Settings", icon: <SettingsOutlinedIcon />, displayName: "Cài đặt" },
  //   {
  //     name: "Visibility",
  //     icon: <VisibilityOutlinedIcon />,
  //     displayName: "Xem chi tiết",
  //   },
  //   { name: "Reason", icon: <RateReviewOutlinedIcon />, displayName: "Thu hồi" },
  { name: "Draft", icon: <DraftsIcon />, displayName: "Tạo dự thảo" },
  //   { name: "Reply", icon: <ReplyIcon />, displayName: "Từ chối" },
  {
    name: "RelatedWorkProfile",
    icon: <PostAddRoundedIcon />,
    displayName: "Hồ sơ công việc liên quan",
  },
  {
    name: "ExtendProcessingTime",
    icon: <EventRepeatRoundedIcon />,
    displayName: "Đặt hạn xử lý",
  },
  {
    name: "Submit",
    icon: <RateReviewOutlinedIcon />,
    displayName: "Trình duyệt",
  },
  {
    name: "Published",
    icon: <RateReviewOutlinedIcon />,
    displayName: "Xuất bản",
  },
];

const ActionButtons = ({ dataDetail, setReloadData, handleOpenExportDialog, groupCodes, onCloseInlinePanel }) => {

  const navigate = useNavigate();
  const formC = useSelector((state) => state.formDesign.formConfig)
  const formConfig = formC[0];

  const children = formConfig?.props?.children || [];
  const slotOf = (ch) => ch.type;
  const tableChildren = children.filter((ch) => slotOf(ch) === 'table');

  const actions = tableChildren[0]?.props?.configs || []

  // console.log(tableChildren,formConfig,'tableChildren');

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleCloseSpecific = useCallback(() => {
    setOpenSpecific(false);
  }, []);

  // State cho handleAction
  const [SpecificComponent, setSpecificComponent] = useState(null);
  const [specificComponentProps, setSpecificComponentProps] = useState({});
  const [openSpecific, setOpenSpecific] = useState(false);
  const [popupName, setPopupName] = useState(null);
  const [displayType, setDisplayType] = useState("swiper");
  const [size, setSize] = useState("md");
  const [specificTableComponent, setSpecificTableComponent] = useState(null);
  const [specificTableComponentProps, setSpecificTableComponentProps] =
    useState({});

  const handleAction = useCallback(
    async (action, rowItem) => {
      if (onCloseInlinePanel) {
        onCloseInlinePanel();
      }
      if (action.config?.componentKey) {
        let componentInfo;
        if (action.config.displayType === "table") {
          componentInfo = getTableComponentByKey(action.config.componentKey);
        } else {
          componentInfo = getComponentByKey(action.config.componentKey);
        }

        if (componentInfo) {
          if (action.config.displayType === "table") {
            setSpecificTableComponent(() => componentInfo.component);
            setGlobalTableState(
              componentInfo.defaultProps || { hideSearch: false }
            );
            setSpecificTableComponentProps({
              ...(componentInfo.defaultProps || {}),
              documentId: rowItem?.documentId || rowItem?._id || rowItem?.id,
              archiveId: rowItem?.archiveId || rowItem?._id || rowItem?.id,
              docIds: rowItem?.documentId || rowItem?._id || rowItem?.id,
              isAuthority: rowItem?.isAuthority || false,
              bpmnVersion: rowItem?.bpmn_version || false,
              ishandlermeeting: rowItem?.ishandlermeeting || false,
              isparticipant: rowItem?.isparticipant || false,
              listparammeeting: rowItem?.listparammeeting || "",
              setReloadData,
              bookDocumentId: rowItem?.bookDocumentId,
              dialogKey: componentInfo.dialogKey,
              allowSignDigital: action.config?.allowSignDigital || false,
              documentData: rowItem || {},
              title: componentInfo.title,
              dataDetail: rowItem || {},
            });
            return;
          }
          setSpecificComponent(() => componentInfo.component);
          setPopupName(action.config.popupName || componentInfo.title);
          setDisplayType(action.config.displayType || "swiper");
          setSize(action.config.size || "md");
          setOpenSpecific(true);
          setSpecificComponentProps({
            ...(componentInfo.defaultProps || {}),
            documentId: rowItem?.documentId || rowItem?._id || rowItem?.id,
            archiveId: rowItem?.archiveId || rowItem?._id || rowItem?.id,
            newsId: rowItem?.newsId || rowItem?._id || rowItem?.id,
            docIds: rowItem?.documentId || rowItem?._id || rowItem?.id,
            isAuthority: rowItem?.isAuthority || false,
            bpmnVersion: rowItem?.bpmn_version || false,
            ishandlermeeting: rowItem?.ishandlermeeting || false,
            isparticipant: rowItem?.isparticipant || false,
            listparammeeting: rowItem?.listparammeeting || "",
            setReloadData,
            bookDocumentId: rowItem?.bookDocumentId,
            dialogKey: componentInfo.dialogKey,
            allowSignDigital: action.config?.allowSignDigital || false,
            documentData: rowItem || {},
            meetingId: rowItem?.meetingId || rowItem?.id || rowItem?._id,
            title: componentInfo.title,
            dataDetail: rowItem || {},
          });
        }
        return;
      }

      if (action?.config?.url) {
        navigate(action.config.url);
      }
    },
    [navigate, setReloadData, onCloseInlinePanel]
  );

  const handleActionClick = useCallback(
    (action, row) => (e) => {
      e.stopPropagation();
      handleAction(action, row);
      handleCloseMenu();
    },
    [handleAction, handleCloseMenu]
  );

  const handleExportDialogClick = useCallback((e) => {
    e.stopPropagation();
    if (onCloseInlinePanel) {
      onCloseInlinePanel();
    }
    handleOpenExportDialog();
    handleCloseMenu();
  }, [handleOpenExportDialog, handleCloseMenu, onCloseInlinePanel]);
  const actionsFilter = actions.filter((action) => iconOptions.find((opt) => opt.name === action.config.icon))
  const shouldHideExportTemplate = Array.isArray(groupCodes) && groupCodes.includes("BANLANHDAO");

  return (
    <>
      {
        (actionsFilter.length > 0 || handleOpenExportDialog) && <Tooltip title="Xem thêm">
          <ButtonOutline
            size="small"
            onClick={handleOpenMenu}
            styleColor="#1976d2"
          >
            <MenuIcon />
          </ButtonOutline>
        </Tooltip>
      }
      <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>
        {handleOpenExportDialog && !shouldHideExportTemplate && (
          <MenuItem onClick={handleExportDialogClick}>
            {React.cloneElement(<DownloadOutlinedIcon />, { sx: { mr: 1.5 } })}
            Xuất biểu mẫu
          </MenuItem>
        )}
        {actionsFilter.map((action) => {
          const iconConfig = action.config?.icon
            ? iconOptions.find((opt) => opt.name === action.config.icon)
            : null;

          //   if (!iconConfig) return null;

          const IconComponent = iconConfig?.icon;
          const buttonText =
            action.config?.displayName || iconConfig?.displayName;

          return (
            <MenuItem
              key={action.id}
              onClick={handleActionClick(action, dataDetail)}
            >
              {IconComponent &&
                React.cloneElement(IconComponent, { sx: { mr: 1.5 } })}
              {buttonText}
            </MenuItem>
          );
        })}
      </Menu>

      {/* JSX for dynamic components */}
      {SpecificComponent && (
        // <Suspense fallback={<div>Đang tải...</div>}>
        <Suspense >

          {displayType === "swiper" ? (
            <CustomDrawer
              open={openSpecific}
              onClose={handleCloseSpecific}
              title={popupName}
              size={size}
            >
              <SpecificComponent
                {...specificComponentProps}
                onClose={handleCloseSpecific}
                open
              />
            </CustomDrawer>
          ) : (
            <SpecificComponent
              {...specificComponentProps}
              open={openSpecific}
              onClose={handleCloseSpecific}
            />
          )}
        </Suspense>
      )}

      {specificTableComponent && (
        <SpecificComponentWrapper>
          <Suspense fallback={<div>Đang tải...</div>}>
            {(() => {
              const Comp = specificTableComponent;
              return (
                <Comp
                  {...specificTableComponent}
                  {...specificTableComponentProps}
                />
              );
            })()}
          </Suspense>
        </SpecificComponentWrapper>
      )}
    </>
  );
};

export default ActionButtons;
