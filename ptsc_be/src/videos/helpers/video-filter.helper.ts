/**
 * Helper để build filter criteria cho videos với TypeORM QueryBuilder
 * Hỗ trợ OR logic khi nhiều text fields có cùng giá trị (tương tự buildDocumentCriteriaHelper)
 */

import { SelectQueryBuilder } from 'typeorm';
import { VideoEntity } from '../entities/video.entity';

/**
 * Loại bỏ dấu tiếng Việt để hỗ trợ tìm kiếm không phân biệt dấu
 * Ví dụ: "Đội" -> "Doi", "Việt Nam" -> "Viet Nam"
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return str;
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export interface VideoFilterParams {
  title?: string;
  description?: string;
  topic?: string;
  videoType?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface VideoFilterResult {
  hasSameValue: boolean;
  searchValue: string | null;
  textFilters: string[];
}

/**
 * Kiểm tra các text filter có cùng giá trị không
 */
export function checkSameValueFilters(params: VideoFilterParams): VideoFilterResult {
  const { title, description, topic, videoType, createdBy, createdByName } = params;
  
  const textFilters = [title, description, topic, videoType, createdBy, createdByName].filter(Boolean) as string[];
  const uniqueValues = [...new Set(textFilters)];
  const hasSameValue = textFilters.length > 1 && uniqueValues.length === 1;
  
  return {
    hasSameValue,
    searchValue: hasSameValue ? uniqueValues[0] : null,
    textFilters,
  };
}

/**
 * Apply OR filter conditions khi các text fields có cùng giá trị
 */
export function applyOrFilterConditions(
  queryBuilder: SelectQueryBuilder<VideoEntity>,
  params: VideoFilterParams,
  searchValue: string,
  topicIds: string[] = [],
): void {
  const { title, description, topic, videoType, createdBy, createdByName } = params;
  
  const orConditions: string[] = [];
  const queryParams: Record<string, any> = {};

  // Title condition
  if (title) {
    orConditions.push('video.title LIKE :searchTitle');
    queryParams.searchTitle = `%${searchValue}%`;
  }

  // Description condition
  if (description) {
    orConditions.push('video.description LIKE :searchDesc');
    queryParams.searchDesc = `%${searchValue}%`;
  }

  // Topic condition - hỗ trợ cả ID và tên
  if (topic && topicIds.length > 0) {
    orConditions.push('video.topic IN (:...searchTopicIds)');
    queryParams.searchTopicIds = topicIds;
  }

  // Video type condition - hỗ trợ tìm kiếm không phân biệt dấu
  if (videoType) {
    orConditions.push('video.videoType COLLATE Vietnamese_CI_AI LIKE :searchVideoType COLLATE Vietnamese_CI_AI');
    queryParams.searchVideoType = `%${searchValue}%`;
  }

  // Created by condition - hỗ trợ tìm kiếm không phân biệt dấu
  if (createdBy) {
    orConditions.push('video.createdBy COLLATE Vietnamese_CI_AI LIKE :searchCreatedBy COLLATE Vietnamese_CI_AI');
    queryParams.searchCreatedBy = `%${searchValue}%`;
  }

  // Created by name condition - hỗ trợ tìm kiếm không phân biệt dấu
  if (createdByName) {
    orConditions.push('video.createdByName COLLATE Vietnamese_CI_AI LIKE :searchCreatedByName COLLATE Vietnamese_CI_AI');
    queryParams.searchCreatedByName = `%${searchValue}%`;
  }

  if (orConditions.length > 0) {
    queryBuilder.andWhere(`(${orConditions.join(' OR ')})`, queryParams);
  }
}

/**
 * Apply AND filter conditions khi các text fields có giá trị khác nhau
 */
export function applyAndFilterConditions(
  queryBuilder: SelectQueryBuilder<VideoEntity>,
  params: VideoFilterParams,
  topicIds: string[] = [],
): void {
  const { title, description, topic, videoType, createdBy, createdByName } = params;

  // Title filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (title) {
    queryBuilder.andWhere('video.title COLLATE Vietnamese_CI_AI LIKE :title COLLATE Vietnamese_CI_AI', { title: `%${title}%` });
  }

  // Description filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (description) {
    queryBuilder.andWhere('video.description COLLATE Vietnamese_CI_AI LIKE :description COLLATE Vietnamese_CI_AI', { description: `%${description}%` });
  }

  // Topic filter
  if (topic && topicIds.length > 0) {
    queryBuilder.andWhere('video.topic IN (:...topicIds)', { topicIds });
  }

  // Video type filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (videoType) {
    queryBuilder.andWhere('video.videoType COLLATE Vietnamese_CI_AI LIKE :videoType COLLATE Vietnamese_CI_AI', { videoType: `%${videoType}%` });
  }

  // Created by filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (createdBy) {
    queryBuilder.andWhere('video.createdBy COLLATE Vietnamese_CI_AI LIKE :createdBy COLLATE Vietnamese_CI_AI', { createdBy: `%${createdBy}%` });
  }

  // Created by name filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (createdByName) {
    queryBuilder.andWhere('video.createdByName COLLATE Vietnamese_CI_AI LIKE :createdByName COLLATE Vietnamese_CI_AI', { createdByName: `%${createdByName}%` });
  }
}
