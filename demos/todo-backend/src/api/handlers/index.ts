/**
 * Grouped handler re-exports matching the `endpoints` structure.
 *
 * Used with `mapHandlers()` for compile-time exhaustiveness checking —
 * TypeScript will error if any endpoint is missing a handler.
 */

import { activityLogHandler } from './admin.js';
import {
    registerHandler,
    loginHandler,
    googleLoginHandler
} from './auth.js';
import {
    listTodosHandler,
    getTodoHandler,
    getTodoWithAuthorHandler,
    createTodoHandler,
    updateTodoHandler,
    deleteTodoHandler,
    sendTodoEventHandler,
    exportTodosHandler,
    downloadAttachmentHandler,
    importTodosHandler,
    legacyReplaceTodoHandler,
    completeTodoHandler
} from './todos.js';
import {
    listUsersHandler,
    deleteUserHandler,
    getMyProfileHandler
} from './users.js';
import { subscribeWebhookHandler } from './webhooks.js';

import type { HandlerMap } from '@cleverbrush/server';
import type { endpoints } from '../endpoints.js';

export const handlers: HandlerMap<typeof endpoints> = {
    auth: {
        register: registerHandler,
        login: loginHandler,
        googleLogin: googleLoginHandler
    },
    todos: {
        list: listTodosHandler,
        get: getTodoHandler,
        getWithAuthor: getTodoWithAuthorHandler,
        create: createTodoHandler,
        update: updateTodoHandler,
        delete: deleteTodoHandler,
        sendEvent: sendTodoEventHandler,
        exportCsv: exportTodosHandler,
        downloadAttachment: downloadAttachmentHandler,
        importBulk: importTodosHandler,
        legacyReplace: legacyReplaceTodoHandler,
        complete: completeTodoHandler
    },
    users: {
        list: listUsersHandler,
        delete: deleteUserHandler,
        me: getMyProfileHandler
    },
    webhooks: {
        subscribe: subscribeWebhookHandler
    },
    admin: {
        activityLog: activityLogHandler
    }
};
