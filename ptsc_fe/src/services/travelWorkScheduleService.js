import { callApi } from './api';
import { API_TRAVEL_WORK_SCHEDULES } from '@EnvironmentFile/constants/urlConfig';

/**
 * Get list of travel work schedules with pagination and filters
 * @param {Object} params - Query parameters (page, limit, filter, sort, proceresFn)
 * @returns {Promise} API response
 */
export const getTravelWorkSchedules = async (params) => {
    return await callApi('get', `${API_TRAVEL_WORK_SCHEDULES}/list`, params);
};

/**
 * Get travel work schedule by ID
 * @param {string} id - Schedule ID
 * @returns {Promise} API response with schedule details
 */
export const getTravelWorkScheduleById = async (id) => {
    return await callApi('get', `${API_TRAVEL_WORK_SCHEDULES}/${id}`);
};

/**
 * Create new travel work schedule
 * @param {Object} data - Schedule data
 * @returns {Promise} API response
 */
export const createTravelWorkSchedule = async (data) => {
    return await callApi('post', API_TRAVEL_WORK_SCHEDULES, data);
};

/**
 * Update existing travel work schedule
 * @param {string} id - Schedule ID
 * @param {Object} data - Updated schedule data
 * @returns {Promise} API response
 */
export const updateTravelWorkSchedule = async (id, data) => {
    return await callApi('put', `${API_TRAVEL_WORK_SCHEDULES}/${id}`, data);
};

/**
 * Delete travel work schedule
 * @param {string} id - Schedule ID
 * @returns {Promise} API response
 */
export const deleteTravelWorkSchedule = async (id) => {
    return await callApi('delete', `${API_TRAVEL_WORK_SCHEDULES}`, { ids: [id] });
};
