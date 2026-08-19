import { PartialType } from '@nestjs/mapped-types';
import { CreateWso2UserSyncDto } from './create-wso2-user-sync.dto';

export class UpdateWso2UserSyncDto extends PartialType(CreateWso2UserSyncDto) {}
