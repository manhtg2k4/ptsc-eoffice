import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString, ValidateNested } from "class-validator";
import { StatusInfoDto } from "./status-info.dto";
import { Type } from "class-transformer";
import { DataResponseDto } from "./data-response.dto";

export class UpdateSignedDto {
    @ApiProperty({
    example: 'update-signature',
    description: 'Hành động hệ thống ký trả về',
  })
  @IsString()
  action: string;

  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiProperty({ type: StatusInfoDto })
  @ValidateNested()
  @Type(() => StatusInfoDto)
  status_info: StatusInfoDto;


  data: any;
}