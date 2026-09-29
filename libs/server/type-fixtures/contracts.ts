import { array, number, object, string } from '@cleverbrush/schema';
import { defineApi, endpoint, route } from '@cleverbrush/server/contract';

export const Item = object({ id: number(), title: string() });
export const Message = object({ message: string() });
export const Principal = object({ userId: string() });
const resource = endpoint.resource('/items').authorize(Principal, 'member');
const byId = route({ id: number().coerce() })`/${p => p.id}`;

export const api = defineApi({
    items: {
        list: resource
            .get()
            .query(object({ search: string() }))
            .responses({ 200: array(Item), 400: Message }),
        create: resource
            .post()
            .body(object({ title: string() }))
            .responses({ 201: Item, 404: Message }),
        remove: resource.delete(byId).responses({ 204: null, 404: Message }),
        upload: endpoint
            .post('/items/upload')
            .authorize(Principal)
            .upload()
            .responses({ 204: null })
    },
    live: {
        changes: endpoint.subscription('/changes').outgoing(Item)
    }
});
