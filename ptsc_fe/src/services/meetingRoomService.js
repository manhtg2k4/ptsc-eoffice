import api, { callApi } from './api';
import { API_MEETING_ROOM, APP_BASE } from '@EnvironmentFile/constants/urlConfig';

export const getMeetingRooms = async (params) => {
    return await callApi('get', API_MEETING_ROOM, params);
};

export const getMeetingRoomById = async (id) => {
    return await callApi('get', `${API_MEETING_ROOM}/${id}`);
};

export const createMeetingRoom = async (data) => {
    return await callApi('post', API_MEETING_ROOM, data);
};

export const updateMeetingRoom = async (id, data) => {
    return await callApi('put', `${API_MEETING_ROOM}/${id}`, data);
};

export const deleteMeetingRoom = async (id) => {
    return await api.delete(API_MEETING_ROOM, { data: { ids: [id] } });
};

export const getRoomHistory = async (id, params) => {
    return await callApi('get', `${API_MEETING_ROOM}/${id}/history`, params);
};

export const getAllAmenities = async (params) => {
    return await callApi('get', `${APP_BASE}/api/amenities/list?&processFn=dsThietBi`, params);
};

export const checkMeetingRoomAvailability = async (id) => {
    return await callApi('get', `${API_MEETING_ROOM}/${id}/availability`);
};
