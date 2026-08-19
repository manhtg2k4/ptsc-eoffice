import React from "react";
import { Box, Button, Card, styled } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import CustomInput from "@components/CustomInput/CustomInput";
import { API_ADD_FIELD_BPMN } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import { useNavigate } from "react-router-dom";
import { callApi } from "@services/api";
import { processSchema } from "./constants";

const PageContainer = styled("div")({
  overflowY: "auto",
  height: "100vh",
});

const ContentContainer = styled("div")({
  margin: "20px 20px 60px 20px",
});

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  height: "100%",
  border: "none",
}));

const FormContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

const FullWidthCustomInput = styled(CustomInput)({
  width: "100%",
});

const NavigationBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  display: "flex",
  gap: theme.spacing(2),
}));

const CompleteButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export default function AddProcess() {
  const toast = useToast();
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      id: "",
      description: "",
      status: true,
    },
    resolver: yupResolver(processSchema),
  });

  const saveDiagram = async (formData) => {
    try {
      // await fetch(API_ADD_FIELD_BPMN, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     ...formData, // thông tin từ form
      //   }),
      // });

			// const res = await callApi("post", API_ADD_FIELD_BPMN, formData);
			const payload = {
				...formData,
				processKey: formData.id,
			}
      await callApi("post", API_ADD_FIELD_BPMN, payload);
      // await callApi("post", API_ADD_FIELD_BPMN, formData);
      toast("Thêm mới thành công!", "success");
      navigate(`/list-bpmn`);
    } catch (err) {
      // THỦ PHẠM Ở ĐÂY: err.response.data.message mới là thông báo từ BE!
      const errorMessage =
        err.response?.data?.message || // ← Ưu tiên lấy message từ backend
        err.response?.data?.error ||
        err.message ||
        "Lỗi khi lưu";

      toast(errorMessage, "error");
    }
  };

  // Submit form
  const onSubmit = (data) => {
    saveDiagram(data); // Gọi lưu và truyền cả data form
  };

  return (
    <PageContainer>
      <ContentContainer>
        <StyledCard variant="outlined">
          <FormContainer>
            {/* Tên quy trình */}
            <Controller
              name="name"
              control={control}
              // render={({ field, fieldState }) => (
              render={({ field }) => (
                <FullWidthCustomInput
                  {...field}
                  label="Tên quy trình"
                  labelLayout="stacked"
                  variant="outlined"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  required
                />
              )}
            />

            {/* Mã quy trình */}
            <Controller
              name="id"
              control={control}
              // render={({ field, fieldState }) => (
              render={({ field }) => (
                <FullWidthCustomInput
                  {...field}
                  label="Mã quy trình"
                  labelLayout="stacked"
                  variant="outlined"
                  error={!!errors.id}
                  helperText={errors.id?.message}
                  required
                />
              )}
            />

            {/* Mô tả */}
            <Controller
              name="description"
              control={control}
              // render={({ field, fieldState }) => (
              render={({ field }) => (
                <FullWidthCustomInput
                  {...field}
                  label="Mô tả"
                  labelLayout="stacked"
                  variant="outlined"
                  multiline
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  rows={3}
                />
              )}
            />
          </FormContainer>

          {/* Navigation Buttons */}
          <NavigationBox>
            <CompleteButton
              // onClick={() => handleSubmit(onSubmit)()}
              onClick={handleSubmit(onSubmit)}
              variant="contained"
            >
              {"Hoàn thành"}
            </CompleteButton>
          </NavigationBox>
        </StyledCard>
      </ContentContainer>
    </PageContainer>
  );
}

