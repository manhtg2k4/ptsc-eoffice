import React, { useCallback } from "react";
import { Box, Collapse } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import {
  MemberSection,
  SectionLabel,
  MemberItem,
  MemberInfo,
  MemberName,
  MemberRoleText,
  AssignedBadge,
  GroupContainer,
  GroupHeader,
  GroupTitle,
  GroupStats,
  StyledCheckbox,
  GroupCheckbox,
  GroupHeaderContent,
  GroupTitleWrapper,
  GroupAssignedBadge,
  EmptyStateWrapper,
  StyledModalSubTitle,
  StyledModalContent,
} from "@pages/MeetingCalendar/componentStyle/RegisterForMeetingRooms.style";

const MemberRow = React.memo(({ member, selected, assigned, onSelect, meetingRole }) => {
  const handleClick = useCallback(() => {
    if (!assigned && member.types !== 'organization_unit') {
      onSelect(member.id || member._id);
    }
  }, [assigned, member, onSelect]);

  const handleCheckboxClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleChange = useCallback(() => {
    // onSelect is already called by handleCheckboxClick if we add it there, 
    // or we can let the row click handle it if we don't stop propagation.
    // However, it's safer to stop propagation of click on the checkbox itself.
    onSelect(member.id || member._id);
  }, [member, onSelect]);

  const displayName = member.title || member.name || member.guestName;
  const displayPosition = member.position || member.guestTitle || member.parentName || (member.types === 'organization_unit' ? 'Đơn vị' : '---');

  return (
    <MemberItem 
      selected={selected} 
      assigned={assigned}
      onClick={handleClick}
      // style={{ cursor: (assigned || member.types === 'organization_unit') ? 'default' : 'pointer' }}
    >
      <MemberInfo>
        <MemberName assigned={assigned}>
          {displayName}
        </MemberName>
        <MemberRoleText>{displayPosition} • {meetingRole || "Tham dự"}</MemberRoleText>
      </MemberInfo>
      {assigned ? (
        <AssignedBadge>Đã gán vị trí</AssignedBadge>
      ) : member.types === 'organization_unit' ? null : (
        <StyledCheckbox 
          checked={selected} 
          onClick={handleCheckboxClick}
          onChange={handleChange}
        />
      )}
    </MemberItem>
  );
});

MemberRow.displayName = "MemberRow";

const GroupRow = React.memo(({ group, expanded, onToggle, selectedMemberId, onSelectMember, seatMapping, seatLabel }) => {
  const handleToggle = useCallback(() => {
    onToggle(group.id);
  }, [group.id, onToggle]);

  const isAssigned = useCallback((item) => {
    // Determine if it's a unit based on types or a custom isUnit property (used in group objects)
    const isUnit = item.types === 'organization_unit' || item.isUnit === true;

    // For individuals, check if they are assigned ANYWHERE (across all rooms/seats)
    if (!isUnit) {
      return !!item.seatNumber;
    }
    
    // For units, only consider it "assigned" if it's assigned to the SPECIFIC current seat
    // This allows the unit to appear selectable (showing a checkbox) for other seats/rooms.
    return (seatMapping[seatLabel]?.id || seatMapping[seatLabel]?._id) === (item.id || item._id);
  }, [seatMapping, seatLabel]);

  const assignedCount = React.useMemo(() => {
    // Count how many seats are assigned to this UNIT itself
    return Object.values(seatMapping).filter(assm => 
      assm.types === 'organization_unit' && (assm.id || assm._id) === group.id
    ).length || 0;
  }, [group.id, seatMapping]);

  const handleUnitSelect = useCallback((e) => {
    e.stopPropagation();
    onSelectMember(group.id);
  }, [group.id, onSelectMember]);

  const isUnitAssigned = isAssigned(group);
  const isUnitSelected = selectedMemberId === group.id;

  return (
    <GroupContainer>
      <GroupHeader onClick={handleToggle}>
        <GroupHeaderContent>
          <GroupTitleWrapper>
            <GroupTitle>{group.name}</GroupTitle>
            <GroupStats>Vị trí đã gán : {assignedCount}</GroupStats>
          </GroupTitleWrapper>
          {group.canAssignUnit && (
            isUnitAssigned ? (
              <GroupAssignedBadge>Đã gán vị trí</GroupAssignedBadge>
            ) : (
              <GroupCheckbox 
                checked={isUnitSelected}
                onClick={handleUnitSelect}
              // onChange={handleUnitSelect}
              />
            )
          )}
        </GroupHeaderContent>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </GroupHeader>
      <Collapse in={expanded}>
        <Box p={2} pt={0}>
          {group.members?.map((member) => (
            <MemberRow 
              key={member.id || member._id} 
              member={member}
              assigned={isAssigned(member)}
              selected={selectedMemberId === (member.id || member._id)}
              onSelect={onSelectMember}
              meetingRole="Tham dự"
            />
          ))}
        </Box>
      </Collapse>
    </GroupContainer>
  );
});

GroupRow.displayName = "GroupRow";

const AssignSeatModal = ({ open, onClose, seatLabel, roomName, attendanceData = [], onAssign, seatMapping = {}, sharedComponents }) => {
  const { Dialog } = sharedComponents;
  const [selectedMemberId, setSelectedMemberId] = React.useState(null);
  const [expandedGroups, setExpandedGroups] = React.useState([]);

  // CATEGORIZE DATA
  const chairman = React.useMemo(() => attendanceData.find(u => u.roles?.chair), [attendanceData]);
  const secretary = React.useMemo(() => attendanceData.find(u => u.roles?.secretary), [attendanceData]);
  
  const attendanceGroups = React.useMemo(() => {
    const groups = {};
    
    // First pass: identify all units/guest groups
    attendanceData.forEach(item => {
      const isUnit = item.types === 'organization_unit';
      const isGuestGroup = item.types === 'guest_group';

      if (isUnit || isGuestGroup) {
        const uId = isGuestGroup ? 'GUEST_GROUP' : (item.id || item._id);
        const name = isGuestGroup ? 'Khách mời' : (item.name || item.title);

        if (!groups[uId]) {
          groups[uId] = { 
            id: uId, 
            name: name, 
            members: [], 
            isUnit: true,
            canAssignUnit: false // Disable assignment for units/groups
          };
        }
      }
    });

    // Second pass: add members to their respective groups
    attendanceData.forEach(item => {
      if (!item.roles?.participant || item.roles?.chair || item.roles?.secretary) return;

      const isUnit = item.types === 'organization_unit';
      const isGuestGroup = item.types === 'guest_group';
      
      if (isUnit) return;

      if (isGuestGroup) {
        const uId = 'GUEST_GROUP';
        if (!groups[uId]) {
          groups[uId] = { 
            id: uId, 
            name: 'Khách mời', 
            members: [], 
            isUnit: true,
            canAssignUnit: false
          };
        }
        if (item.members && Array.isArray(item.members)) {
          item.members.forEach(member => {
            groups[uId].members.push({
              ...member,
              parent: uId,
              parentName: 'Khách mời'
            });
          });
        }
        return;
      }

      const uId = item.parent || 'other';
      const uName = item.parentName || item.unitName || item.name || item.title || "Khác";
      
      if (!groups[uId]) {
        groups[uId] = { 
          id: uId, 
          name: uName, 
          members: [], 
          isUnit: false,
          canAssignUnit: false
        };
      }
      
      groups[uId].members.push(item);
    });

    return Object.values(groups).filter(g => g.members.length > 0 || g.canAssignUnit);
  }, [attendanceData]);

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  }, []);

  const handleSelectMember = useCallback((memberId) => {
    setSelectedMemberId(prev => prev === memberId ? null : memberId);
  }, []);

  const handleAssign = useCallback(() => {
    if (selectedMemberId) {
      onAssign(selectedMemberId);
      onClose();
    }
  }, [onAssign, onClose, selectedMemberId]);

  // Reset selection when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedMemberId(null);
      // Auto expand units that have members
      setExpandedGroups(attendanceGroups.map(g => g.id));
    }
  }, [open, attendanceGroups]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      title="Gán người tham gia vào vị trí chỗ ngồi"
      onSave={handleAssign}
      titleButton="Gán"
      size="md"
      disableSave={!selectedMemberId}
    >
      <StyledModalSubTitle>
        {seatLabel ? `GHẾ [${seatLabel}]` : 'GHẾ'} - {roomName?.toUpperCase() || 'TÊN PHÒNG HỌP'}
      </StyledModalSubTitle>
      
      <StyledModalContent>
        {/* BAN ĐIỀU HÀNH SECTION */}
        <MemberSection>
          <SectionLabel>BAN ĐIỀU HÀNH</SectionLabel>
          {chairman && (
            <MemberRow 
              member={chairman}
              assigned={!!chairman.seatNumber}
              selected={selectedMemberId === (chairman.id || chairman._id)}
              onSelect={handleSelectMember}
              meetingRole="Người chủ trì"
            />
          )}
          {secretary && (
            <MemberRow 
              member={secretary}
              assigned={!!secretary.seatNumber} 
              selected={selectedMemberId === (secretary.id || secretary._id)}
              onSelect={handleSelectMember}
              meetingRole="Thư ký cuộc họp"
            />
          )}
        </MemberSection>

        {/* THAM DỰ SECTION */}
        <MemberSection pt={0}>
          <SectionLabel>THAM DỰ</SectionLabel>
          {attendanceGroups.length > 0 ? (
            attendanceGroups.map((group) => (
              <GroupRow 
                key={group.id} 
                group={group}
                expanded={expandedGroups.includes(group.id)}
                onToggle={toggleGroup}
                selectedMemberId={selectedMemberId}
                onSelectMember={handleSelectMember}
                seatMapping={seatMapping}
                seatLabel={seatLabel}
              />
            ))
          ) : (
            <EmptyStateWrapper>
              Chưa có đơn vị tham gia
            </EmptyStateWrapper>
          )}
        </MemberSection>
      </StyledModalContent>
    </Dialog>
  );
};

export default AssignSeatModal;
