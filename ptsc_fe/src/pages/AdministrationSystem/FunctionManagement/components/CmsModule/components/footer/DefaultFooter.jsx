import React from "react";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';
import { encodeHTML } from "@/utils/securityUtils";


const SocialLinkItem = ({ link }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseEnter = React.useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = React.useCallback(() => setIsHovered(false), []);

  return (
    <a
      href={link.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      title={link.label}
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: link.bgColor || "#3b5998",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        transition: "all 0.3s ease",
        cursor: "pointer",
        boxShadow: isHovered ? "0 6px 12px rgba(0,0,0,0.2)" : "0 4px 6px rgba(0,0,0,0.1)",
        transform: isHovered ? "translateY(-3px)" : "translateY(0)"
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {link.iconType === "facebook" && (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )}
      {link.iconType === "zalo" && (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 15.318c-.398.797-1.477 1.477-2.275 1.477-.398 0-.796-.08-1.194-.239-1.592-.637-3.582-1.592-5.174-2.946-.637-.558-1.273-1.194-1.671-1.99-.319-.638-.478-1.354-.478-2.07 0-1.194.478-2.228 1.354-2.946.558-.478 1.273-.717 2.07-.717.319 0 .637.08.955.239.398.239.717.637.876 1.035l.797 1.592c.239.478.159 1.035-.239 1.433-.319.319-.717.558-1.115.797-.159.08-.239.239-.239.398 0 .159.08.398.239.558.478.637 1.035 1.194 1.671 1.671.159.159.398.239.558.239.159 0 .319-.08.398-.239.239-.398.478-.797.797-1.115.398-.398.955-.478 1.433-.239l1.592.797c.398.159.797.478 1.035.876.159.318.239.636.239.955 0 .398-.08.796-.319 1.194z" />
        </svg>
      )}
      {link.iconType === "custom" && link.iconUrl && (
        link.iconUrl.trim().startsWith("<svg") ? (
          <div
            style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}
            dangerouslySetInnerHTML={{ __html: encodeHTML(link.iconUrl) }}
          />
        ) : (
          <AuthImage src={link.iconUrl} alt={link.label} customStyle={{ width: 22, height: 22, objectFit: "contain" }} />
        )
      )}
      {link.iconType === "custom" && !link.iconUrl && (
        <span style={{ color: "#fff", fontSize: "0.875rem", fontWeight: 700 }}>{link.label?.[0] || "?"}</span>
      )}
    </a>
  );
};

const DefaultFooter = ({
  logoUrl,
  logoWidth,
  logoHeight,
  companyName,
  description,
  hotlineLabel,
  hotlineNumber,
  followText,
  socialLinks = [],
  imageUrl,
  backgroundColor,
  textColor
}) => {
  const hasImage = imageUrl && imageUrl.trim() !== "";
  const hasLogo = logoUrl && logoUrl.trim() !== "";

  return (
    <div
      className="footer-container"
      style={{
        position: "relative",
        backgroundImage: hasImage ? `url(${imageUrl})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: hasImage ? "transparent" : (backgroundColor || "#2c3e50"),
      }}
    >

      {hasImage && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            zIndex: 0,
          }}
        />
      )}

      <div className="footer-content">
        {/* Left Section - Logo + Text + Hotline */}
        <div className="footer-left">
          {hasLogo && (
            <AuthImage
              src={logoUrl}
              alt="Logo"
              customStyle={{
                width: logoWidth ? (isNaN(Number(logoWidth)) ? logoWidth : `${logoWidth}px`) : "5rem",
                height: logoHeight ? (isNaN(Number(logoHeight)) ? logoHeight : `${logoHeight}px`) : "5rem",
                objectFit: "contain",
                flexShrink: 0
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {companyName && (
              <div
                className="footer-company-name"
                style={{
                  fontSize: "0.875rem",
                  color: hasImage ? "#fff" : (textColor || "#fff"),
                  lineHeight: 1.5,
                  fontWeight: 600
                }}
              >
                {companyName}
              </div>
            )}
            {description && (
              <div
                className="footer-description"
                style={{
                  fontSize: "0.8125rem",
                  color: hasImage ? "#ddd" : (textColor || "#ddd"),
                  lineHeight: 1.5,
                  marginBottom: 8
                }}
              >
                {description}
              </div>
            )}

            {/* Hotline nằm dưới description */}
            {(hotlineLabel || hotlineNumber) && (
              <div className="hotline-box">
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00468c" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                  {hotlineLabel && (
                    <div style={{
                      fontSize: "0.6875rem",
                      color: hasImage ? "#ccc" : (textColor || "#ccc"),
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      {hotlineLabel}
                    </div>
                  )}
                  {hotlineNumber && (
                    <div style={{
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: hasImage ? "#fff" : (textColor || "#fff")
                    }}>
                      {hotlineNumber}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Social Links */}
        <div className="footer-right">
          {followText && (
            <div style={{
              fontSize: "0.875rem",
              color: hasImage ? "#fff" : (textColor || "#fff"),
              fontWeight: 500
            }}>
              {followText}
            </div>
          )}
          <div className="social-links-wrapper" style={{ display: "flex", gap: 12 }}>
            {socialLinks.map((link, index) => (
              <SocialLinkItem
                key={link.url || index}
                link={link}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


export default DefaultFooter;
