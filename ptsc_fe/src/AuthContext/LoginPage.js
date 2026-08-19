import React, { useEffect, useContext } from "react";
import backgroundTcLogin from "@assets/imgBackground/backgroundTCLogin.png";
import logoTCLogin from "@assets/imgBackground/logoTCLogin.png";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import {
  BoxLoginForm,
  LoginPageContainerGrid,
  LoginPageLeftContainer,
  LoginPageRightContainer,
  LoginTitle,
  SubTitleLogin,
  StyledContainerLogoLogin,
  GridContainerLogoLeft,
  GridContainerLogoRight,
  StyleLogoTCLogin,
  LogoTextContainer,
  LogoTextPrimary,
  LogoTextSecondary,
} from "./LoginPage.styles";
import LocalLoginForm from "./LocalLoginForm";

const LoginPage = () => {
  const { authenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && authenticated) {
      navigate("/");
    }
  }, [authenticated, navigate]);

  return (
    <LoginPageContainerGrid container>
      <LoginPageLeftContainer item xs={0} md={7} lg={8}>
        <img
          src={backgroundTcLogin}
          alt="Background"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </LoginPageLeftContainer>
      <LoginPageRightContainer item xs={12} md={5} lg={4}>
        <BoxLoginForm>
          <StyledContainerLogoLogin container>
            <GridContainerLogoLeft item xs={12} md="auto">
              <StyleLogoTCLogin
                component="img"
                src={logoTCLogin}
                alt="Logo TCSG"
              />
            </GridContainerLogoLeft>

            <GridContainerLogoRight item xs={12} md>
              <LogoTextContainer>
                <LogoTextPrimary>TỔNG CÔNG TY TÂN CẢNG SÀI GÒN</LogoTextPrimary>
                <LogoTextSecondary>
                  SAIGON NEWPORT CORPORATION
                </LogoTextSecondary>
              </LogoTextContainer>
            </GridContainerLogoRight>
          </StyledContainerLogoLogin>

          <LoginTitle variant="h4" component="h1">
            Đăng nhập
          </LoginTitle>
          <SubTitleLogin variant="body2">
            Hệ thống Quản lý Quy trình & Điều hành
          </SubTitleLogin>

          <LocalLoginForm />
        </BoxLoginForm>
      </LoginPageRightContainer>
    </LoginPageContainerGrid>
  );
};

export default LoginPage;
