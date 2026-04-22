/**
 * Grouped handler re-exports matching the `endpoints` structure.
 *
 * Used with `mapHandlers()` for compile-time exhaustiveness checking —
 * TypeScript will error if any endpoint is missing a handler.
 */

import type { HandlerMap } from '@cleverbrush/server';
import type { endpoints } from '../endpoints.js';
import { activityLogHandler } from './admin.js';
import { googleLoginHandler, loginHandler, registerHandler } from './auth.js';
import { demoEchoHandler, demoFlakyHandler, demoSlowHandler } from './demo.js';
import { activityFeedHandler, chatHandler, todoUpdatesHandler } from './live.js';
import {
    completeTodoHandler,
    createTodoHandler,
    deleteTodoHandler,
    downloadAttachmentHandler,
    exportTodosHandler,
    getTodoHandler,
    getTodoWithAuthorHandler,
    importTodosHandler,
    legacyReplaceTodoHandler,
    listAllActivityHandler,
    listTodoActivityHandler,
    listTodosHandler,
    sendTodoEventHandler,
    updateTodoHandler
} from './todos.js';
import {
    deleteUserHandler,
    getMyProfileHandler,
    listUsersHandler
} from './users.js';
import { subscribeWebhookHandler } from './webhooks.js';

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
        complete: completeTodoHandler,
        listActivity: listTodoActivityHandler
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
    },
    activity: {
        listAll: listAllActivityHandler
    },
    demo: {
        slow: demoSlowHandler,
        flaky: demoFlakyHandler,
        echo: demoEchoHandler
    },
    live: {
        todoUpdates: todoUpdatesHandler,
        chat: chatHandler,
        activityFeed: activityFeedHandler
    }
};
