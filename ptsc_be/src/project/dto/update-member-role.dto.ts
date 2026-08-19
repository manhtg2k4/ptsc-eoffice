import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsIn } from 'class-validator';

export class UpdateMemberRoleDto {
    @ApiProperty({
        description: 'Vai trò mới trong dự án',
        enum: ['manager', 'member', 'viewer'],
        example: 'viewer'
    })
    @IsNotEmpty({ message: 'role không được để trống' })
    @IsIn(['manager', 'member', 'viewer'], { message: 'role phải là manager, member hoặc viewer' })
    role: string;
}
