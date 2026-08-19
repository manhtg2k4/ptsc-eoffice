import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Box,
  CircularProgress,
  ListItem,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  SearchBarContainer,
  PanelHeader,
  PanelHeaderTitle,
  PanelContent,
  // PanelHeaderActionText,
  CenteredBox,
  StatusText,
  SaveButton,
  CloseButton,
} from "@pages/TextAway/Tab/SigningSubmissionTab/componentStyle/ReceivingUnitDialog.style";
import { DialogContainer, LeftPanel } from "@pages/TextAway/Tab/SigningSubmissionTab/componentStyle/style";
import { StyledCheckbox } from "@styles/CustomTable.styles";
import { useDispatch, useSelector } from "react-redux";
import { fetchDhvbConfig } from "@redux/slices/configSlice";
import CustomInput from "@components/CustomInput/CustomInput";
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";

const removeDiacritics = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const PanelHeaderActions = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  // paddingRight: "7.6px",
}));
const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    maxWidth: theme.breakpoints.values.md,
    width: "100%",
  },
}));

const StyledListItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'isSelected',
})(({ theme, isSelected }) => ({
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  backgroundColor: isSelected ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StyledListItemText = styled(ListItemText, {
  shouldForwardProp: (prop) => prop !== 'isSelected',
})(({ isSelected }) => ({
  flexGrow: 1,
  cursor: "pointer",
  fontWeight: isSelected ? "bold" : "normal",
}));


// Component ProcessItem hiển thị từng quy trình
const ProcessItem = ({ process, selectedProcessValue, onToggle }) => {
  const isSelected = selectedProcessValue === process.value;

  const handleItemClick = (e) => {
    e.stopPropagation();
    onToggle(process);
  };

  return (
    <StyledListItem
      button
      onClick={handleItemClick}
      isSelected={isSelected}
    > 
      <StyledListItemText 
        primary={process.title} 
        isSelected={isSelected}
      />
      <StyledCheckbox checked={isSelected} onChange={handleItemClick} />
    </StyledListItem>
  );
};

ProcessItem.propTypes = {
  process: PropTypes.object.isRequired,
  selectedProcessValue: PropTypes.string,
  onToggle: PropTypes.func.isRequired,
};


const ProcessSelectionDialog = ({
  open,
  onClose,
  onSave,
  initialSelectedIds = [],
}) => {
  const [selectedProcessValue, setSelectedProcessValue] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const dispatch = useDispatch();
  const { crmSource, loading: isLoading } = useSelector((state) => state.config);

  // Lấy danh sách quy trình từ crmSource
  const processList = useMemo(() => {
    const loaiVanBanSource = crmSource.find(item => item.code === "LOAIVANBAN");
    return loaiVanBanSource?.data || [];
  }, [crmSource]);

  // Fetch data khi dialog mở
  useEffect(() => {
    if (open) {
      dispatch(fetchDhvbConfig());
    } else {
      setSelectedProcessValue(null);
      setSearchTerm("");
    }
  }, [open, dispatch]);

  // Set các item đã được chọn ban đầu
  useEffect(() => {
    if (open && processList.length > 0 && initialSelectedIds.length > 0) {
      // Chỉ lấy ID đầu tiên nếu có nhiều
      setSelectedProcessValue(initialSelectedIds[0]);
    }
  }, [open, processList, initialSelectedIds]);

  const handleToggle = (process) => {
    if (selectedProcessValue === process.value) {
      // Nếu đã chọn, bỏ chọn
      setSelectedProcessValue(null);
    } else {
      // Nếu chưa chọn, chọn cái này
      setSelectedProcessValue(process.value);
    }
  };

  const handleSave = () => {
    // Trả về một mảng chứa giá trị đã chọn hoặc mảng rỗng
    onSave(selectedProcessValue ? [selectedProcessValue] : []);
    onClose();
  };

  const handleSearchTermChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Filter list based on search term
  const filteredList = useMemo(() => {
    if (!searchTerm) return processList;
    return processList.filter(p => 
      removeDiacritics(p.title).includes(removeDiacritics(searchTerm))
    );
  }, [processList, searchTerm]);

  // Update selectAll state when filtered list changes
  // Logic này không còn cần thiết với single selection
  // useEffect(() => {
  //   if (filteredList.length > 0) {
  //     const allSelected = filteredList.every(p => selectedProcesses[p.id]);
  //     setSelectAll(allSelected);
  //   }
  // }, [filteredList, selectedProcesses]);

  return (
    <StyledDialog open={open} onClose={onClose}>
      <DialogContainer>
        <DialogTitle>Chọn quy trình</DialogTitle>
        <DialogContent>
          <FormFieldLayoutContext.Provider value={{ inputLabelLayout: "stacked" }}>
            <SearchBarContainer >
              <CustomInput
                fullWidth
                variant="outlined"
                label="Tìm kiếm quy trình"
                placeholder="Tìm kiếm quy trình"
                value={searchTerm}
                onChange={handleSearchTermChange}
                size="small"
              />
            </SearchBarContainer>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <LeftPanel>
                  <PanelHeader>
                    <PanelHeaderTitle variant="subtitle2">
                      Quy trình ({filteredList.length})
                    </PanelHeaderTitle>                  
                  </PanelHeader>

                  <PanelContent>
                    {isLoading ? (
                      <CenteredBox><CircularProgress /></CenteredBox>
                    ) : filteredList.length === 0 ? (
                      <CenteredBox>
                        <StatusText>
                          {searchTerm ? "Không tìm thấy quy trình phù hợp" : "Không có dữ liệu"}
                        </StatusText>
                      </CenteredBox>
                    ) : (
                      filteredList.map((process) => (
                        <ProcessItem
                          key={process.id}
                          process={process}
                          selectedProcessValue={selectedProcessValue}
                          onToggle={handleToggle}
                        />
                      ))
                    )}
                  </PanelContent>
                </LeftPanel>
              </Grid>
            </Grid>
          </FormFieldLayoutContext.Provider>
        </DialogContent>
        <DialogActions>
          <SaveButton onClick={handleSave}>LƯU</SaveButton>
          <CloseButton onClick={onClose}>ĐÓNG</CloseButton>
        </DialogActions>
      </DialogContainer>
    </StyledDialog>
  );
};

ProcessSelectionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialSelectedIds: PropTypes.array,
};

export default ProcessSelectionDialog;
