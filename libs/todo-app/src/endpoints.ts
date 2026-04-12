import { array, object, string } from '@cleverbrush/schema';
import { endpoint } from '@cleverbrush/server';
import { IPrincipal, Roles } from './roles.js';
import {
    ById,
    CreateTodoBody,
    TodoListSchema,
    TodoSchema,
    UpdateTodoBody
} from './schemas.js';

const SomeRoute = endpoint.resource('/some/api');
export const SomeRouteGet = SomeRoute.get(ById).returns(string());
export const SomeRoutePost = SomeRoute.post(ById)
    .body(object({ msg: string().required() }))
    .returns(string());

// --- Auth ---------------------------------------------------------------

export const loginEp = endpoint
    .post('/api/auth/login')
    .body(object({ username: string(), password: string() }))
    .summary('Authenticate and receive a JWT')
    .tags('Auth')
    .operationId('login')
    .returns(object({ token: string() }));

// --- Todos --------------------------------------------------------------

export const listTodosEp = endpoint
    .resource('/api/todos')
    .get()
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .query(object({ ownerId: string().optional() }))
    .summary('List todos')
    .description(
        'Returns todos visible to the caller. Regular users see only their own; admins can filter by ownerId.'
    )
    .tags('Todos')
    .operationId('listTodos')
    .returns(TodoListSchema);

export const getTodoEp = endpoint
    .resource('/api/todos')
    .get(ById)
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .summary('Get a todo by id')
    .tags('Todos')
    .operationId('getTodo')
    .returns(TodoSchema);

export const createTodoEp = endpoint
    .resource('/api/todos')
    .post()
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .body(CreateTodoBody)
    .summary('Create a new todo')
    .tags('Todos')
    .operationId('createTodo')
    .returns(TodoSchema);

export const updateTodoEp = endpoint
    .resource('/api/todos')
    .patch(ById)
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .body(UpdateTodoBody)
    .summary('Update a todo')
    .tags('Todos')
    .operationId('updateTodo')
    .returns(TodoSchema);

export const deleteTodoEp = endpoint
    .resource('/api/todos')
    .delete(ById)
    .authorize(IPrincipal, Roles.user, Roles.admin)
    .summary('Delete a todo')
    .tags('Todos')
    .operationId('deleteTodo');

// --- Admin --------------------------------------------------------------

export const deleteAllTodosEp = endpoint
    .delete('/api/admin/todos')
    .authorize(IPrincipal, Roles.admin)
    .summary('Delete all todos (admin)')
    .tags('Admin')
    .operationId('deleteAllTodos');

export const listUsersEp = endpoint
    .get('/api/admin/users')
    .authorize(IPrincipal, Roles.admin)
    .summary('List known user ids')
    .description('Returns the set of unique owner ids from all todos.')
    .tags('Admin')
    .operationId('listUsers')
    .returns(array(string()));
