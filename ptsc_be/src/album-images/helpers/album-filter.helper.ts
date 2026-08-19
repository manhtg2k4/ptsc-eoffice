/**
 * Helper để build filter criteria cho album_images với TypeORM QueryBuilder
 * Hỗ trợ OR logic khi nhiều text fields có cùng giá trị (tương tự buildDocumentCriteriaHelper)
 */

import { SelectQueryBuilder } from 'typeorm';
import { AlbumImageEntity } from '../entities/album-image.entity';

export interface AlbumFilterParams {
  title?: string;
  description?: string;
  topic?: string;
  albumType?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface AlbumFilterResult {
  hasSameValue: boolean;
  searchValue: string | null;
  textFilters: string[];
}

/**
 * Kiểm tra các text filter có cùng giá trị không
 */
export function checkSameValueFilters(params: AlbumFilterParams): AlbumFilterResult {
  const { title, description, topic, albumType, createdBy, createdByName } = params;
  
  const textFilters = [title, description, topic, albumType, createdBy, createdByName].filter(Boolean) as string[];
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
  queryBuilder: SelectQueryBuilder<AlbumImageEntity>,
  params: AlbumFilterParams,
  searchValue: string,
  topicIds: string[] = [],
): void {
  const { title, description, topic, albumType, createdBy, createdByName } = params;
  
  const orConditions: string[] = [];
  const queryParams: Record<string, any> = {};

  // Title condition - hỗ trợ tìm kiếm không phân biệt dấu
  if (title) {
    orConditions.push('album.title COLLATE Vietnamese_CI_AI LIKE :searchTitle COLLATE Vietnamese_CI_AI');
    queryParams.searchTitle = `%${searchValue}%`;
  }

  // Description condition - hỗ trợ tìm kiếm không phân biệt dấu
  if (description) {
    orConditions.push('album.description COLLATE Vietnamese_CI_AI LIKE :searchDesc COLLATE Vietnamese_CI_AI');
    queryParams.searchDesc = `%${searchValue}%`;
  }

  // Topic condition - hỗ trợ cả ID và tên
  if (topic && topicIds.length > 0) {
    orConditions.push('album.topic IN (:...searchTopicIds)');
    queryParams.searchTopicIds = topicIds;
  }

  // Album type condition - hỗ trợ tìm kiếm không phân biệt dấu
  if (albumType) {
    orConditions.push('album.albumType COLLATE Vietnamese_CI_AI LIKE :searchAlbumType COLLATE Vietnamese_CI_AI');
    queryParams.searchAlbumType = `%${searchValue}%`;
  }

  // Created by condition - hỗ trợ tìm kiếm không phân biệt dấu
  if (createdBy) {
    orConditions.push('album.createdBy COLLATE Vietnamese_CI_AI LIKE :searchCreatedBy COLLATE Vietnamese_CI_AI');
    queryParams.searchCreatedBy = `%${searchValue}%`;
  }

  // Created by name condition - hỗ trợ tìm kiếm không phân biệt dấu
  if (createdByName) {
    orConditions.push('album.createdByName COLLATE Vietnamese_CI_AI LIKE :searchCreatedByName COLLATE Vietnamese_CI_AI');
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
  queryBuilder: SelectQueryBuilder<AlbumImageEntity>,
  params: AlbumFilterParams,
  topicIds: string[] = [],
): void {
  const { title, description, topic, albumType, createdBy, createdByName } = params;

  // Title filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (title) {
    queryBuilder.andWhere('album.title COLLATE Vietnamese_CI_AI LIKE :title COLLATE Vietnamese_CI_AI', { title: `%${title}%` });
  }

  // Description filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (description) {
    queryBuilder.andWhere('album.description COLLATE Vietnamese_CI_AI LIKE :description COLLATE Vietnamese_CI_AI', { description: `%${description}%` });
  }

  // Topic filter
  if (topic && topicIds.length > 0) {
    queryBuilder.andWhere('album.topic IN (:...topicIds)', { topicIds });
  }

  // Album type filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (albumType) {
    queryBuilder.andWhere('album.albumType COLLATE Vietnamese_CI_AI LIKE :albumType COLLATE Vietnamese_CI_AI', { albumType: `%${albumType}%` });
  }

  // Created by filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (createdBy) {
    queryBuilder.andWhere('album.createdBy COLLATE Vietnamese_CI_AI LIKE :createdBy COLLATE Vietnamese_CI_AI', { createdBy: `%${createdBy}%` });
  }

  // Created by name filter - hỗ trợ tìm kiếm không phân biệt dấu
  if (createdByName) {
    queryBuilder.andWhere('album.createdByName COLLATE Vietnamese_CI_AI LIKE :createdByName COLLATE Vietnamese_CI_AI', { createdByName: `%${createdByName}%` });
  }
}
