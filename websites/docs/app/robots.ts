import { createRobots } from '@cleverbrush/website-shared/lib/seo';
import { DOCS_SITE } from './site';

export default function robots() {
    return createRobots(DOCS_SITE);
}
