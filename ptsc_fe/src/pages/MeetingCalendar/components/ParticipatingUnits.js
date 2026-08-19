import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import {
  Grid,
  TextField,
  CircularProgress,
  Collapse,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
// import { useTheme } from "@mui/material/styles";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

import {
    DialogContainer,
    LeftPanel,
    RightPanel,
    TreeItemContainer,
    TreeItemLabel,
    ExpandIconButton,
    PanelContent,
    CenteredBox,
    StatusText,
    EmptyStateText,
    LeftPanelHeader,
    HeaderCol,
    RoleHeaderCol,
    RoleColumn,
    RoleCheckBox,
    SelectedTableContainer,
    SelectedTable,
    SelectedTh,
    SelectedThSTT,
    SelectedThRole,
    SelectedThAction,
    SelectedTd,
    SelectedTdCenter,
    SelectedTdSTT,
    RoleLabelBadge,
    ActionIconButton,
    PanelTitleHeader,
    SearchBarContainer,
    FooterActions,
    PrimaryButton,
    DangerButton,
    ParticipantName,
    StyledDialogReceivingUnit,
    StyledDialogTitle,
    StyledDialogContent,
    StyledMainGridContainer,
    SearchBoxWrapper,
    StyledSearchIcon,
    SearchErrorText,
    SearchStartAdornment,
    DuplicateWarningDialog,
    DuplicateWarningHeader,
    DuplicateWarningTitleBox,
    DuplicateWarningTitleInnerBox,
    DuplicateWarningTitleText,
    DuplicateWarningDescription,
    DuplicateWarningContent,
    DuplicateWarningListTitle,
    DuplicateParticipantList,
    DuplicateParticipantItem,
    DuplicateParticipantAvatarBox,
    DuplicateParticipantAvatar,
    DefaultAvatarCircle,
    WarningBadge,
    DuplicateParticipantInfo,
    DuplicateParticipantName,
    DuplicateParticipantMeetingInfo,
    DuplicateTag,
    DuplicateWarningInfoBox,
    DuplicateWarningInfoText,
    DuplicateWarningActions,
    DuplicateWarningCancelBtn,
    DuplicateWarningContinueBtn,
    DuplicateWarningIcon,
    DuplicateWarningIconSmall,
    DuplicateInfoIcon,
} from "@pages/MeetingCalendar/componentStyle/ParticipatingUnits.style";
import { getListUnitMeeting, getListUserUnitMeeting } from "@redux/slices/SharedCategory/managementUnitSlice";
import {
//   API_GET_LIST_USERS,
  API_EXTRA_INDUSTRY_UNIT,
  API_INTRA_INDUSTRY_UNIT,
  API_CHECK_DUPLICATE_PARTICIPANT,
} from "@EnvironmentFile/constants/urlConfig";

import api from "@services/api";
import { useWatch, useForm } from "react-hook-form";
import dayjs from "dayjs";
// import { useToast } from "@components/common/ToastProvider";
// import CustomAsyncAutoCompletes from "@components/CustomAsyncAutoCompletes"; // This was already here
// import api from "@services/api";

const removeDiacritics = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

const matchSearchTerm = (node, term) => {
  if (!term) return true;
  const cleanTerm = removeDiacritics(term);
  return (
    removeDiacritics(node.title || "").includes(cleanTerm) ||
    removeDiacritics(node.name || "").includes(cleanTerm) ||
    removeDiacritics(node.username || "").includes(cleanTerm) ||
    removeDiacritics(node.code || "").includes(cleanTerm) ||
    removeDiacritics(node.codeND || "").includes(cleanTerm)
  );
};

const hasVisibleNodes = (nodes, term) => {
  if (!term) return nodes.length > 0;
  return nodes.some(node => {
      const matchesSearch = matchSearchTerm(node, term);
      const childrenMatchSearch = node.children && node.children.length > 0 && hasVisibleNodes(node.children, term);
      const usersMatchSearch = node.users && node.users.length > 0 && node.users.some(user => 
        matchSearchTerm(user, term)
      );
      return matchesSearch || childrenMatchSearch || usersMatchSearch;
  });
};

// buildTree logic is now integrated into API/State so we can use it directly if it's already hierarchical.
// However, to keep compatibility with other tabs mapping to _id, we use id || _id.
const formatNodeId = (node) => node.id || node._id;

const CustomTreeItem = ({
  node,
  selectedUnits,
  onRoleToggle,
  searchTerm,
  level = 0,
  hideRoles = [],
  isProcessing = false,
  isDelegation = false,
  excludeUserIds = [],
  onExpandNode,
}) => {
  const isSearchActive = !!(searchTerm && searchTerm.trim().length >= 3);
  const [expanded, setExpanded] = useState(isSearchActive);
  const [loadingChild, setLoadingChild] = useState(false);
  const nodeId = formatNodeId(node);
  const hasSubUnits = node.children && node.children.length > 0;
  const hasUsers = node.users && node.users.length > 0;
  const hasChildren = isSearchActive 
    ? (hasSubUnits || hasUsers)
    : (!!node.hasChildren || hasSubUnits || hasUsers);
  
  const currentSelection = selectedUnits[nodeId] || { roles: {} };

  const matchesSearch = !searchTerm || matchSearchTerm(node, searchTerm);

  const childrenAndUsersMatchSearch = (nodeToCheck) => {
    const subUnitsMatch = nodeToCheck.children?.some(
      (child) =>
        matchSearchTerm(child, searchTerm) ||
        childrenAndUsersMatchSearch(child)
    );
    const usersMatch = nodeToCheck.users?.some(
      (user) =>
        matchSearchTerm(user, searchTerm)
    );
    return !!subUnitsMatch || !!usersMatch;
  };

  const shouldShow = matchesSearch || childrenAndUsersMatchSearch(node);

  useEffect(() => {
    if (isSearchActive) {
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }, [isSearchActive]);

  if (!shouldShow) return null;

  const handleExpandClick = async (e) => {
    e.stopPropagation();
    if (hasChildren) {
      const isAlreadyLoaded = node.isLoaded || hasSubUnits || hasUsers;
      if (!expanded && !isSearchActive && !isAlreadyLoaded && onExpandNode) {
        setLoadingChild(true);
        try {
          await onExpandNode(nodeId);
        } catch (err) {
          logger.error("Failed to load child nodes:", err);
        } finally {
          setLoadingChild(false);
        }
      }
      setExpanded(!expanded);
    }
  };

  const handleRoleClick = (role) => (e) => {
    e.stopPropagation();
    // Prevent selecting disabled users in delegation mode
    if (isDelegation && excludeUserIds?.length > 0 && node.types === 'user') {
      const nodeId = formatNodeId(node);
      if (excludeUserIds.includes(nodeId)) {
        return; // Don't allow toggling for disabled user
      }
    }
    onRoleToggle(node, role);
  };

  return (
    <Box>
      <TreeItemContainer level={level}>
        <ExpandIconButton
          onClick={handleExpandClick}
          hasChildren={hasChildren}
        >
          {loadingChild ? (
            <CircularProgress size={16} />
          ) : expanded ? (
            <ExpandMoreIcon />
          ) : (
            <ChevronRightIcon />
          )}
        </ExpandIconButton>
        
        <TreeItemLabel
          variant="body2"
          onClick={handleExpandClick}
          isUser={node.types === 'user'}
        >
          { node.title || node.name }
        </TreeItemLabel>
        <>
            {!hideRoles.includes('chair') && (
              <RoleColumn>
                <RoleCheckBox
                  checked={!!currentSelection.roles?.chair}
                  onChange={handleRoleClick('chair')}
                  disabled={node.types !== 'user' || (node.types === 'user' && currentSelection.isNotParticipant === true)}
                />
              </RoleColumn>
            )}
            {!hideRoles.includes('secretary') && (
              <RoleColumn>
                <RoleCheckBox
                  checked={!!currentSelection.roles?.secretary}
                  onChange={handleRoleClick('secretary')}
                  disabled={(node.types !== 'user' && node.types !== 'organization_unit') || (node.types === 'user' && currentSelection.isNotParticipant === true)}
                />
              </RoleColumn>
            )}
            {!hideRoles.includes('participant') && (
              <RoleColumn>
                <RoleCheckBox
                  checked={!!currentSelection.roles?.participant}
                  onChange={handleRoleClick('participant')}
                  disabled={
                    (isProcessing && node.types === 'user' && (!!currentSelection.roles?.chair || !!currentSelection.roles?.secretary)) || 
                    (isDelegation && node.types !== 'user') ||
                    (isDelegation && excludeUserIds?.length > 0 && node.types === 'user' && excludeUserIds.includes(formatNodeId(node))) ||
                    (node.types === 'user' && currentSelection.isNotParticipant === true)
                  }
                />
              </RoleColumn>
            )}
          </>
      </TreeItemContainer>
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {/* Render Sub Units */}
          {node.children?.map((childNode) => (
            <CustomTreeItem
              key={formatNodeId(childNode)}
              node={childNode}
              selectedUnits={selectedUnits}
              onRoleToggle={onRoleToggle}
              searchTerm={searchTerm}
              level={level + 1}
              hideRoles={hideRoles}
              isProcessing={isProcessing}
              isDelegation={isDelegation}
              excludeUserIds={excludeUserIds}
              onExpandNode={onExpandNode}
            />
          ))}
          {/* Render Users within this unit */}
          {node.users?.map((user) => (
            <CustomTreeItem
              key={formatNodeId(user)}
              node={{
                ...user,
                parent: nodeId,
                parentName:  node.title || node.name,
                unitName: node.title || node.name,
                types: 'user' // Ensure it's marked as user
              }}
              selectedUnits={selectedUnits}
              onRoleToggle={onRoleToggle}
              searchTerm={searchTerm}
              level={level + 1}
              hideRoles={hideRoles}
              isProcessing={isProcessing}
              isDelegation={isDelegation}
              excludeUserIds={excludeUserIds}
              onExpandNode={onExpandNode}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

const SelectedMemberRow = ({ item, index, onRemove, isDelegation = false }) => {
  const itemId = formatNodeId(item);
  const handleRemove = React.useCallback(() => {
    onRemove(itemId);
  }, [itemId, onRemove]);

  return (
    <tr>
      <SelectedTdSTT>{index + 1}</SelectedTdSTT>
      <SelectedTd>
        <ParticipantName isUser={item.types === 'user'}>
          { item.title || item.name}
        </ParticipantName>
      </SelectedTd>
      <SelectedTdCenter>
        {item.roles?.chair && <RoleLabelBadge roleType="chair">Người chủ trì</RoleLabelBadge>}
        {item.roles?.secretary && <RoleLabelBadge roleType="secretary">Thư ký cuộc họp</RoleLabelBadge>}
        {item.roles?.participant && <RoleLabelBadge roleType="participant">{isDelegation ? 'Tham dự (Ủy quyền)' : 'Tham dự'}</RoleLabelBadge>}
      </SelectedTdCenter>
      <SelectedTdCenter>
        <ActionIconButton onClick={handleRemove} disabled={item.isNotParticipant === true}>
          <DeleteIcon />
        </ActionIconButton>
      </SelectedTdCenter>
    </tr>
  );
};

SelectedMemberRow.propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onRemove: PropTypes.func.isRequired,
  isDelegation: PropTypes.bool,
};

CustomTreeItem.propTypes = {
  node: PropTypes.object.isRequired,
  selectedUnits: PropTypes.object.isRequired,
  onRoleToggle: PropTypes.func.isRequired,
  searchTerm: PropTypes.string,
  level: PropTypes.number,
  hideRoles: PropTypes.array,
  isProcessing: PropTypes.bool,
  isDelegation: PropTypes.bool,
  excludeUserIds: PropTypes.array,
};

const ParticipatingUnits = ({
  open,
  onClose,
  onSave,
  onContinueAndSubmit,
  dialogKey,
  initialSelectedUnits = [],
  isProcessing = false,
  control,
  hideRoles = [],
  excludeMeetingId = null,
  isDelegation = false,
  excludeUserIds = [],
}) => {
  const dispatch = useDispatch();
  // const toast = useToast();
  //   const theme = useTheme();

  // Create a default form control if none is provided (for use outside form context)
  const { control: defaultControl } = useForm({
    defaultValues: {
      meetingDate: null,
      startTime: null,
      endTime: null,
    }
  });
  
  // Use provided control or default control
  const formControl = control || defaultControl;

  // Now we can safely use useWatch with a valid control
  const meetingDate = useWatch({ control: formControl, name: "meetingDate" });
  const startTime = useWatch({ control: formControl, name: "startTime" });
  const endTime = useWatch({ control: formControl, name: "endTime" });

  const { units, isLoading } = useSelector((state) => {
    const managementUnit = state.unit || {};

    return {
      units: managementUnit.listUnit || [],
      isLoading: managementUnit.loading || false,
    };
  });

  const [localUnits, setLocalUnits] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const isTargetTab = (dialogKey === "internalUnit" || dialogKey === "internalReceivingDept") && !isProcessing;
  const finalUnits = isTargetTab ? localUnits : ((dialogKey === "internalUnit" || dialogKey === "internalReceivingDept") ? units : localUnits);
  const finalLoading = isTargetTab ? localLoading : ((dialogKey === "internalUnit" || dialogKey === "internalReceivingDept") ? isLoading : localLoading);

  const [selectedUnits, setSelectedUnits] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState("");
  // const [selectAllDonVi, setSelectAllDonVi] = useState(false);

  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicateParticipants, setDuplicateParticipants] = useState([]);

  const handleCloseDuplicateWarning = React.useCallback(() => {
    setDuplicateWarningOpen(false);
  }, []);

  const fetchRootUnits = React.useCallback(async () => {
    setLocalLoading(true);
    try {
      const response = await api.get('/api/meeting-schedule/organization-units');
      setLocalUnits(response?.data?.data || []);
    } catch (error) {
      logger.error("Failed to fetch root units:", error);
      setLocalUnits([]);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const updateNodeInTree = React.useCallback((nodes, targetId, updatedChildren, updatedUsers) => {
    return nodes.map(node => {
      const nodeId = node.id || node._id;
      if (nodeId === targetId) {
        return {
          ...node,
          children: updatedChildren,
          users: updatedUsers,
          isLoaded: true
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetId, updatedChildren, updatedUsers)
        };
      }
      return node;
    });
  }, []);

  const handleExpandNode = React.useCallback(async (nodeId) => {
    try {
      const response = await api.get('/api/meeting-schedule/organization-units', {
        params: { parentId: nodeId }
      });
      const childrenRaw = response?.data?.data || [];
      const childrenNodes = [];
      const userNodes = [];

      childrenRaw.forEach(item => {
        if (item.types === 'user') {
          userNodes.push(item);
        } else {
          childrenNodes.push({
            ...item,
            children: [],
            users: [],
            isLoaded: false
          });
        }
      });

      setLocalUnits(prevUnits => updateNodeInTree(prevUnits, nodeId, childrenNodes, userNodes));
    } catch (error) {
      logger.error("Failed to load child nodes:", error);
    }
  }, [updateNodeInTree]);

  useEffect(() => {
    if (!open) return;
    if (open) {
      const fetchAgencies = async (url) => {
        setLocalLoading(true);
        try {
          const response = await api.get(url);
          setLocalUnits(response?.data?.data || []);
        } catch (error) {
          logger.error("Failed to fetch agencies:", error);
          setLocalUnits([]);
        } finally {
          setLocalLoading(false);
        }
      };

      if (dialogKey === "internalUnit" || dialogKey === "internalReceivingDept") {
        if (isProcessing) {
          dispatch(getListUserUnitMeeting({ page: 1, limit: 500 }));
        } else {
          if (isTargetTab) {
            fetchRootUnits();
          } else {
            dispatch(getListUnitMeeting({ page: 1, limit: 500 }));
          }
        }
      } else if (dialogKey === "externalDepartment") {
        fetchAgencies(API_EXTRA_INDUSTRY_UNIT);
      } else if (dialogKey === "internalDepartment") {
        fetchAgencies(API_INTRA_INDUSTRY_UNIT);
      }

      let map = {};

      if (initialSelectedUnits.length > 0) {
        initialSelectedUnits.forEach((u) => {
          const uId = formatNodeId(u);
          if (uId) {
            // Enforce role exclusivity on load (except for organization units)
            const roles = u.roles || {};
            let cleanRoles = {};
            
            if (u.types === 'organization_unit' || u.type === 'organization_unit') {
              cleanRoles = { ...roles };
            } else {
              if (roles.chair) cleanRoles = { chair: true };
              else if (roles.secretary) cleanRoles = { secretary: true };
              else if (roles.participant) cleanRoles = { participant: true };
            }
            
            map[uId] = { ...u, roles: cleanRoles };
          }
        });
      }

      // setSelectedUnits({});
      setSelectedUnits(map);
      setSearchTerm("");
      setSearchError("");
    } else {
      setSelectedUnits({});
      setLocalUnits([]);
    }
  }, [open, dialogKey, dispatch, initialSelectedUnits, isProcessing, isTargetTab, fetchRootUnits]);

  // Quản lý debounce search và gọi API khi search >= 3 ký tự
  useEffect(() => {
    if (!open || !isTargetTab) return;

    const trimmed = searchTerm.trim();
    if (trimmed.length >= 3) {
      const delayDebounce = setTimeout(async () => {
        setLocalLoading(true);
        try {
          const response = await api.get('/api/meeting-schedule/organization-units', {
            params: { search: trimmed }
          });
          setLocalUnits(response?.data?.data || []);
        } catch (error) {
          logger.error("Failed to search units:", error);
          setLocalUnits([]);
        } finally {
          setLocalLoading(false);
        }
      }, 500);

      return () => clearTimeout(delayDebounce);
    } else {
      // Khi reset hoặc không nhập đủ ký tự, tải lại các root node
      const delayDebounce = setTimeout(async () => {
        fetchRootUnits();
      }, 300);

      return () => clearTimeout(delayDebounce);
    }
  }, [searchTerm, open, isTargetTab, fetchRootUnits]);

  const unitTree = useMemo(() => {
    if (!Array.isArray(finalUnits) || finalUnits.length === 0) {
      return [];
    }
    // Dữ liệu từ API getListUnitMeeting đã là dạng cây (với children và users lồng nhau)
    return finalUnits;
  }, [finalUnits]);

  const visibleNodesExist = useMemo(() => {
    if (!unitTree.length) return false;
    return hasVisibleNodes(unitTree, searchTerm);
  }, [unitTree, searchTerm]);

//   const getAllDescendants = (node) => {
//     let descendants = [node];
//     if (node.children && node.children.length > 0) {
//       node.children.forEach((child) => {
//         descendants = [...descendants, ...getAllDescendants(child)];
//       });
//     }
//     return descendants;
//   };

  // const getAllUnitsFlat = (nodes) => {
  //   let allUnits = [];
  //   nodes.forEach((node) => {
  //     allUnits = [...allUnits, ...getAllDescendants(node)];
  //   });
  //   return allUnits;
  // };

  // useEffect(() => {
  //   const allUnits = getAllUnitsFlat(unitTree);
  //   const rootUnits = allUnits.filter((u) => !u.parent);

  //   const allSelected =
  //     rootUnits.length > 0 && rootUnits.every((u) => selectedUnits[u._id]);

  //   setSelectAllDonVi(allSelected);
  // }, [selectedUnits, unitTree]);

  const handleRoleToggle = (node, role) => {
    setSelectedUnits((prev) => {
      const newSelected = { ...prev };
      const nodeId = formatNodeId(node);
      const isCurrentlySelected = !!newSelected[nodeId]?.roles?.[role];

      // Nếu đang muốn chọn (toggle từ off sang on)
      if (!isCurrentlySelected) {
        // DELEGATION MODE: Chỉ cho phép chọn 1 người duy nhất
        if (isDelegation) {
          // Xóa tất cả selections trước đó
          Object.keys(newSelected).forEach((id) => {
            delete newSelected[id];
          });
          
          // Chỉ gán người mới được chọn
          newSelected[nodeId] = {
            ...node,
            roles: { [role]: true },
          };
          
          return newSelected;
        }

        // 1. Xử lý tính duy nhất toàn cuộc họp cho 'chair' và 'secretary' (Chỉ có 1 người chủ trì, 1 thư ký)
        if (role === "chair" || role === "secretary") {
          Object.keys(newSelected).forEach((id) => {
            if (newSelected[id].roles?.[role]) {
              const updatedRoles = { ...newSelected[id].roles };
              delete updatedRoles[role];

              if (Object.values(updatedRoles).some((val) => val)) {
                newSelected[id] = { ...newSelected[id], roles: updatedRoles };
              } else {
                delete newSelected[id];
              }
            }
          });
        }

        // 2. Gán role mới cho node
        const current = newSelected[nodeId] || { ...node };
        const newRoles = node.types === 'organization_unit' 
            ? { ...current.roles, [role]: true } 
            : { [role]: true };
            
        newSelected[nodeId] = {
          ...current,
          roles: newRoles,
          isNotParticipant: current.isNotParticipant // preserve status
        };
      } else {
        // Nếu đang muốn bỏ chọn (toggle từ on sang off)
        const current = newSelected[nodeId];
        const updatedRoles = { ...current.roles };
        delete updatedRoles[role];

        if (Object.values(updatedRoles).some((val) => val)) {
          newSelected[nodeId] = { ...current, roles: updatedRoles };
        } else {
          delete newSelected[nodeId];
        }
      }

      return newSelected;
    });
  };

  const handleRemoveItem = (id) => {
    setSelectedUnits(prev => {
      const newSelected = { ...prev };
      delete newSelected[id];
      return newSelected;
    });
  };

  const handleSave = async () => {
    const results = Object.values(selectedUnits);

    // if (!isProcessing && !isDelegation) {
    //   const isChairRequired = !hideRoles.includes('chair');
    //   const isSecretaryRequired = !hideRoles.includes('secretary');
      
    //   const hasChair = results.some(u => u.roles?.chair);
    //   const hasSecretary = results.some(u => u.roles?.secretary);
    //   const hasParticipant = results.some(u => u.roles?.participant);

    //   // if ((isChairRequired && !hasChair) || (isSecretaryRequired && !hasSecretary) || !hasParticipant) {
    //   //     toast("Lưu ý: Vui lòng gán đủ thành phần tham gia", "warning");
    //   //     return;
    //   // }
    // }
    
    // Extract User IDs to check for duplication
    // Check chair, secretary, and participants (users only)
    const userIdsToCheck = new Set();
    
    results.forEach(item => {
        // If it's a user object directly
        if (item.types === 'user' || item.type === 'user' || item.username) { 
             const id = item.id || item._id;
             // Exclude chair and secretary from duplicate check in processing mode
             if (isProcessing && (item.roles?.chair || item.roles?.secretary)) return;
             if (id) userIdsToCheck.add(id);
        }
        // If it's a unit, we might not need to check the unit itself for schedule conflict, 
        // but if the selection implies specific users (like 'chair' or 'secretary' roles assigned to a person inside a unit structure?? 
        // Actually the current structure flattens users as nodes).
        
        // Based on `CustomTreeItem`, users are nodes with `types: 'user'`. 
        // So checking `item.types === 'user'` should be sufficient.
    });

    if (userIdsToCheck.size > 0 && meetingDate && startTime && endTime) {
        const payload = {
            meetingDate: dayjs(meetingDate).format("YYYY-MM-DD"),
            meetingTime: `${dayjs(startTime).format("HH:mm")}-${dayjs(endTime).format("HH:mm")}`,
            userIds: Array.from(userIdsToCheck),
            excludeMeetingId: excludeMeetingId || undefined
        };

        try {
            const response = await api.post(API_CHECK_DUPLICATE_PARTICIPANT, payload);
            if (response && response.data && !response.data.success) {
                 setDuplicateParticipants(response.data.data || []);
                 setDuplicateWarningOpen(true);
                 return; // Stop save if duplicate
            }
        } catch (error) {
             if (error?.response?.data?.success === false && error?.response?.data?.data) {
                 setDuplicateParticipants(error.response.data.data);
                 setDuplicateWarningOpen(true);
                 return;
             }
             // For other errors, log or toast if necessary
        }
    }

    onSave(results);
    onClose();
  };

  const handleContinueSave = () => {
    setDuplicateWarningOpen(false);
    const results = Object.values(selectedUnits);
    if (typeof onContinueAndSubmit === 'function') {
      onContinueAndSubmit(results);
    } else {
      onSave(results, 'submit');
    }
    onClose();
  };

  // const handleSearch = () => {
  //   // Search is handled in CustomTreeItem
  // };

  const handleSearchTermChange = (event) => {
    const value = event.target.value;

    // Ngăn khoảng trắng ở đầu chuỗi
    if (value.length > 0 && value.trimStart() !== value) {
      return;
    }

    // Validate: không vượt quá 500 ký tự
    if (value.length > 500) {
      setSearchError("Lưu ý : Vui lòng nhập nội dung không vượt quá 500 ký tự");
      return;
    }

    // Validate: không cho chỉ nhập khoảng trắng
    if (value.length > 0 && value.trim() === "") {
      setSearchError("Từ khóa tìm kiếm không được chỉ chứa khoảng trắng");
      setSearchTerm(value);
      return;
    }

    setSearchError("");
    setSearchTerm(value);
  };

  const handleSearchBlur = () => {
    // Trim khoảng trắng ở cuối chuỗi khi rời focus
    const trimmed = searchTerm.trim();
    if (trimmed !== searchTerm) {
      setSearchTerm(trimmed);
      setSearchError("");
    }
  };

//   const handleToggleLeftPanel = () => {
//     setLeftPanelOpen(!leftPanelOpen);
//     setRightPanelOpen(leftPanelOpen); // Mở ô phải nếu ô trái sắp bị đóng
//   };

//   const handleToggleRightPanel = () => {
//     setRightPanelOpen(!rightPanelOpen);
//     setLeftPanelOpen(rightPanelOpen); // Mở ô trái nếu ô phải sắp bị đóng
//   };

  return (
    <StyledDialogReceivingUnit open={open} onClose={onClose}>
      <DialogContainer>
        <StyledDialogTitle>CHỌN ĐƠN VỊ, CÁ NHÂN THAM GIA CUỘC HỌP</StyledDialogTitle>
        <StyledDialogContent>
          <StyledMainGridContainer container>
            {/* Left Panel */}
            <Grid item xs={12} lg={6}>
              <LeftPanel>
                <SearchBarContainer>
                  <SearchBoxWrapper>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Tìm kiếm đơn vị, cá nhân"
                      value={searchTerm}
                      onChange={handleSearchTermChange}
                      onBlur={handleSearchBlur}
                      size="small"
                      error={!!searchError}
                      InputProps={{
                        startAdornment: (
                          <SearchStartAdornment>
                            <StyledSearchIcon
                              as={SearchIcon}
                              hasError={!!searchError}
                            />
                          </SearchStartAdornment>
                        ),
                      }}
                    />
                    {searchError && (
                      <SearchErrorText variant="caption">
                        {searchError}
                      </SearchErrorText>
                    )}
                  </SearchBoxWrapper>
                </SearchBarContainer>
                
                <LeftPanelHeader>
                  <HeaderCol>Tên đơn vị, cá nhân</HeaderCol>
                  {!hideRoles.includes('chair') && <RoleHeaderCol>Người chủ trì</RoleHeaderCol>}
                  {!hideRoles.includes('secretary') && <RoleHeaderCol>Thư ký</RoleHeaderCol>}
                  {!hideRoles.includes('participant') && <RoleHeaderCol>Tham dự</RoleHeaderCol>}
                </LeftPanelHeader>

                <PanelContent>
                  {finalLoading ? (
                    <CenteredBox>
                      <CircularProgress />
                    </CenteredBox>
                  ) : !visibleNodesExist ? (
                    <CenteredBox>
                      <StatusText>Không có dữ liệu</StatusText>
                    </CenteredBox>
                  ) : (
                    unitTree.map((node) => (
                      <CustomTreeItem
                        key={formatNodeId(node)}
                        node={node}
                        selectedUnits={selectedUnits}
                        onRoleToggle={handleRoleToggle}
                        searchTerm={searchTerm}
                        hideRoles={hideRoles}
                        isProcessing={isProcessing}
                        isDelegation={isDelegation}
                        excludeUserIds={excludeUserIds}
                        onExpandNode={handleExpandNode}
                      />
                    ))
                  )}
                </PanelContent>
              </LeftPanel>
            </Grid>

            {/* Right Panel */}
            <Grid item xs={12} lg={6}>
              <RightPanel>
                <PanelTitleHeader>{isDelegation ? 'Người được ủy quyền' : 'Danh sách tham dự cuộc họp'}</PanelTitleHeader>
                
                <SelectedTableContainer>
                  <SelectedTable>
                    <thead>
                      <tr>
                        <SelectedThSTT>STT</SelectedThSTT>
                        <SelectedTh>Tên đơn vị/ phòng ban/ cá nhân</SelectedTh>
                        <SelectedThRole>Vai trò</SelectedThRole>
                        <SelectedThAction>Bỏ chọn</SelectedThAction>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let results = Object.values(selectedUnits);
                        results = results.filter(item => {
                          if (item.types === 'guest_group' || item.id === 'GUEST_GROUP' || item.isNotParticipant === true) return false;
                          
                          // If unit is room-only, hide it unless it has a role selected
                          if (item.isRoomSelected === false) {
                            const roles = item.roles || {};
                            return !!(roles.chair || roles.secretary || roles.participant);
                          }
                          return true;
                        });

                        // Filter results in processing mode: only show items with roles that aren't hidden
                        if (isProcessing) {
                          results = results.filter(item => {
                            const roles = item.roles || {};
                            {/* const hasRoles = Object.values(roles).some(v => v); */}
                            
                            // Determine which roles are editable (not in hideRoles)
                            const isChairEditable = !hideRoles.includes('chair');
                            const isSecretaryEditable = !hideRoles.includes('secretary');
                            const isParticipantEditable = !hideRoles.includes('participant');

                            // Check if item has any editable role assigned
                            const hasEditableRole = (roles.chair && isChairEditable) || 
                                                    (roles.secretary && isSecretaryEditable) || 
                                                    (roles.participant && isParticipantEditable);

                            if (item.types === 'organization_unit') {
                              // Only show units if they explicitly have an editable role (like secretary unit)
                              return hasEditableRole;
                            }

                            // For users/people, show if they have at least one editable role
                            return hasEditableRole;
                          });
                        }

                        if (results.length === 0) {
                          return (
                            <tr>
                              <SelectedTdCenter colSpan={4}>
                                <EmptyStateText variant="body2">
                                  Chưa có thành viên nào tham gia
                                </EmptyStateText>
                              </SelectedTdCenter>
                            </tr>
                          );
                        }

                        // SORT RESULTS: Chair first, then Secretary, then others
                        const sortedResults = [...results].sort((a, b) => {
                          if (a.roles?.chair) return -1;
                          if (b.roles?.chair) return 1;
                          if (a.roles?.secretary) return -1;
                          if (b.roles?.secretary) return 1;
                          return 0;
                        });

                        return sortedResults.map((item, index) => (
                          <SelectedMemberRow
                            key={formatNodeId(item)}
                            item={item}
                            index={index}
                            onRemove={handleRemoveItem}
                            isDelegation={isDelegation}
                          />
                        ));
                      })()}
                    </tbody>
                  </SelectedTable>
                </SelectedTableContainer>
              </RightPanel>
            </Grid>
          </StyledMainGridContainer>
        </StyledDialogContent>
        <FooterActions>
          <PrimaryButton onClick={handleSave}>LƯU</PrimaryButton>
          <DangerButton onClick={onClose}>ĐÓNG</DangerButton>
        </FooterActions>
      </DialogContainer>

      <DuplicateWarningDialog 
        open={duplicateWarningOpen} 
        onClose={handleCloseDuplicateWarning}
      >
        <DuplicateWarningHeader>
          <DuplicateWarningTitleBox>
            <DuplicateWarningTitleInnerBox>
              <DuplicateWarningIcon />
              <DuplicateWarningTitleText>Cảnh báo trùng lịch</DuplicateWarningTitleText>
            </DuplicateWarningTitleInnerBox>
          </DuplicateWarningTitleBox>
          <DuplicateWarningDescription>
            Một số thành viên đã có lịch họp khác vào thời gian này. Bạn có muốn tiếp tục gán lịch? Người tham gia sẽ nhận được thông báo để xác nhận hoặc ủy quyền sau.
          </DuplicateWarningDescription>
        </DuplicateWarningHeader>
        <DuplicateWarningContent>
          <DuplicateWarningListTitle>
            DANH SÁCH THÀNH VIÊN BỊ TRÙNG LỊCH ({duplicateParticipants.length})
          </DuplicateWarningListTitle>
          <DuplicateParticipantList>
            {duplicateParticipants.map((participant, index) => (
              <DuplicateParticipantItem key={index}>
                <DuplicateParticipantAvatarBox>
                  {participant.avatar ? (
                    <DuplicateParticipantAvatar src={participant.avatar} alt={participant.userName} />
                  ) : (
                    <DefaultAvatarCircle>
                      {(participant.userName || "?").charAt(0).toUpperCase()}
                    </DefaultAvatarCircle>
                  )}
                  <WarningBadge>
                    <DuplicateWarningIconSmall />
                  </WarningBadge>
                </DuplicateParticipantAvatarBox>
                <DuplicateParticipantInfo>
                  <DuplicateParticipantName>{participant.userName}</DuplicateParticipantName>
                  <DuplicateParticipantMeetingInfo>
                    {participant.meetingName} — {participant.meetingTime}
                  </DuplicateParticipantMeetingInfo>
                </DuplicateParticipantInfo>
                <DuplicateTag>
                  TRÙNG LẶP
                </DuplicateTag>
              </DuplicateParticipantItem>
            ))}
          </DuplicateParticipantList>
          <DuplicateWarningInfoBox>
            <DuplicateInfoIcon />
            <DuplicateWarningInfoText>
              Lưu ý: Việc gán lịch vẫn sẽ gửi lời mời họp. Người tham gia có thể từ chối và đề xuất thời gian khác nếu họ không thể sắp xếp công việc hiện tại.
            </DuplicateWarningInfoText>
          </DuplicateWarningInfoBox>
        </DuplicateWarningContent>
        <DuplicateWarningActions>
          <DuplicateWarningCancelBtn onClick={handleCloseDuplicateWarning}>
            Kiểm tra lại
          </DuplicateWarningCancelBtn>
          <DuplicateWarningContinueBtn onClick={handleContinueSave}>
            Tiếp tục và Trình duyệt &rarr;
          </DuplicateWarningContinueBtn>
        </DuplicateWarningActions>
      </DuplicateWarningDialog>
    </StyledDialogReceivingUnit>
  );
};

ParticipatingUnits.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onContinueAndSubmit: PropTypes.func,
  hideRoles: PropTypes.array,
  excludeMeetingId: PropTypes.string,
  excludeUserIds: PropTypes.array,
};

export default ParticipatingUnits;
