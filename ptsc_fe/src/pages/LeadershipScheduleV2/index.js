import React, { useState, useCallback } from 'react';
import ListViewV2 from './ListViewV2';
import CalendarViewV2 from './CalendarViewV2';

const LeadershipScheduleV2 = (props) => {
    const [viewMode, setViewMode] = useState('calendar');

    const handleSwitchToCalendar = useCallback(() => setViewMode('calendar'), []);
    const handleSwitchToList = useCallback(() => setViewMode('list'), []);

    if (viewMode === 'calendar') {
        return <CalendarViewV2 {...props} onSwitchView={handleSwitchToList} />;
    }

    return <ListViewV2 {...props} onSwitchView={handleSwitchToCalendar} />;
};

export default LeadershipScheduleV2;
