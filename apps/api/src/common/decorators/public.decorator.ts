import { SetMetadata } from '@nestjs/common';

/** Metadata key marking a route as accessible without authentication. */
export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route (or controller) as public, bypassing the global auth guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
