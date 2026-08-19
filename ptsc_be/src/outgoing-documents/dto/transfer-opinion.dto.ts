import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

// dto/transfer-opinion.dto.ts
export class TransferOpinionDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    docIds: string[];

    @IsString()
    @IsNotEmpty()
    workItemId: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    receiverUserIds: string[]; // C, D, E...

    @IsOptional()
    @IsString()
    note?: string;
}