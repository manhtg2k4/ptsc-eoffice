// create-auth-config.dto.ts
import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAuthConfigDto {
    @IsString()
    authType: string;

    // BỎ @IsObject() → DÙNG @Transform để parse JSON string
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value || {};
    })
    config?: Record<string, any>;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}