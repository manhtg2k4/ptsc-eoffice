import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class AddMemberDto {
    @ApiProperty({ description: 'ID người dùng', example: 'user-id-123' })
    @IsNotEmpty({ message: 'userId không được để trống' })
    @IsString()
    userId: string;

    @ApiProperty({
        description: 'Vai trò trong dự án',
        enum: ['manager', 'member', 'viewer'],
        example: 'member'
    })
    @IsNotEmpty({ message: 'role không được để trống' })
    @IsIn(['manager', 'member', 'viewer'], { message: 'role phải là manager, member hoặc viewer' })
    role: string;
}
