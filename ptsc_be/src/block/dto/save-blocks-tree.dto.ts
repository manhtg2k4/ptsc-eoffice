import { IsString, IsInt, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO cho một block đơn lẻ trong tree
 */
export class BlockTreeItemDto {
    @IsOptional()
    @IsInt()
    id?: number; // Nếu update block cũ

    @IsString()
    key: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsInt()
    width?: number;

    @IsOptional()
    @IsInt()
    height?: number;

    @IsOptional()
    @IsInt()
    order?: number;

    @IsOptional()
    @IsInt()
    status?: number;

    @IsOptional()
    @IsString()
    content?: string;

    // Children
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BlockTreeItemDto)
    children?: BlockTreeItemDto[];
}

/**
 * DTO để lưu toàn bộ tree structure (drag & drop một lượt)
 * Endpoint: POST /pages/:pageId/blocks/tree
 */
export class SaveBlocksTreeDto {
    @IsInt()
    pageId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BlockTreeItemDto)
    blocks: BlockTreeItemDto[]; // Root blocks (parentId = null)

    @IsOptional()
    replaceAll?: boolean; // Nếu true, sẽ xóa hết blocks cũ của trang (default: true)
}
