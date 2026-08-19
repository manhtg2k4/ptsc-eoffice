import React from 'react'
import PropTypes from 'prop-types'
import {
	TabsWrapper,
	TabsContainer,
	StyledTab,
	TabLabel,
	TabBadge,
} from "@styles/SigningSubmissionTab.styles";

const CustomChildTab = ({ tabs = [], currentTab, onChange }) => {
	return (
		<TabsWrapper>
			<TabsContainer value={currentTab} onChange={onChange} variant="scrollable">
				{tabs.map((tab, index) => (
					<StyledTab
						key={`${tab.value}-${index}`}
						label={
							<TabLabel>
								{tab.label}
								{tab.badge > 0 && <TabBadge badgeContent={tab.badge} />}
							</TabLabel>
						}
					/>
				))}
			</TabsContainer>
		</TabsWrapper>
	)
}

CustomChildTab.propTypes = {
	tabs: PropTypes.array.isRequired,
	currentTab: PropTypes.number,
	onChange: PropTypes.func,
}

export default CustomChildTab