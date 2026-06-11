import { createSitemap } from '@cleverbrush/website-shared/lib/seo';
import { DOCS_SITE, DOCS_SITEMAP_ROUTES } from './site';

export default function sitemap() {
    return createSitemap(DOCS_SITE, DOCS_SITEMAP_ROUTES);
}
