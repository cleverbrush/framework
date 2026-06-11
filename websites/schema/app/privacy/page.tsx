import { PrivacyPage } from '@cleverbrush/website-shared/components/PrivacyPage';
import { SCHEMA_SITE, schemaMetadata } from '../site';

export const metadata = schemaMetadata('/privacy');

export default function SchemaPrivacyPage() {
    return (
        <PrivacyPage
            siteName={SCHEMA_SITE.shortName}
            siteUrl={SCHEMA_SITE.url}
            contactEmail="andrew_zol@cleverbrush.com"
        />
    );
}
