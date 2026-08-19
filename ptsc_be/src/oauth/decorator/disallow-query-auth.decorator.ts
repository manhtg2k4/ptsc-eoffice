import { SetMetadata } from '@nestjs/common';

export const DISALLOW_QUERY_AUTH_KEY = 'disallow_query_auth';

export const DisallowQueryAuth = () => SetMetadata(DISALLOW_QUERY_AUTH_KEY, true);
