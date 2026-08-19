// import React, { useState } from "react";
// import {
//   Box,
//   TextField,
//   Typography,
//   IconButton,
//   Collapse,
//   Tooltip,
//   Stack,
//   Grid,
// } from "@mui/material";
// import { ExpandLess, ExpandMore } from "@mui/icons-material";
// import { useRegistry } from "../context/RegistryContext";
// import ElementWrapper from "../components/ElementWrapper";
// import PropTypes from "prop-types";
// import CustomAccordion from "@components/DynamicForm/CustomAccordion";
// import { useDragAndDrop } from "../hooks/useDragAndDrop";
// // import { DragContext } from '../context/DragContext';

// export const ConfigCollapse = ({ title, children }) => {
//   const [showConfig, setShowConfig] = useState(false);
//   return (
//     <>
//       <Stack
//         direction="row"
//         alignItems="start"
//         justifyContent="space-between"
//         mb={1}
//         padding={0}
//       >
//         <Typography fontWeight="bold">{title}</Typography>
//         <Tooltip title={showConfig ? "Ẩn cấu hình" : "Hiện cấu hình"}>
//           <IconButton onClick={() => setShowConfig(!showConfig)}>
//             {showConfig ? <ExpandLess /> : <ExpandMore />}
//           </IconButton>
//         </Tooltip>
//       </Stack>

//       <Collapse in={showConfig}>{children}</Collapse>
//     </>
//   );
// };

// ConfigCollapse.propTypes = {
//   title: PropTypes.string.isRequired,
//   children: PropTypes.node.isRequired,
// };

// export default function RowLayout({
//   item,
//   onDropChild,
//   onPropChange,
//   mode = "builder",
//   data,
//   disabled,
//   ...rest
// }) {

//   const registry = useRegistry();
//   const children = item.props?.children ?? [];

//   const {
//     dragOverId,
//     handleDragStart,
//     handleDragOver,
//     handleDragLeave,
//     handleDrop,
//     handleDropNewItem,
//   } = useDragAndDrop(
//     children,
//     (updatedChildren) => onPropChange(item.id, "children", updatedChildren),
//     (type) => onDropChild(item.id, type)
//   );

//   const handleChangeColumns = (e, key) => {
//     const val = e.target.value;
//     if (!isNaN(val)) {
//       onPropChange(item.id, "size", { ...item.props?.size, [key]: val });
//       onPropChange(item.id, "currentSize", "parent");
//     }
//   };

//   const handleChildSizeChange = (childId, key, value) => {
//     if (!isNaN(value)) {
//       const updatedChildren = children.map((child) => {
//         if (child.id === childId) {
//           return {
//             ...child,
//             props: {
//               ...child.props,
//               size: { ...child.props?.size, [key]: value },
//             },
//           };
//         }
//         return child;
//       });
//       onPropChange(item.id, "children", updatedChildren);
//       onPropChange(item.id, "currentSize", "child");
//     }
//   };

//   const handleDelete = (itemToDelete) => {
//     const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
//     onPropChange(item.id, "children", updatedChildren);
//   };

//   const handleChangeTitleLayout = (value) => {
//     onPropChange(item.id, "title", value);
//   };

//   const sizeLabels = {
//     xs: "Điện thoại",
//     sm: "Máy tính bảng",
//     md: "Laptop",
//     lg: "Màn hình lớn",
//   };

//   const handleKeyDown = (e) => {
//     if (["ArrowUp", "ArrowDown"].includes(e.key)) {
//       e.stopPropagation();
//     }
//   };

//   return (
//     <CustomAccordion
//       mode={mode}
//       defaultExpanded
//       title={item.props?.title || ""}
//       onTitleChange={handleChangeTitleLayout}
//       item={item}
//       onKeyDown={handleKeyDown}
//       onSizeChange={handleChangeColumns}
//     >
//       <Box mb={2}>

//         <Grid
//           container
//           spacing={mode === "builder" ? 0 : 2}
//           onDragOver={(e) => e.preventDefault()}
//           onDrop={handleDropNewItem}
//           sx={{
//             transition: "background-color 0.2s",
//           }}
//         >

//           {children.length > 0 ? (
//             children.map((ch) => {
//               const C = registry[ch.type]?.component;
//               if (!C) return null;

//               const content = (
//                 <C
//                   item={ch}
//                   items={children}
//                   onDropChild={onDropChild}
//                   onPropChange={onPropChange}
//                   mode={mode}
//                   data={data}
//                   disabled={disabled}
//                 />
//               );

//               const configContent = (
//                 <Box>
//                   {["xs", "sm", "md", "lg"].map((key) => (
//                     <Box key={key} display="flex" alignItems="center" mt={0.5}>
//                       <Typography fontWeight={500} minWidth={110}>
//                         {sizeLabels[key]}:
//                       </Typography>
//                       <TextField
//                         type="number"
//                         size="small"
//                         value={
//                           ch.props?.size?.[key] || item.props?.size?.[key] || ""
//                         }
//                         onChange={(e) =>
//                           handleChildSizeChange(ch.id, key, e.target.value)
//                         }
//                         onKeyDown={handleKeyDown}
//                         inputProps={{ min: 1, max: 12, style: { width: 60 } }}
//                       />
//                     </Box>
//                   ))}
//                   <Typography variant="caption" color="textSecondary">
//                     Cấu hình riêng sẽ ghi đè cấu hình chung
//                   </Typography>
//                 </Box>
//               );

//               return (
//                 <>
//                   <Grid
//                     item
//                     {...(item.props?.currentSize === "child"
//                       ? ch.props?.size || item.props?.size || { xs: 6 }
//                       : item.props?.size || ch.props?.size || { xs: 6 })}
//                     key={ch.id}
//                     draggable={mode === "builder"}
//                     onDragStart={(e) => handleDragStart(e, ch)}
//                     onDragOver={(e) => handleDragOver(e, ch)}
//                     onDragLeave={handleDragLeave}
//                     onDrop={(e) => handleDrop(e, ch)}
//                     sx={{
//                       minHeight: 50,
//                       cursor: mode === "builder" ? "grab" : "default",
//                       transition: "background-color 0.2s",
//                       border:
//                         dragOverId === ch.id ? "2px dashed #3f51b5" : "none",

//                     }}
//                   >
//                     {mode === "builder" ? (
//                       <ElementWrapper
//                         item={ch}
//                         items={children}
//                         onDelete={handleDelete}
//                         onDragStart={(e) => handleDragStart(e, ch)}
//                         onDragOver={(e) => handleDragOver(e, ch)}
//                         onDragLeave={handleDragLeave}
//                         onDrop={(e) => handleDrop(e, ch)}
//                         disabledBorder
//                       >
//                         {content}
//                         {configContent}
//                       </ElementWrapper>
//                     ) : (
//                       content
//                     )}
//                   </Grid>
//                 </>
//               );
//             })
//           ) : (
//             <Grid item xs={12}>
//               <Box
//                 sx={{
//                   textAlign: "center",
//                   color: "#aaa",
//                   minHeight: 80,
//                   border:
//                     dragOverId === null && mode === "builder"
//                       ? "2px dashed #3f51b5"
//                       : "none",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   width: "100%",
//                   pr: 2,
//                 }}
//                 onDragOver={(e) => e.preventDefault()}
//                 onDrop={handleDropNewItem}
//               >
//                 {mode === "builder" ? "Kéo vào đây" : null}
//               </Box>
//             </Grid>
//           )}

//           {/* {isDrag && children.length > 0 ?
//             <Grid
//               item
//               {...(item.props?.size ?? { xs: 6 })}
//               sx={{
//                 height: 111,
//                 cursor: mode === 'builder' ? 'grab' : 'default',
//                 transition: 'background-color 0.2s',
//                 // border: '2px dashed #3f51b5',
//                 pr: 2,
//                 display:'flex',
//                 alignItems:'center',
//                 justifyContent:'center'
//               }}  
//             >
//             </Grid>
//             : null} */}
//         </Grid>
//       </Box>
//     </CustomAccordion>
//   );
// }

// RowLayout.propTypes = {
//   item: PropTypes.object.isRequired,
//   onDropChild: PropTypes.func,
//   onPropChange: PropTypes.func,
//   data: PropTypes.object,
//   mode: PropTypes.oneOf(["builder", "preview"]),
// };




import React, { useState } from "react";
import {
  IconButton,
  Collapse,
  Tooltip,
  Grid,
  Box,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useRegistry } from "@builder-form/context/RegistryContext";
import ElementWrapper from "@builder-form/components/ElementWrapper";
import PropTypes from "prop-types";
import CustomAccordion from "@components/DynamicForm/CustomAccordion";
import { useDragAndDrop } from "@builder-form/hooks/useDragAndDrop";
import { motion } from "framer-motion"; // 👈 thêm framer-motion
import { ChildrenGridContainer, ChildGridItem, ConfigCollapseContainer, ConfigTitle, EmptyDropZone, HelperText, SizeInput, SizeLabel, SizeBox } from "./RowLayout.styles";

export const ConfigCollapse = ({ title, children }) => {
  const [showConfig, setShowConfig] = useState(false);
  const handleToggleConfig = () => {
    setShowConfig(!showConfig);
  };
  return (
    <>
      <ConfigCollapseContainer>
        <ConfigTitle>{title}</ConfigTitle>
        <Tooltip title={showConfig ? "Ẩn cấu hình" : "Hiện cấu hình"}>
          <IconButton onClick={handleToggleConfig}>
            {showConfig ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
      </ConfigCollapseContainer>

      <Collapse in={showConfig}>{children}</Collapse>
    </>
  );
};

ConfigCollapse.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default function RowLayout({
  item,
  onDropChild,
  addByConfig,
  onPropChange,
  mode = "builder",
  data,
  disabled,
}) {
  const registry = useRegistry();
  const children = item.props?.children ?? [];

  const {
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDropNewItem,
  } = useDragAndDrop(
    children,
    (updatedChildren) => onPropChange(item.id, "children", updatedChildren),
    (type) => onDropChild(item.id, type)
  );

  const handleChangeColumns = (e, key) => {
    const val = e.target.value;
    if (!isNaN(val)) {
      onPropChange(item.id, "size", { ...item.props?.size, [key]: val });
      onPropChange(item.id, "currentSize", "parent");
    }
  };

  const handleChildSizeChange = (childId, key, value) => {
    if (!isNaN(value)) {
      const updatedChildren = children.map((child) => {
        if (child.id === childId) {
          return {
            ...child,
            props: {
              ...child.props,
              size: { ...child.props?.size, [key]: value },
            },
          };
        }
        return child;
      });
      onPropChange(item.id, "children", updatedChildren);
      onPropChange(item.id, "currentSize", "child");
    }
  };

  const handleDelete = (itemToDelete, idFieldDelete) => {
    const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
    onPropChange(item.id, "children", updatedChildren, true, idFieldDelete);
  };

  const handleChangeTitleLayout = (value) => {
    onPropChange(item.id, "title", value);
  };

  const sizeLabels = {
    xs: "Điện thoại",
    sm: "Máy tính bảng",
    md: "Laptop",
    lg: "Màn hình lớn",
  };

  const handleKeyDown = (e) => {
    if (["ArrowUp", "ArrowDown"].includes(e.key)) {
      e.stopPropagation();
    }
  };

  const getHandleChildSizeChange = (childId, key) => (e) => {
    handleChildSizeChange(childId, key, e.target.value);
  };

  const getDeleteHandler = (itemToDelete, idFieldDelete) => () => {
    handleDelete(itemToDelete, idFieldDelete);
  };

  // Curried functions for drag and drop events
  const getDragStartHandler = (draggedItem) => (e) => handleDragStart(e, draggedItem);
  const getDragOverHandler = (draggedOverItem) => (e) => handleDragOver(e, draggedOverItem);
  const getDropHandler = (droppedOnItem) => (e) => handleDrop(e, droppedOnItem);

  const handlePreventDefaultDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <CustomAccordion
      mode={mode}
      defaultExpanded
      title={item.props?.title || ""}
      onTitleChange={handleChangeTitleLayout}
      item={item}
      onKeyDown={handleKeyDown}
      onSizeChange={handleChangeColumns}
    >
      <Box>
        <ChildrenGridContainer
          container
          spacing={mode === "builder" ? 0 : 2}
          onDragOver={handlePreventDefaultDragOver}
          onDrop={handleDropNewItem}
        >
          {children.length > 0 ? (
            children.map((ch) => {
              const C = registry[ch.type]?.component;
              if (!C) return null;

              const content = (
                <C
                  item={ch}
                  items={children}
                  onDropChild={onDropChild}
                  onPropChange={onPropChange}
                  addByConfig={addByConfig}
                  mode={mode}
                  data={data}
                  disabled={disabled}
                />
              );

              const configContent = (
                <Box>
                  {["xs", "sm", "md", "lg"].map((key) => (
                    <SizeBox key={key} mt={0.5}>
                      <SizeLabel>
                        {sizeLabels[key]}:
                      </SizeLabel>
                      <SizeInput
                        type="number"
                        size="small"
                        value={
                          ch.props?.size?.[key] || item.props?.size?.[key] || ""
                        }
                        onChange={getHandleChildSizeChange(ch.id, key)}
                        onKeyDown={handleKeyDown}
                        inputProps={{ min: 1, max: 12 }}
                      />
                    </SizeBox>
                  ))}
                  <HelperText variant="caption" >
                    Cấu hình riêng sẽ ghi đè cấu hình chung
                  </HelperText>
                </Box>
              );

              return (
                <ChildGridItem
                  item
                  component={motion.div}   // 👈 thêm dòng này
                  layout
                  // transition={{ duration: 0.3, ease: "easeInOut" }}
                  {...(item.props?.currentSize === "child"
                    ? ch.props?.size || item.props?.size || { xs: 6 }
                    : item.props?.size || ch.props?.size || { xs: 6 })}
                  key={ch.id}
                  draggable={mode === "builder"}
                  onDragStart={getDragStartHandler(ch)}
                  onDragOver={getDragOverHandler(ch)}
                  onDragLeave={handleDragLeave}
                  onDrop={getDropHandler(ch)}
                  isDraggingOver={dragOverId === ch.id}
                  mode={mode}
                >
                  {mode === "builder" ? (
                    <ElementWrapper
                      item={ch}
                      items={children}
                      onDelete={getDeleteHandler(ch, ch.id)}
                      onDragStart={getDragStartHandler(ch)}
                      onDragOver={getDragOverHandler(ch)}
                      onDragLeave={handleDragLeave}
                      onDrop={getDropHandler(ch)}
                      disabledBorder
                    >
                      {content}
                      {configContent}
                    </ElementWrapper>
                  ) : (
                    content
                  )}
                </ChildGridItem>

              );
            })
          ) : (
            <Grid item xs={12}>
              <EmptyDropZone
                isDraggingOver={dragOverId}
                mode={mode}
                onDragOver={handlePreventDefaultDragOver}
                onDrop={handleDropNewItem}
              >
                {mode === "builder" ? "Kéo vào đây" : null}
              </EmptyDropZone>
            </Grid>
          )}
        </ChildrenGridContainer>
      </Box>
    </CustomAccordion>
  );
}

RowLayout.propTypes = {
  item: PropTypes.object.isRequired,
  onDropChild: PropTypes.func,
  onPropChange: PropTypes.func,
  data: PropTypes.object,
  mode: PropTypes.oneOf(["builder", "preview"]),
  disabled: PropTypes.bool,
  addByConfig: PropTypes.func,

};
