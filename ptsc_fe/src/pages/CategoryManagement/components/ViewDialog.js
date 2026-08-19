import React, { useEffect } from "react";
import { Grid } from "@mui/material";
import { Controller } from "react-hook-form";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import PropTypes from "prop-types";
import DynamicValuesTable from "./DynamicValuesTable";
import { FormContainer } from "@styles/FormDialog.styles";
// import { StyleBoxTitle } from "./DynamicValuesTable.styles";
import { ViewFieldBox, ViewFieldLabel, ViewFieldValue } from "@components/common/FormWrapper";
import {
  StyledBoxContainerContent,
  SectionHeaderContainer,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";
import { 
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
const ViewDialog = ({ open, onClose, control, reset, defaultData, idDocumentParent }) => {
  useEffect(() => {
    if (open && defaultData) {
      reset(defaultData);
    }
  }, [open, defaultData, reset]);

  return (
    <CustomSwipper
      open={open}
      onClose={onClose}
      title="Xem chi tiết danh mục"
      type="view"
    >
      <FormContainer>
      <StyledBoxContainerContent>
                    <SectionHeaderContainer>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                        <StyledIconWrapper>
                                                       <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.62 15.81V14.15C11.62 13.4897 11.3575 12.8564 10.8905 12.3895C10.482 11.981 9.9463 11.7288 9.37643 11.6721L9.13 11.66H4.15C3.48961 11.66 2.85646 11.9225 2.3895 12.3895C1.92253 12.8564 1.66 13.4897 1.66 14.15L1.66 15.81C1.66 16.2684 1.28839 16.64 0.83 16.64C0.371608 16.64 0 16.2684 0 15.81L0 14.15C0 13.0493 0.437543 11.9941 1.21582 11.2158C1.9941 10.4376 3.04935 10 4.15 10H9.13L9.33584 10.0049C10.3616 10.0558 11.3346 10.4862 12.0642 11.2158C12.8424 11.9941 13.28 13.0493 13.28 14.15V15.81C13.28 16.2684 12.9084 16.64 12.45 16.64C11.9916 16.64 11.62 16.2684 11.62 15.81Z" fill="#2364B0"/>
      <path d="M14.1352 4.15306C14.1352 3.60153 13.9523 3.06544 13.6148 2.62924C13.3194 2.24744 12.9201 1.96084 12.4671 1.80247L12.2702 1.7425L12.1891 1.71737C11.7946 1.5712 11.5674 1.14694 11.6752 0.730936C11.7831 0.315039 12.1876 0.0551911 12.6033 0.118968L12.6868 0.135992L12.8521 0.182189C13.6742 0.432011 14.3996 0.931895 14.9271 1.61362C15.4897 2.34068 15.7952 3.23375 15.7952 4.15306C15.7952 5.07237 15.4897 5.96544 14.9271 6.69254C14.3645 7.41954 13.5767 7.93945 12.6868 8.17011C12.2431 8.28515 11.7903 8.0188 11.6752 7.57517C11.5602 7.13153 11.8265 6.67868 12.2702 6.56363C12.8041 6.4252 13.2773 6.11314 13.6148 5.67689C13.9524 5.24067 14.1352 4.7046 14.1352 4.15306Z" fill="#2364B0"/>
      <path d="M16.6383 15.812V14.1529L16.6294 13.947C16.5894 13.4688 16.4121 13.0106 16.1163 12.6291C15.8205 12.2474 15.421 11.9611 14.9677 11.8031L14.7708 11.7431L14.6897 11.718C14.2951 11.5722 14.0676 11.1484 14.175 10.7324C14.2825 10.3164 14.6865 10.0555 15.1023 10.1188L15.1858 10.1366L15.3511 10.1828C16.1736 10.4319 16.9004 10.9304 17.4285 11.6118C17.9918 12.3385 18.2975 13.2318 18.2983 14.1513V15.812C18.2982 16.2704 17.9266 16.642 17.4683 16.642C17.01 16.642 16.6384 16.2704 16.6383 15.812Z" fill="#2364B0"/>
      <path d="M9.13219 4.15C9.13219 2.77481 8.01742 1.66 6.64219 1.66C5.267 1.66 4.15219 2.77481 4.15219 4.15C4.15219 5.52519 5.267 6.64 6.64219 6.64C8.01742 6.64 9.13219 5.52519 9.13219 4.15ZM10.7922 4.15C10.7922 6.44198 8.93415 8.3 6.64219 8.3C4.35021 8.3 2.49219 6.44198 2.49219 4.15C2.49219 1.85802 4.35021 0 6.64219 0C8.93415 0 10.7922 1.85802 10.7922 4.15Z" fill="#2364B0"/>
      </svg>
      
                                                          </StyledIconWrapper>
                            <StyledHeaderContent variant="h6"></StyledHeaderContent>
              <StyledHeaderContent variant="h6">
                           THÔNG TIN CHUNG
                         </StyledHeaderContent>
                              </div>
                                   </SectionHeaderContainer>
                                   <StyledDivider />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4} sm={6}>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <ViewFieldBox>
                  <ViewFieldLabel>Mã danh mục</ViewFieldLabel>
                  <ViewFieldValue>{field.value || ""}</ViewFieldValue>
                </ViewFieldBox>
              )}
            />
          </Grid>
          <Grid item xs={12} md={4} sm={6}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <ViewFieldBox>
                  <ViewFieldLabel>Tên danh mục</ViewFieldLabel>
                  <ViewFieldValue>{field.value || ""}</ViewFieldValue>
                </ViewFieldBox>
              )}
            />
          </Grid>
          <Grid item xs={12} md={4} sm={6}>
            <Controller
              name="moduleCategory"
              control={control}
              render={({ field }) => {
                const displayValue = Array.isArray(field.value)
                  ? field.value.map((v) => v?.title || v?.label || v).join(", ")
                  : field.value?.title || field.value?.label || field.value || "";
                return (
                  <ViewFieldBox>
                    <ViewFieldLabel>Module</ViewFieldLabel>
                    <ViewFieldValue>{displayValue}</ViewFieldValue>
                  </ViewFieldBox>
                );
              }}
            />
          </Grid>
          {/* <HalfWidthGridItem item>
            <Controller
              name="originalName"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên danh mục gốc"
                  {...field}
                  disabled
                />
              )}
            />
          </HalfWidthGridItem> */}
         </Grid>
         </StyledBoxContainerContent>
                   <StyledBoxContainerContent>
          <SectionHeaderContainer>
                               <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                           <StyledIconWrapper>
                                                          <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M11.62 15.81V14.15C11.62 13.4897 11.3575 12.8564 10.8905 12.3895C10.482 11.981 9.9463 11.7288 9.37643 11.6721L9.13 11.66H4.15C3.48961 11.66 2.85646 11.9225 2.3895 12.3895C1.92253 12.8564 1.66 13.4897 1.66 14.15L1.66 15.81C1.66 16.2684 1.28839 16.64 0.83 16.64C0.371608 16.64 0 16.2684 0 15.81L0 14.15C0 13.0493 0.437543 11.9941 1.21582 11.2158C1.9941 10.4376 3.04935 10 4.15 10H9.13L9.33584 10.0049C10.3616 10.0558 11.3346 10.4862 12.0642 11.2158C12.8424 11.9941 13.28 13.0493 13.28 14.15V15.81C13.28 16.2684 12.9084 16.64 12.45 16.64C11.9916 16.64 11.62 16.2684 11.62 15.81Z" fill="#2364B0"/>
         <path d="M14.1352 4.15306C14.1352 3.60153 13.9523 3.06544 13.6148 2.62924C13.3194 2.24744 12.9201 1.96084 12.4671 1.80247L12.2702 1.7425L12.1891 1.71737C11.7946 1.5712 11.5674 1.14694 11.6752 0.730936C11.7831 0.315039 12.1876 0.0551911 12.6033 0.118968L12.6868 0.135992L12.8521 0.182189C13.6742 0.432011 14.3996 0.931895 14.9271 1.61362C15.4897 2.34068 15.7952 3.23375 15.7952 4.15306C15.7952 5.07237 15.4897 5.96544 14.9271 6.69254C14.3645 7.41954 13.5767 7.93945 12.6868 8.17011C12.2431 8.28515 11.7903 8.0188 11.6752 7.57517C11.5602 7.13153 11.8265 6.67868 12.2702 6.56363C12.8041 6.4252 13.2773 6.11314 13.6148 5.67689C13.9524 5.24067 14.1352 4.7046 14.1352 4.15306Z" fill="#2364B0"/>
         <path d="M16.6383 15.812V14.1529L16.6294 13.947C16.5894 13.4688 16.4121 13.0106 16.1163 12.6291C15.8205 12.2474 15.421 11.9611 14.9677 11.8031L14.7708 11.7431L14.6897 11.718C14.2951 11.5722 14.0676 11.1484 14.175 10.7324C14.2825 10.3164 14.6865 10.0555 15.1023 10.1188L15.1858 10.1366L15.3511 10.1828C16.1736 10.4319 16.9004 10.9304 17.4285 11.6118C17.9918 12.3385 18.2975 13.2318 18.2983 14.1513V15.812C18.2982 16.2704 17.9266 16.642 17.4683 16.642C17.01 16.642 16.6384 16.2704 16.6383 15.812Z" fill="#2364B0"/>
         <path d="M9.13219 4.15C9.13219 2.77481 8.01742 1.66 6.64219 1.66C5.267 1.66 4.15219 2.77481 4.15219 4.15C4.15219 5.52519 5.267 6.64 6.64219 6.64C8.01742 6.64 9.13219 5.52519 9.13219 4.15ZM10.7922 4.15C10.7922 6.44198 8.93415 8.3 6.64219 8.3C4.35021 8.3 2.49219 6.44198 2.49219 4.15C2.49219 1.85802 4.35021 0 6.64219 0C8.93415 0 10.7922 1.85802 10.7922 4.15Z" fill="#2364B0"/>
         </svg>
         
                                                             </StyledIconWrapper>
                               <StyledHeaderContent variant="h6"></StyledHeaderContent>
                 <StyledHeaderContent variant="h6">
                             DANH SÁCH DANH MỤC CON
                            </StyledHeaderContent>
                                 </div>
                                      </SectionHeaderContainer>
                                      <StyledDivider />
            <DynamicValuesTable defaultValue={defaultData?.data} disabled idDocumentParent={idDocumentParent} type={'view'} customMaxHeight={600}/>
          </StyledBoxContainerContent>
      </FormContainer>
    </CustomSwipper>
  );
};

ViewDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  reset: PropTypes.func.isRequired,
  defaultData: PropTypes.object,
};

export default ViewDialog;