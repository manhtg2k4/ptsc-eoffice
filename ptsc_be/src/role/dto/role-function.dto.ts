import { IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { MethodDto } from './method.dto';

export class RoleFunctionDto {

  @IsString()
  _id: string;

  @IsString()
  titleFunction: string;

  @IsString()
  codeModuleFunction: string;

  @IsString()
  clientId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MethodDto)
  methods: MethodDto[];
}
