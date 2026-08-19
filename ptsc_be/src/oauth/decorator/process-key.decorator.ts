import { SetMetadata } from '@nestjs/common';

export const PROCESS_KEY = 'processKey';
export const ProcessKey = (key: string) => SetMetadata(PROCESS_KEY, key);
