import React from "react";
import { styled } from "@mui/material";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Image } from "@tiptap/extension-image";
import AuthImage from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimImage';

const StyledResizableWrapper = styled(NodeViewWrapper)(({ selected, imgWidth, resizing }) => ({
  display: "inline-block",
  position: "relative",
  lineHeight: 0,
  width: imgWidth ? `${imgWidth}px` : "auto",
  maxWidth: "100%",
  margin: "4px",
  verticalAlign: "bottom",
  border: selected ? "2px solid #0066CC" : "2px solid transparent",
  borderRadius: "4px",
  overflow: "visible",
  userSelect: resizing ? "none" : "auto",
  transition: "border 0.2s",
}));

const StyledAuthImage = styled(AuthImage)(({ imgWidth }) => ({
  width: imgWidth ? "100%" : "auto",
  maxWidth: "100%",
  height: "auto",
  display: "block",
  pointerEvents: "none",
}));

const ResizableImageComponent = ({ node, updateAttributes, selected, editor }) => {
  const containerRef = React.useRef(null);
  const [resizing, setResizing] = React.useState(false);
  const [startSize, setStartSize] = React.useState({ width: 0, height: 0 });
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    setStartSize({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    });
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const onMouseMove = React.useCallback(
    (e) => {
      if (!resizing) return;

      const dx = e.clientX - startPos.x;
      const newWidth = Math.max(50, startSize.width + dx);

      updateAttributes({
        width: newWidth,
      });
    },
    [resizing, startPos, startSize, updateAttributes]
  );

  const onMouseUp = React.useCallback(() => {
    setResizing(false);
  }, []);

  React.useEffect(() => {
    if (resizing) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing, onMouseMove, onMouseUp]);

  return (
    <StyledResizableWrapper
      ref={containerRef}
      selected={selected}
      imgWidth={node.attrs.width}
      resizing={resizing}
    >
      <StyledAuthImage
        src={node.attrs.src}
        alt={node.attrs.alt}
        title={node.attrs.title}
        imgWidth={node.attrs.width}
      />
      {selected && editor.isEditable && (
        <div
          onMouseDown={onMouseDown}
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 12,
            height: 12,
            backgroundColor: "#0066CC",
            cursor: "nwse-resize",
            zIndex: 100,
            borderRadius: "50%",
            border: "2px solid white",
            boxShadow: "0 0 4px rgba(0,0,0,0.2)",
          }}
        />
      )}
    </StyledResizableWrapper>
  );
};

export const CustomResizableImage = Image.extend({
  inline: true,
  group: "inline",
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px; height: auto; max-width: 100%;`,
          };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
