import React from 'react';
import { COMPONENT_MAP } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/config/componentMapping';
import { useCMS } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/context/CMSContext';

export const TwoColumn = ({ left, right, split, leftComponent, rightComponent, id, height, heightTablet, width, loading: blockLoading, backgroundColor, ...restProps }) => {
  const { isLoading } = useCMS();
  const loading = blockLoading || isLoading;
  const leftPercent = split ? Number(split) : 50;

  const LeftComp = leftComponent && COMPONENT_MAP[leftComponent] ? COMPONENT_MAP[leftComponent].component : null;
  const RightComp = rightComponent && COMPONENT_MAP[rightComponent] ? COMPONENT_MAP[rightComponent].component : null;

  return (
    <div className="two-column-container" style={{
      display: "flex",
      gap: 25,
      padding: 0,
      height: height ? (isNaN(height) ? height : `${height}px`) : "100%",
      "--height-tablet": heightTablet ? (isNaN(heightTablet) ? heightTablet : `${heightTablet}px`) : "350px",
      minWidth: 0,
      width: width ? (isNaN(width) ? width : `${width}%`) : "100%",
      margin: "0 auto",
      boxSizing: "border-box",
      background: loading ? "transparent" : (backgroundColor || "transparent")
    }}>
      {/* Left Column - Proportional grow based on leftPercent */}
      <div className="two-column-left" style={{
        flex: `${leftPercent} 1 0%`,
        padding: 0,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
        containerType: "inline-size",
        boxSizing: "border-box"
      }}>
        {loading ? (
          <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '8px' }}></div>
        ) : (
          LeftComp ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <LeftComp id={id ? `${id}-left` : undefined} {...restProps} />
            </div>
          ) : (left || "Left Col")
        )}
      </div>

      {/* Right Column - Proportional grow based on the remaining percent */}
      <div className="two-column-right" style={{
        flex: `${100 - leftPercent} 1 0%`,
        padding: 0,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
        containerType: "inline-size",
        boxSizing: "border-box"
      }}>
        {loading ? (
          <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '8px' }}></div>
        ) : (
          RightComp ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: "40px 0" }}>
              <RightComp id={id ? `${id}-right` : undefined} {...restProps} />
            </div>
          ) : (right || "Right Col")
        )}
      </div>
    </div>
  );
};