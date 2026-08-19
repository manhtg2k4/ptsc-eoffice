


// import React, { useState } from 'react';
// import { useRegistry } from '../context/RegistryContext';
// import { Box, Tooltip } from '@mui/material';
// import ElementWrapper from '../components/ElementWrapper';
// import PropTypes from 'prop-types';
// import { useDragAndDrop } from '../hooks/useDragAndDrop';
// import { useToast } from '@components/common/ToastProvider';
// import { useRef } from 'react';
// import { StyledButton } from '@styles/CustomTable.styles';
// import DeleteIcon from '@mui/icons-material/Delete';

// const allowMore = ['action']

// export default function TableLayout({
//   item,
//   onDropChild,
//   onPropChange,
//   mode = 'builder',
//   data,
//   handleSetColumnConfig,
// }) {
//   const [selectedIds, setSelectedIds] = useState([])
//   logger.log("🚀 ~ TableLayout ~ selectedIds:", selectedIds)
//   const registry = useRegistry();
//   const children = item.props?.children || [];
//   const toast = useToast();
//   const CRefs = useRef({});
//   logger.log("🚀 ~ TableLayout ~ CRefs:", CRefs)
//   const {
//     dragOverId,
//     handleDragStart,
//     handleDragOver,
//     handleDragLeave,
//     handleDrop,
//     handleDropNewItem,
//   } = useDragAndDrop(
//     children,
//     (updatedChildren) => onPropChange(item.id, 'children', updatedChildren),
//     (type, slot) => {
//       if (
//         (type === 'search' && slot !== 'search') ||
//         (type === 'action' && slot !== 'action') ||
//         (type === 'table' && slot !== 'table')
//       ) {
//         toast(`Không thể kéo ${type} vào vùng ${slot}`, 'error');
//         return;
//       }

//       if (type === 'search' && children.some((ch) => ch.type === 'search')) {
//         toast('Chỉ được phép có một component search', 'error');
//         return;
//       }
//       if (type === 'table' && children.some((ch) => ch.type === 'table')) {
//         toast('Chỉ được phép có một component table', 'error');
//         return;
//       }

//       onDropChild(item.id, type, slot);
//     }
//   );

//   const handleDelete = (itemToDelete) => {
//     const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
//     onPropChange(item.id, 'children', updatedChildren);
//   };

//   const slotOf = (ch) => ch.type;
//   const subtabChildren = children.filter((ch) => slotOf(ch) === 'subtab');
//   const searchChildren = children.filter((ch) => slotOf(ch) === 'search');
//   const actionsChildren = children.filter((ch) => slotOf(ch) === 'action');
//   const tableChildren = children.filter((ch) => slotOf(ch) === 'table');



//   const renderZone = (zoneChildrenArray, zoneName) => {
//     const Zone = (
//       <Box
//         onDragOver={(e) => e.preventDefault()}
//         onDrop={(e) => {
//           e.preventDefault();
//           handleDropNewItem(e, zoneName);
//         }}
//         sx={{
//           display: 'flex',
//           alignItems: 'center',
//           minHeight: 70,
//           justifyContent: 'flex-end',
//           border: mode === 'builder' ? '2px dashed #3f51b5' : 'none',
//           borderRadius: 1,
//           bgcolor: mode === 'builder' ? 'transparent' : 'inherit',
//         }}
//       >
//         {mode === 'builder' ? `Kéo ${zoneName} vào vùng` : null}
//       </Box>
//     );

//     return (
//       <>
//         {zoneChildrenArray.length === 0 && !allowMore.includes(zoneName) && Zone}
//         {allowMore.includes(zoneName) && Zone}

//         {zoneChildrenArray.map((ch) => {
//           const C = registry[ch.type]?.component;
//           if (!C) return null;
//           const content = (
//             <C
//               ref={(el) => {
//                 CRefs.current[zoneName] = el;
//               }}
//               onSearch={(data) => CRefs.current.table?.handleSearch(data)}
//               onTabChange={(data) => CRefs.current.table?.handleTabChange(data)}
//               onActionPopup={(data) => CRefs.current.table?.handleActionPopup(data)}
//               item={ch}
//               onDropChild={onDropChild}
//               onPropChange={onPropChange}
//               mode={mode}
//               data={data}
//               handleSetColumnConfig={handleSetColumnConfig}
//             />
//           );

//           return (
//             <Box
//               key={ch.id}
//               draggable={mode === 'builder'}
//               onDragStart={(e) => handleDragStart(e, ch)}
//               onDragOver={(e) => handleDragOver(e, ch)}
//               onDragLeave={(e) => handleDragLeave(e, ch)}
//               onDrop={(e) => handleDrop(e, ch)}
//               sx={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 minHeight: 32,
//                 position: 'relative',
//                 cursor: mode === 'builder' ? 'grab' : 'default',
//               }}
//             >
//               {mode === 'builder' ? (
//                 <ElementWrapper
//                   item={ch}
//                   onDelete={handleDelete}
//                   onDragStart={(e) => handleDragStart(e, ch)}
//                   onDragOver={(e) => handleDragOver(e, ch)}
//                   onDragLeave={(e) => handleDragLeave(e, ch)}
//                   onDrop={(e) => handleDrop(e, ch)}
//                   disabledBorder
//                 >
//                   {content}
//                 </ElementWrapper>
//               ) : (
//                 content
//               )}
//             </Box>
//           );
//         })}


//       </>
//     );
//   };

//   const handleSelectedIds = (ids) => {
//     setSelectedIds(ids)
//   }

//   return (
//     <Box mb={2}>
//       <Box
//         mb={1}
//         sx={{
//           display: subtabChildren.length || mode === 'builder' ? 'flex' : 'none',
//           width: '100%',
//           alignItems: 'center',
//           justifyContent: 'flex-start',

//         }}
//       >
//         <Box>
//           {renderZone(subtabChildren, 'subtab')}
//         </Box>
//       </Box>
//       <Box
//         mb={1}
//         sx={{
//           display: searchChildren.length || mode === 'builder' ? 'flex' : 'none',
//           width: '100%',
//           alignItems: 'center',
//           justifyContent: 'flex-start',
//           gap: 1,
//         }}
//       >
//         <Box
//           sx={{
//             flex: '1 1 auto',
//             display: 'flex',
//             alignItems: 'center',
//             gap: 1,
//           }}
//         >
//           {renderZone(searchChildren, 'search')}
//         </Box>
//       </Box>

//       <Box
//         mb={1}
//         sx={{
//           display: 'flex',
//           width: '100%',
//           alignItems: 'center',
//           justifyContent: 'flex-end',
//           gap: 1,
//         }}
//       >
//         <Box
//           sx={{
//             ml: 1,
//             display: 'flex',
//             alignItems: 'center',
//             gap: 1,
//           }}
//         >
//           {selectedIds.length > 0 && <StyledButton sx={{ ml: 1.5 }} variant="contained" color='error' onClick={() => CRefs.current.table?.handleOpenDeleteMulti(selectedIds)}>
//             <Tooltip>
//               <DeleteIcon />
//             </Tooltip>
//           </StyledButton>}

//           {renderZone(actionsChildren, 'action')}
//         </Box>
//       </Box>

//       <Box
//         onDragOver={(e) => e.preventDefault()}
//         onDrop={(e) => {
//           e.preventDefault();
//           handleDropNewItem(e, 'table');
//         }}
//         sx={{
//           minHeight: 120,
//           borderRadius: 1,
//         }}
//       >
//         {tableChildren.length > 0 ? (
//           tableChildren.map((ch) => {
//             const C = registry[ch.type]?.component;
//             if (!C) return null;
//             const content = (
//               <C
//                 ref={(el) => {
//                   CRefs.current['table'] = el;
//                 }}
//                 onSelectedIds={(data) => handleSelectedIds(data)}
//                 item={ch}
//                 onDropChild={onDropChild}
//                 onPropChange={onPropChange}
//                 mode={mode}
//                 data={data}
//                 handleSetColumnConfig={handleSetColumnConfig}
//               />
//             );
//             return (
//               <Box
//                 key={ch.id}
//                 flex={ch.props?.flex || '0 1 auto'}
//                 draggable={mode === 'builder'}
//                 onDragStart={(e) => handleDragStart(e, ch)}
//                 onDragOver={(e) => handleDragOver(e, ch)}
//                 onDragLeave={(e) => handleDragLeave(e, ch)}
//                 onDrop={(e) => handleDrop(e, ch)}
//                 sx={{
//                   minHeight: 50,
//                   minWidth: 100,
//                   position: 'relative',
//                   cursor: mode === 'builder' ? 'grab' : 'default',
//                   transition: 'all 0.2s',
//                   border: dragOverId === ch.id ? '2px dashed #3f51b5' : 'none',
//                   outline: 'none',
//                 }}
//               >
//                 {mode === 'builder' ? (
//                   <ElementWrapper
//                     item={ch}
//                     onDelete={handleDelete}
//                     onDragStart={(e) => handleDragStart(e, ch)}
//                     onDragOver={(e) => handleDragOver(e, ch)}
//                     onDragLeave={(e) => handleDragLeave(e, ch)}
//                     onDrop={(e) => handleDrop(e, ch)}
//                     disabledBorder
//                   >
//                     {content}
//                   </ElementWrapper>
//                 ) : (
//                   content
//                 )}
//               </Box>
//             );
//           })
//         ) : (
//           <Box
//             sx={{
//               textAlign: 'center',
//               color: '#aaa',
//               width: '100%',
//               minHeight: 120,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               border: mode === 'builder' ? '2px dashed #3f51b5' : 'none',
//             }}
//           >
//             {mode === 'builder' ? 'Kéo component vào vùng bảng' : null}
//           </Box>
//         )}
//       </Box>
//     </Box>
//   );
// }

// TableLayout.propTypes = {
//   item: PropTypes.shape({
//     id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
//     type: PropTypes.string.isRequired,
//     props: PropTypes.shape({
//       direction: PropTypes.string,
//       justifyContent: PropTypes.string,
//       alignItems: PropTypes.string,
//       gap: PropTypes.number,
//       flex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
//       children: PropTypes.arrayOf(
//         PropTypes.shape({
//           id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
//           type: PropTypes.string.isRequired,
//           props: PropTypes.object,
//         })
//       ),
//     }),
//   }).isRequired,
//   onDropChild: PropTypes.func.isRequired,
//   onPropChange: PropTypes.func.isRequired,
//   mode: PropTypes.oneOf(['builder', 'preview']),
//   data: PropTypes.object,
//   handleSetColumnConfig: PropTypes.func,
// };

// TableLayout.defaultProps = {
//   mode: 'builder',
// };



import React, { useState, useRef } from 'react';
import { useRegistry } from '@builder-form/context/RegistryContext';
import { Box, Tooltip } from '@mui/material';
import ElementWrapper from '@builder-form/components/ElementWrapper';
import PropTypes from 'prop-types';
import { useDragAndDrop } from '@builder-form/hooks/useDragAndDrop';
import { useToast } from '@components/common/ToastProvider';
// import { StyledButton } from '@styles/CustomTable.styles';
import {
  MainContainer,
  SubtabContainer,
  SearchContainer,
  SearchContent,
  ActionsContainer,
  PaginationContent,
  ActionButtonsContent,
  TableContent,
  DropZone,
  ChildWrapper,
  DeleteMultiButton,
} from './TableLayout.styles';
import DeleteIcon from '@mui/icons-material/Delete';

const allowMore = ['action']

export default function TableLayout({
  item,
  onDropChild,
  onPropChange,
  mode = 'builder',
  data,
  handleSetColumnConfig,
}) {
  const [selectedIds, setSelectedIds] = useState([])

  const registry = useRegistry();
  const children = item.props?.children || [];
  const toast = useToast();
  const CRefs = useRef({});
 
  const {
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDropNewItem,
  } = useDragAndDrop(
    children,
    (updatedChildren) => onPropChange(item.id, 'children', updatedChildren),
    (type, slot) => {
      if (
        (type === 'search' && slot !== 'search') ||
        (type === 'action' && slot !== 'action') ||
        (type === 'table' && slot !== 'table')
      ) {
        toast(`Không thể kéo ${type} vào vùng ${slot}`, 'error');
        return;
      }

      if (type === 'search' && children.some((ch) => ch.type === 'search')) {
        toast('Chỉ được phép có một component search', 'error');
        return;
      }
      if (type === 'table' && children.some((ch) => ch.type === 'table')) {
        toast('Chỉ được phép có một component table', 'error');
        return;
      }

      onDropChild(item.id, type, slot);
    }
  );

  const handleDelete = (itemToDelete) => {
    const updatedChildren = children.filter((el) => el.id !== itemToDelete.id);
    onPropChange(item.id, 'children', updatedChildren);
  };

  const slotOf = (ch) => ch.type;
  const subtabChildren = children.filter((ch) => slotOf(ch) === 'subtab');
  const searchChildren = children.filter((ch) => slotOf(ch) === 'search');
  const paginationChildren = children.filter((ch) => slotOf(ch) === 'pagination');
  const actionsChildren = children.filter((ch) => slotOf(ch) === 'action');
  const tableChildren = children.filter((ch) => slotOf(ch) === 'table');

  const handlePreventDefaultDragOver = (e) => e.preventDefault();

  const getDropNewItemHandler = (zoneName) => (e) => {
    e.preventDefault();
    handleDropNewItem(e, zoneName);
  };

  // Curried functions for drag and drop events
  const getDragStartHandler = (draggedItem) => (e) => handleDragStart(e, draggedItem);
  const getDragOverHandler = (draggedOverItem) => (e) => handleDragOver(e, draggedOverItem);
  const getDropHandler = (droppedOnItem) => (e) => handleDrop(e, droppedOnItem);
  const getDragLeaveHandler = (item) => (e) => handleDragLeave(e, item);

  // Handlers for child component events
  const handleChildSearch = (data) => CRefs?.current?.table?.handleSearch?.(data);
  const handleChildTabChange = (data) => CRefs?.current?.table?.handleTabChange?.(data);
  const handleChildActionPopup = (data) => CRefs?.current?.table?.handleActionPopup?.(data);
  const handleChildExport = (data) => CRefs?.current?.table?.handleExportTableData?.(data);
  const handleChildPaginationChange = (data) => CRefs?.current?.table?.handlePageChange?.(data);


  const renderZone = (zoneChildrenArray, zoneName) => {
    const Zone = (
      <DropZone
        onDragOver={handlePreventDefaultDragOver}
        onDrop={getDropNewItemHandler(zoneName)}
        isBuilder={mode === 'builder'}
      >
        {mode === 'builder' ? `Kéo ${zoneName} vào vùng` : null}
      </DropZone>
    );

    return (
      <>
        {zoneChildrenArray.length === 0 && !allowMore.includes(zoneName) && Zone}
        {allowMore.includes(zoneName) && Zone}

        {zoneChildrenArray.map((ch) => {
          const C = registry[ch.type]?.component;
          if (!C) return null;
          const content = (
            <C
              ref={(el) => {
                CRefs.current[zoneName] = el;
              }}
              onSearch={handleChildSearch}
              onTabChange={handleChildTabChange}
              onActionPopup={handleChildActionPopup}
              onExport={handleChildExport}
              pagination={CRefs?.current?.table?.pagination}
              onPaginationChange={handleChildPaginationChange}
              item={ch}
              onDropChild={onDropChild}
              onPropChange={onPropChange}
              mode={mode}
              data={data}
              handleSetColumnConfig={handleSetColumnConfig}
            />
          );

          return (
            <ChildWrapper
              key={ch.id}
              draggable={mode === 'builder'}
              onDragStart={getDragStartHandler(ch)}
              onDragOver={getDragOverHandler(ch)}
              onDragLeave={getDragLeaveHandler(ch)}
              onDrop={getDropHandler(ch)}
              isBuilder={mode === 'builder'}
            >
              {mode === 'builder' ? (
                <ElementWrapper
                  item={ch}
                  onDelete={handleDelete}
                  onDragStart={getDragStartHandler(ch)}
                  onDragOver={getDragOverHandler(ch)}
                  onDragLeave={getDragLeaveHandler(ch)}
                  onDrop={getDropHandler(ch)}
                  disabledBorder
                >
                  {content}
                </ElementWrapper>
              ) : (
                content
              )}
            </ChildWrapper>
          );
        })}


      </>
    );
  };

  const handleSelectedIds = (ids) => {
    setSelectedIds(ids)
  }

  const handleOpenDeleteMulti = () => {
    CRefs.current.table?.handleOpenDeleteMulti(selectedIds);
  };

  return (
    <MainContainer>
      <SubtabContainer show={subtabChildren.length || mode === 'builder'}>
        <Box>
          {renderZone(subtabChildren, 'subtab')}
        </Box>
      </SubtabContainer>
      <SearchContainer show={searchChildren.length || mode === 'builder'}>
        <SearchContent>
          {renderZone(searchChildren, 'search')}
        </SearchContent>
      </SearchContainer>

      <ActionsContainer>
        <PaginationContent>
          {renderZone(paginationChildren, 'pagination')}
        </PaginationContent>

        <ActionButtonsContent>
          {selectedIds.length > 0 && <DeleteMultiButton variant="contained" onClick={handleOpenDeleteMulti}>
            <Tooltip>
              <DeleteIcon />
            </Tooltip>
          </DeleteMultiButton>}
          {renderZone(actionsChildren, 'action')}
        </ActionButtonsContent>
      </ActionsContainer>

      <TableContent
        onDragOver={handlePreventDefaultDragOver}
        onDrop={getDropNewItemHandler('table')}
      >
        {tableChildren.length > 0 ? (
          tableChildren.map((ch) => {
            const C = registry[ch.type]?.component;
            if (!C) return null;
            const content = (
              <C
                ref={(el) => {
                  CRefs.current['table'] = el;
                }}
                onSelectedIds={handleSelectedIds}
                item={ch}
                onDropChild={onDropChild}
                onPropChange={onPropChange}
                mode={mode}
                data={data}
                handleSetColumnConfig={handleSetColumnConfig}
              />
            );
            return (
              <ChildWrapper
                key={ch.id}
                isFlex={ch.props?.flex || '0 1 auto'}
                draggable={mode === 'builder'}
                onDragStart={getDragStartHandler(ch)}
                onDragOver={getDragOverHandler(ch)}
                onDragLeave={getDragLeaveHandler(ch)}
                onDrop={getDropHandler(ch)}
                isDraggingOver={dragOverId === ch.id}
                isBuilder={mode === 'builder'}
              >
                {mode === 'builder' ? (
                  <ElementWrapper
                    item={ch}
                    onDelete={handleDelete}
                    onDragStart={getDragStartHandler(ch)}
                    onDragOver={getDragOverHandler(ch)}
                    onDragLeave={getDragLeaveHandler(ch)}
                    onDrop={getDropHandler(ch)}
                    disabledBorder
                  >
                    {content}
                  </ElementWrapper>
                ) : (
                  content
                )}
              </ChildWrapper>
            );
          })
        ) : (
          <DropZone
            isBuilder={mode === 'builder'}
            // style={{ minHeight: 120, justifyContent: 'center' }}
          >
            {mode === 'builder' ? 'Kéo component vào vùng bảng' : null}
          </DropZone>
        )}
      </TableContent>
    </MainContainer>
  );
}

TableLayout.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string.isRequired,
    props: PropTypes.shape({
      direction: PropTypes.string,
      justifyContent: PropTypes.string,
      alignItems: PropTypes.string,
      gap: PropTypes.number,
      flex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      children: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          type: PropTypes.string.isRequired,
          props: PropTypes.object,
        })
      ),
    }),
  }).isRequired,
  onDropChild: PropTypes.func.isRequired,
  onPropChange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['builder', 'preview']),
  data: PropTypes.object,
  handleSetColumnConfig: PropTypes.func,
};

TableLayout.defaultProps = {
  mode: 'builder',
};