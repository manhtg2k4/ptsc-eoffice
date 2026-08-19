import { IsArray, IsString } from 'class-validator';

export class DeleteManyDto {
    @IsArray()
    @IsString({ each: true })
    ids: string[];
}
