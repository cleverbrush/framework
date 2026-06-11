import { createRobots } from '@cleverbrush/website-shared/lib/seo';
import { SCHEMA_SITE } from './site';

export default function robots() {
    return createRobots(SCHEMA_SITE);
}
