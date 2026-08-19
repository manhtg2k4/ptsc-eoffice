// src/stats/dto/outgoing-stats.dto.ts
export class OutgoingDraftCountDto {
    draftingPercent: number;       // Văn bản trình ký
    waitingProcessPercent: number; // Chờ xử lý
    waitingReleasePercent: number; // Chờ ban hành
    releasedPercent: number;       // Đã ban hành
    totalDocuments: number;        // Tổng số văn bản (để hiển thị)
}