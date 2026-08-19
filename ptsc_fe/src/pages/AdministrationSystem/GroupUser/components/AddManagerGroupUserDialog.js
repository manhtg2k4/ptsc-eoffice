import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	Checkbox,
	Grid,
	useMediaQuery,
	FormControlLabel,
	IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
	Close as CloseIcon,
	Menu as MenuIcon,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
	getDataListUserByUnit,
	getDataListUnit,
} from "@redux/slices/managementUsersSlice";
import PropTypes from "prop-types";
import { columnsUser, filtersUser } from "@pages/AdministrationSystem/DetailGroupUser/constantsDistrict";
import CustomTable from "@components/CustomTable/CustomTable";
// import { HorizontalLine, NodeContainer, NodeName, ToggleButton, VerticalLine } from "@styles/ListUser";
import {
	HorizontalLine,
	NodeContainer,
	NodeName,
	ToggleButton,
	VerticalLine,
	TableWrapper,
	LeftPanelContainer,
	LeftPanelHeader,
	LeftPanelContent,
	SearchBoxContainer,
	SearchUnitTextField,
	TreeContainer,
	NoDataMessage,
	CollapsedMenuContainer,
	MainContentGrid,
	TreeNodeWrapper,
	StyledRemoveIcon,
	StyledAddIcon,
	IndentSpacer,
} from "@styles/ListUser.styles";
import withSharedComponents from "@components/WrapperComponent";
import CustomButton from "@components/CustomButton";

const buildTree = (items) => {
	if (!Array.isArray(items)) return [];
	const map = {};
	const roots = [];
	items.forEach((item) => {
		map[item._id] = { ...item, children: [] };
	});
	items.forEach((item) => {
		if (item.parent && map[item.parent]) {
			map[item.parent].children.push(map[item._id]);
		} else {
			roots.push(map[item._id]);
		}
	});
	return roots;
};

// Helper to filter the tree based on a search term
const filterTree = (nodes, searchTerm) => {
	if (!searchTerm) return nodes;

	const lowerTerm = searchTerm.toLowerCase();

	const getFilteredNodes = (nodes) => {
		return nodes.reduce((acc, node) => {
			// chỉ giữ lại node nếu chính nó match
			if (node.name.toLowerCase().includes(lowerTerm)) {
				acc.push({ ...node, children: [] }); // không cần children nữa
			}

			// tiếp tục tìm trong children
			if (node.children && node.children.length > 0) {
				const matchedChildren = getFilteredNodes(node.children);
				acc.push(...matchedChildren);
			}

			return acc;
		}, []);
	};

	return getFilteredNodes(nodes);
};

const AddManagerGroupUserDialog = ({
	open,
	onClose,
	onSave,
	// isLoading,
	selectedUserIds = [],
	sharedComponents
}) => {
	const { BaseSwipper } = sharedComponents;
	const dispatch = useDispatch();
	const {
		// listUserByUnit,
		listUnit,
		// loading: dataLoading,
	} = useSelector((state) => state.users);
	const [selected, setSelected] = useState([]);
	const [unitTree, setUnitTree] = useState([]);
	const [selectedUnitId, setSelectedUnitId] = useState(null);
	const [selectAll, setSelectAll] = useState(true);
	const [unitSearch, setUnitSearch] = useState("");
	const [expandedNodes, setExpandedNodes] = useState({});
	const [activeNodeId, setActiveNodeId] = useState(null);
	const theme = useTheme();
	const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
	const [mobileMenuOpen, setMobileMenuOpen] = useState(true);
	const handleOpenMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
	const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
	const selectedUserIdsSync = JSON.stringify(selectedUserIds);

	useEffect(() => {
		if (!isMdDown) {
			setMobileMenuOpen(true);
		}
		// when first entering mdDown, keep menu open by default
	}, [isMdDown]);

	useEffect(() => {
		if (open) {
			dispatch(getDataListUnit({ limit: 1000 })); // Fetch all units for the tree
			setSelectedUnitId(null);
			setActiveNodeId(null);
			setSelectAll(true);
		}
	}, [open, dispatch]);

	useEffect(() => {
		if (open) {
			const initialSelected = (selectedUserIds || []).map((user) => 
				typeof user === "object" ? user._id || user.id : user
			);
			setSelected(initialSelected);
		}
	}, [open, selectedUserIdsSync]);

	useEffect(() => {
		setUnitTree(buildTree(listUnit));
	}, [listUnit]);

	const getDataForTable = useCallback(
		async ({ page, limit, query, code, sort }) => {
			if (!selectedUnitId && !selectAll) {
				return { data: [], total: 0 };
			}

			const unitIdToFetch = selectAll ? "all" : selectedUnitId;

			try {
				const response = await dispatch(
					getDataListUserByUnit({
						id: unitIdToFetch,
						page,
						limit,
						query,
						code,
						sort,
					})
				).unwrap();

				const formattedData = (response.data || []).map((user) => ({
					...user,
					userGroup: Array.isArray(user.GroupUser)
						? user.GroupUser.map((g) => g.name).join(", ")
						: "",
				}));

				return {
					data: formattedData,
					total: response.total || 0,
				};
			} catch (error) {
				logger.error("Error fetching users for table:", error);
				return { data: [], total: 0 };
			}
		},
		[dispatch, selectedUnitId, selectAll]
	);

	// const handleUnitSelect = (node) => {
	//   setSelectAll(false);
	//   setSelectedUnitId(node._id);
	//   setActiveNodeId(node._id);
	// };

	const handleUnitSelect = useCallback((node) => {
		setSelectAll(false);
		setSelectedUnitId(node._id);
		setActiveNodeId(node._id);
	}, [setSelectAll, setSelectedUnitId, setActiveNodeId]);


	// Filter the unit tree based on search
	const filteredUnitTree = useMemo(
		() => filterTree(unitTree, unitSearch),
		[unitTree, unitSearch]
	);

	const handleSelectAll = () => {
		setSelectAll(true);
		setSelectedUnitId(null);
		setActiveNodeId(null);
	};

	// const toggleNode = (id) => {
	//   setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
	// };
	const toggleNode = useCallback((id) => {
		setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
	}, []);

	const handleToggleNode = useCallback((nodeId) => (e) => {
		e.stopPropagation();
		toggleNode(nodeId);
	}, [toggleNode]);

	const handleNodeClick = useCallback((node) => () => {
		handleUnitSelect(node);
	}, [handleUnitSelect]);

	const handleSave = useCallback(() => {
		const finalSelected = (selected || []).map((item) =>
			typeof item === "object" ? item._id || item.id : item
		);
		onSave(finalSelected, selected);
	}, [onSave, selected]);

	const handleUnitSearchChange = useCallback((e) => setUnitSearch(e.target.value), []);

	const renderTree = (nodes, level = 0) => {
		return nodes.map((node) => (
			<TreeNodeWrapper key={node._id}>
				{level > 0 && (
					<VerticalLine level={level} />
				)}

				<NodeContainer
					level={level}
					active={activeNodeId === node._id}
				>
					{node?.children?.length > 0 ? (
						<ToggleButton
							// onClick={(e) => {
							//   e.stopPropagation();
							//   toggleNode(node._id);
							// }}
							onClick={handleToggleNode(node._id)}
						>
							{expandedNodes[node._id] ? <StyledRemoveIcon /> : <StyledAddIcon />}
						</ToggleButton>
					) : (
						<IndentSpacer />
					)}

					{level > 0 && (
						<HorizontalLine level={level} hasChildren={node?.children?.length > 0} />
					)}

					{/* <NodeName onClick={() => handleUnitSelect(node)}> */}
					<NodeName onClick={handleNodeClick(node)}>
						{node.name}
					</NodeName>
				</NodeContainer>

				{expandedNodes[node._id] && node.children.length > 0 && renderTree(node.children, level + 1)}
			</TreeNodeWrapper>
		));
	};

	return (
		<BaseSwipper
			open={open}
			onClose={onClose}
			title="Thêm người dùng vào nhóm"
			moreActions={
				<CustomButton
					variant="outlined"
					onClick={handleSave}
				>
					Lưu
				</CustomButton>
			}
			onlySave
		>
			<Grid container spacing={2}  >
				<Grid
					item
					xs={isMdDown ? (mobileMenuOpen ? 12 : 1) : 3}
				>
					<LeftPanelContainer mobileMenuOpen={mobileMenuOpen}>
						{mobileMenuOpen ? (
							<>
								<LeftPanelHeader>
									<FormControlLabel
										control={<Checkbox checked={selectAll} onChange={handleSelectAll} />}
										label={<strong>Tất cả người dùng</strong>}
									/>
									{isMdDown && (
										<IconButton onClick={handleCloseMobileMenu} aria-label="collapse menu">
											<CloseIcon />
										</IconButton>
									)}
								</LeftPanelHeader>
								<LeftPanelContent>
									<SearchBoxContainer>
										<SearchUnitTextField
											fullWidth
											size="small"
											placeholder="Tìm kiếm đơn vị..."
											variant="outlined"
											value={unitSearch}
											onChange={handleUnitSearchChange}
										/>

										<TreeContainer>
											{filteredUnitTree.length > 0 ? (
												renderTree(filteredUnitTree)
											) : (
												<NoDataMessage>Không có dữ liệu</NoDataMessage>
											)}
										</TreeContainer>
									</SearchBoxContainer>
								</LeftPanelContent>
							</>
						) : (
							<CollapsedMenuContainer>
								<IconButton onClick={handleOpenMobileMenu} aria-label="open menu">
									<MenuIcon />
								</IconButton>
							</CollapsedMenuContainer>
						)}
					</LeftPanelContainer>
				</Grid>
				<MainContentGrid item xs={isMdDown ? 12 : 9} isMdDown={isMdDown} mobileMenuOpen={mobileMenuOpen}>
					<TableWrapper>
						<CustomTable
							codeModule={"AddUserToGroup"}
							fetchData={getDataForTable}
							columns={columnsUser}
							filter={filtersUser}
							selection={selected}
							onSelectionChange={setSelected}
							selectionReturns="object"
							disableMore
							disableAdd
							disableEdit
							disableDetail
							disableDelete
							disableAct
							disableSynchronize
							refreshTrigger={selectedUnitId || (selectAll ? 'all' : 'none')}
							uiPreset="unitModern"
							actionIconSize="medium"
							useModernActionColors
							encodeHtml
						/>
					</TableWrapper>
				</MainContentGrid>
			</Grid>
		</BaseSwipper>
	);
};

AddManagerGroupUserDialog.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSave: PropTypes.func.isRequired,
	isLoading: PropTypes.bool,
	selectedUserIds: PropTypes.arrayOf(PropTypes.string),
};

AddManagerGroupUserDialog.defaultProps = {
	isLoading: false,
	selectedUserIds: [],
};

export default withSharedComponents(AddManagerGroupUserDialog);