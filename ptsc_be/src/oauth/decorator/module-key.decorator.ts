import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'moduleKey';
export const ModulesKey = (key: string) => SetMetadata(MODULE_KEY, key);    