import { createServer, implement } from '@cleverbrush/server';
import { api } from './contracts.js';
import { itemsImplementation, live } from './module.js';

export const mapping = implement(api).use(itemsImplementation, live).complete();
export const server = createServer().handleAll(mapping);
