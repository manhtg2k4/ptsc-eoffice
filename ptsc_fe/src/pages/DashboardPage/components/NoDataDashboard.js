import React from 'react'
import PropTypes from 'prop-types'
import { EmptyStateDescription, EmptyStateIconCircle, EmptyStateStack, EmptyStateTitle } from '@styles/DashboardPage.styles';

const NoDataDashboard = ({ icon: Icon, title, description }) => {
	return (
		<EmptyStateStack>
			<EmptyStateIconCircle>
				<Icon />
			</EmptyStateIconCircle>
			<EmptyStateTitle variant="subtitle1">{title}</EmptyStateTitle>
			<EmptyStateDescription variant="body2">{description}</EmptyStateDescription>
		</EmptyStateStack>
	);
};

NoDataDashboard.propTypes = {
	icon: PropTypes.elementType.isRequired,
	title: PropTypes.string.isRequired,
	description: PropTypes.string.isRequired,
}

export default NoDataDashboard