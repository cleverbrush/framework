import { PrivacyPage } from '@cleverbrush/website-shared/components/PrivacyPage';
import { DOCS_SITE, docsMetadata } from '../site';

export const metadata = docsMetadata('/privacy');

export default function DocsPrivacyPage() {
    return (
        <PrivacyPage
            siteName={DOCS_SITE.shortName}
            siteUrl={DOCS_SITE.url}
            contactEmail="andrew_zol@cleverbrush.com"
        />
    );
}
