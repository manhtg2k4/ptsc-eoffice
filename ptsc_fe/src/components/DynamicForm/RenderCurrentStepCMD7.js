import React, { useEffect, useRef } from "react";
import BpmnViewer from "bpmn-js";
import PropTypes from "prop-types";
import { styled } from "@mui/material";

const BpmnContainer = styled("div")(({ theme }) => ({
    width: "100%",
    height: theme.layout.renderStepHeight,
    border: `1px solid ${theme.palette.divider}`,
}));
const RenderCurrentStepCMD7 = ({ xml, activeIds = [] }) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);

    // Init viewer chỉ 1 lần
    useEffect(() => {
        if (containerRef.current && !viewerRef.current) {
            viewerRef.current = new BpmnViewer({
                container: containerRef.current,
            });
        }
        return () => {
            viewerRef.current?.destroy();
            viewerRef.current = null;
        };
    }, []);

    // Import XML mỗi khi xml đổi
    useEffect(() => {
        if (!xml || typeof xml !== "string" || !xml.includes("<bpmn:definitions")) {
            logger.error("XML không hợp lệ:", xml);
            return;
        }

        viewerRef.current?.importXML(xml, (err) => {
            if (err) {
                logger.error("Lỗi import BPMN:", err);
            } else {
                const canvas = viewerRef.current.get("canvas");
                canvas.zoom("fit-viewport");

                // highlight
                activeIds.forEach((id) => {
                    canvas.addMarker(id, "highlight");
                });
            }
        });
    }, [xml, activeIds]);

    return (
        <BpmnContainer ref={containerRef} />
    );
};

RenderCurrentStepCMD7.propTypes = {
  xml: PropTypes.string.isRequired,
  activeIds: PropTypes.arrayOf(PropTypes.string),
};

export default RenderCurrentStepCMD7;
