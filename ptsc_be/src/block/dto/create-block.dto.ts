export class CreateBlockDto { }


// dto/reorder-block-item.dto.ts
export class ReorderBlockItemDto {
    id: number;
    order: number;
}

// dto/reorder-blocks.dto.ts
export class ReorderBlocksDto {
    pageId: number;
    blocks: ReorderBlockItemDto[];
}