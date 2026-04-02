import { setupServer } from 'msw/node';
import { aiHandlers } from './handlers/ai';
import { authHandlers } from './handlers/auth';

export const server = setupServer(...aiHandlers, ...authHandlers);
