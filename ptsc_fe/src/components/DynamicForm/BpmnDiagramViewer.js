// /* eslint-disable no-console */

import React, { useEffect, useRef, useState } from "react";
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import { CircularProgress, Box, Alert, styled } from "@mui/material";
import { API_BPMN } from "@EnvironmentFile/constants/urlConfig";
import PropTypes from "prop-types";
import api from "../../services/api";

const ViewerContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: theme.layout.bpmnViewerHeight,
}));

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: theme.zIndex.loadingOverlay,
  backgroundColor: theme.palette.background.overlay,
}));

const DiagramDiv = styled("div")(({ theme }) => ({
  width: "100%",
  height: "100%",
  "& .highlight > .djs-visual > :nth-child(1)": {
    stroke: `${theme?.palette?.bpmn?.highlightStroke} !important`,
    strokeWidth: `${theme?.palette?.bpmn?.highlightStrokeWidth} !important`,
    fill: `${theme?.palette?.bpmn?.highlightFill} !important`,
  },
}));

const StyledAlert = styled(Alert)({
  height: "100%",
  display: "flex",
  alignItems: "center",
});

const BpmnDiagramViewer = ({ processInstanceId }) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tạo viewer chỉ một lần khi component mount
  useEffect(() => {
    if (!containerRef.current) return;

    const initViewer = async () => {
      try {
        viewerRef.current = new BpmnViewer({
          container: containerRef.current,
        });
        logger.log("✅ BPMN Viewer created successfully");
      } catch (err) {
        logger.error("❌ Error creating BPMN Viewer:", err);
        setError("Không thể khởi tạo biểu đồ BPMN");
      }
    };

    initViewer();

    // Cleanup khi unmount
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        logger.log("🧹 BPMN Viewer destroyed");
      }
    };
  }, []); // Chỉ chạy một lần

  // Fetch và import diagram khi processInstanceId thay đổi
  useEffect(() => {
    if (!processInstanceId || !viewerRef.current) {
      if (loading) setLoading(false);
      return;
    }

    const fetchAndRenderDiagram = async () => {
      setLoading(true);
      setError(null);
      logger.log(`🔄 Fetching diagram for processInstanceId: ${processInstanceId}`);

      try {
        // Gọi API lấy sơ đồ - kiểm tra endpoint có đúng không
        const res = await api.get(
         `${API_BPMN}/diagram/${processInstanceId}`
        );
        logger.log("📥 API Response:", res.data);

        const { bpmnXml, activeActivityIds } = res.data;

        if (!bpmnXml) {
          throw new Error("Không nhận được dữ liệu XML từ server");
        }

        // Import XML
        const { warnings } = await viewerRef.current.importXML(bpmnXml);
        if (warnings.length > 0) {
          logger.warn("⚠️ Import warnings:", warnings);
        }

        const canvas = viewerRef.current.get("canvas");

        // Fit sơ đồ vừa khung
        canvas.zoom("fit-viewport");
        canvas.zoom("auto-fit", true);

        // Highlight các activity đang active
        if (Array.isArray(activeActivityIds) && activeActivityIds.length > 0) {
          activeActivityIds.forEach((id) => {
            canvas.addMarker(id, "highlight");
          });
          logger.log("✨ Highlighted activities:", activeActivityIds);
        } else {
          logger.log("ℹ️ No active activities to highlight");
        }

        logger.log("✅ Diagram rendered successfully");
      } catch (err) {
        logger.error("❌ Error fetching/rendering diagram:", err);
        setError(`Lỗi khi tải biểu đồ: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAndRenderDiagram();
  }, [processInstanceId, loading]);

  if (error) {
    return (
      <StyledAlert severity="error">
        {error}
      </StyledAlert>
    );
  }

  return (
    <ViewerContainer>
      {loading && (
        <LoadingOverlay>
          <CircularProgress />
        </LoadingOverlay>
      )}
      <DiagramDiv ref={containerRef} />
    </ViewerContainer>
  );
};
BpmnDiagramViewer.propTypes = {
  processInstanceId: PropTypes.string.isRequired,
};
export default BpmnDiagramViewer;
/* eslint-disable no-console */

// import React, { useEffect, useRef, useState } from "react";
// import api from "api";
// import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
// import "bpmn-js/dist/assets/diagram-js.css";
// import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
// import { CircularProgress, Box, Alert } from "@mui/material";
// import { API_BPMN } from "@EnvironmentFile/constants/urlConfig";
// import PropTypes from "prop-types";

// const BpmnDiagramViewer = ({ processInstanceId }) => {
//   const containerRef = useRef(null);
//   const viewerRef = useRef(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Tạo viewer chỉ một lần khi component mount
//   useEffect(() => {
//     if (!containerRef.current) return;

//     const initViewer = async () => {
//       try {
//         viewerRef.current = new BpmnViewer({
//           container: containerRef.current,
//         });
//         logger.log("✅ BPMN Viewer created successfully");
//       } catch (err) {
//         logger.error("❌ Error creating BPMN Viewer:", err);
//         setError("Không thể khởi tạo biểu đồ BPMN");
//       }
//     };

//     initViewer();

//     // Cleanup khi unmount
//     return () => {
//       if (viewerRef.current) {
//         viewerRef.current.destroy();
//         viewerRef.current = null;
//         logger.log("🧹 BPMN Viewer destroyed");
//       }
//     };
//   }, []);

//   // Fetch và import diagram khi processInstanceId thay đổi
//   useEffect(() => {
//     if (!processInstanceId || !viewerRef.current) {
//       if (loading) setLoading(false);
//       return;
//     }

//     const fetchAndRenderDiagram = async () => {
//       setLoading(true);
//       setError(null);
//       logger.log(`🔄 Fetching diagram for processInstanceId: ${processInstanceId}`);

//       try {
//         // Gọi API lấy sơ đồ
//         const res = await api.get(`${API_BPMN}/diagram/${processInstanceId}`);
//         logger.log("📥 API Response:", res.data);

//         const { bpmnXml, activeActivityIds } = res.data;

//         if (!bpmnXml) {
//           throw new Error("Không nhận được dữ liệu XML từ server");
//         }

//         // Import XML
//         const { warnings } = await viewerRef.current.importXML(bpmnXml);
//         if (warnings.length > 0) {
//           logger.warn("⚠️ Import warnings:", warnings);
//         }

//         const canvas = viewerRef.current.get("canvas");
//         const elementRegistry = viewerRef.current.get("elementRegistry");

//         // Highlight các activity đang active
//         if (Array.isArray(activeActivityIds) && activeActivityIds.length > 0) {
//           activeActivityIds.forEach((id) => {
//             canvas.addMarker(id, "highlight");
//           });
//           logger.log("✨ Highlighted activities:", activeActivityIds);

//           // Căn giữa activity active đầu tiên
//           const activeElement = elementRegistry.get(activeActivityIds[0]);
//           if (activeElement) {
//             const { x, y, width, height } = activeElement;
          
      
//             // Tính toán tọa độ để căn giữa activity
//             const viewboxWidth = width * 8;
//             const viewboxHeight = height * 8;
//             const centerX = x + width / 2 - viewboxWidth / 2;
//             const centerY = y + height / 2 - viewboxHeight / 2;

//             canvas.viewbox({
//               x: centerX,
//               y: centerY,
//               width: viewboxWidth,
//               height: viewboxHeight,
//             });
//             logger.log(`🎯 Centered on active activity: ${activeActivityIds[0]} at x: ${centerX}, y: ${centerY}`);
//           }
//         } else {
//           // Nếu không có active activity, fit toàn bộ sơ đồ
//           canvas.zoom("fit-viewport");
//           logger.log("ℹ️ No active activities, using fit-viewport");
//         }

//         logger.log("✅ Diagram rendered successfully");
//       } catch (err) {
//         logger.error("❌ Error fetching/rendering diagram:", err);
//         setError(`Lỗi khi tải biểu đồ: ${err.message}`);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAndRenderDiagram();
//   }, [processInstanceId]);

//   if (error) {
//     return (
//       <Alert severity="error" sx={{ height: "100%", display: "flex", alignItems: "center" }}>
//         {error}
//       </Alert>
//     );
//   }

//   return (
//     <Box sx={{ position: "relative", width: "100%", height: "85vh" }}>
//       {loading && (
//         <Box
//           sx={{
//             position: "absolute",
//             inset: 0,
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             zIndex: 10,
//             bgcolor: "rgba(255,255,255,0.7)",
//           }}
//         >
//           <CircularProgress />
//         </Box>
//       )}
//       {/* background: "radial-gradient(circle, #e0e0e0 1px, transparent 1px) 0 0 / 10px 10px" */}
//       <div
//         ref={containerRef}
//         style={{ width: "100%", height: "100%", }}
//       />

//       <style>{`
//         /* Highlight giống Camunda 7 */
//         .highlight > .djs-visual > :nth-child(1) {
//           stroke: #1976d2 !important;
//           stroke-width: 4px !important;
//           fill: rgba(25, 118, 210, 0.15) !important;
//         }

//         /* Ngăn select/copy text trong diagram */
//         .djs-container,
//         .djs-container text,
//         .djs-container tspan {
//           user-select: none !important;
//           pointer-events: none !important;
//         }
//       `}</style>
//     </Box>
//   );
// };

// BpmnDiagramViewer.propTypes = {
//   processInstanceId: PropTypes.string.isRequired,
// };

// export default BpmnDiagramViewer;