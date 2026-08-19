import api, { callApi } from './api';
import { API_AMENITIES } from '@EnvironmentFile/constants/urlConfig';

export const createAmenity = async (data) => {
    return await callApi('post', API_AMENITIES, data);
};

export const updateAmenity = async (id, data) => {
    return await callApi('put', `${API_AMENITIES}/${id}`, data);
};

export const deleteAmenities = async (ids) => {
  return api.delete(API_AMENITIES, { data: { ids: ids } });
};

export const getAmenityById = async (id) => {
    return await callApi('get', `${API_AMENITIES}/${id}`);
};

export const getAllAmenities = async (params) => {
    return await callApi('get', `${API_AMENITIES}/list`, params);
};
