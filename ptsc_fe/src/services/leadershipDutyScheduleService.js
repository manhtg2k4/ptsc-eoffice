import api, { callApi } from './api';
import { API_LEADERSHIP_DUTY_SCHEDULE } from '@EnvironmentFile/constants/urlConfig';

/**
 * Get list of leadership duty schedules with pagination and filters
 * @param {Object} params - Query parameters (page, limit, filter, sort, proceresFn)
 * @returns {Promise} API response
 */
export const getLeadershipDutySchedules = async (params) => {
    return await callApi('get', `${API_LEADERSHIP_DUTY_SCHEDULE}/list`, params);
};

/**
 * Get leadership duty schedule by ID
 * @param {string} id - Schedule ID
 * @returns {Promise} API response with schedule details
 */
export const getLeadershipDutyScheduleById = async (id) => {
    return await callApi('get', `${API_LEADERSHIP_DUTY_SCHEDULE}/${id}`);
};

/**
 * Create new leadership duty schedule
 * @param {Object} data - Schedule data
 * @returns {Promise} API response
 */
export const createLeadershipDutySchedule = async (data) => {
    return await callApi('post', API_LEADERSHIP_DUTY_SCHEDULE, data);
};

/**
 * Update existing leadership duty schedule
 * @param {string} id - Schedule ID
 * @param {Object} data - Updated schedule data
 * @returns {Promise} API response
 */
export const updateLeadershipDutySchedule = async (id, data) => {
    return await callApi('put', `${API_LEADERSHIP_DUTY_SCHEDULE}/${id}`, data);
};

/**
 * Delete leadership duty schedule
 * @param {string} id - Schedule ID
 * @returns {Promise} API response
 */
export const deleteLeadershipDutySchedule = async (id) => {
    return await api.delete(`${API_LEADERSHIP_DUTY_SCHEDULE}/delete-many`, {
        data: {
            ids: [id],
        },
    });
};

/**
 * Delete multiple leadership duty schedules
 * @param {Array<string>} ids - Array of schedule IDs
 * @returns {Promise} API response
 */
export const deleteManyLeadershipDutySchedules = async (ids) => {
    return await callApi('post', `${API_LEADERSHIP_DUTY_SCHEDULE}/delete-many`, { ids });
};

/**
 * Get leadership duty schedule by period
 * @param {number} year - Year
 * @param {number} week - Week number
 * @returns {Promise} API response
 */
export const getScheduleByPeriod = async (year, week) => {
    return await callApi('get', `${API_LEADERSHIP_DUTY_SCHEDULE}/by-period/${year}/${week}`);
};
