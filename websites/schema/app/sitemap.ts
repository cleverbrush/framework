import { createSitemap } from '@cleverbrush/website-shared/lib/seo';
import { SCHEMA_SITE, SCHEMA_SITEMAP_ROUTES } from './site';

export default function sitemap() {
    return createSitemap(SCHEMA_SITE, SCHEMA_SITEMAP_ROUTES);
}
