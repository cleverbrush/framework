import { breadcrumbJsonLd, JsonLd } from '@cleverbrush/website-shared/lib/seo';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { SCHEMA_SITE, schemaDocMetadata } from '../../site';
import ApiReferenceSection from '../sections/api-reference';
import BuiltInExtensionsSection from '../sections/built-in-extensions';
import ComparisonSection from '../sections/comparison';
import DiscriminatedUnionsSection from '../sections/discriminated-unions';
import ExtensionsSection from '../sections/extensions';
import ExternSection from '../sections/extern';
import GenericSchemasSection from '../sections/generic-schemas';
import GettingStartedSection from '../sections/getting-started';
import ImmutabilitySection from '../sections/immutability';
import { MODIFIER_REDIRECTS, SCHEMA_SECTIONS } from '../sections/index';
import MigratingFromZodSection from '../sections/migrating-from-zod';
import ObjectConstructorsSection from '../sections/object-constructors';
import ParseStringSection from '../sections/parse-string';
import PropertyDescriptorsSection from '../sections/property-descriptors';
import RecursiveSchemasSection from '../sections/recursive-schemas';
import SchemaModifiersSection from '../sections/schema-modifiers';
import SchemaTypesSection from '../sections/schema-types';
import StandardSchemaSection from '../sections/standard-schema';
import TypeInferenceSection from '../sections/type-inference';
import ValidationSection from '../sections/validation';
import WhySection from '../sections/why';
import { SchemaDocLayout } from './SchemaDocLayout';

export function generateStaticParams() {
    // Include old modifier slugs so redirects work at build time
    const redirectSlugs = Object.keys(MODIFIER_REDIRECTS).map(s => ({
        slug: [s]
    }));
    return [
        { slug: [] },
        ...SCHEMA_SECTIONS.map(s => ({ slug: [s.slug] })),
        ...redirectSlugs
    ];
}

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
    why: WhySection,
    'getting-started': GettingStartedSection,
    'schema-types': SchemaTypesSection,
    validation: ValidationSection,
    'type-inference': TypeInferenceSection,
    immutability: ImmutabilitySection,
    'discriminated-unions': DiscriminatedUnionsSection,
    'recursive-schemas': RecursiveSchemasSection,
    'parse-string': ParseStringSection,
    'object-constructors': ObjectConstructorsSection,
    'schema-modifiers': SchemaModifiersSection,
    extensions: ExtensionsSection,
    'built-in-extensions': BuiltInExtensionsSection,
    'generic-schemas': GenericSchemasSection,
    'property-descriptors': PropertyDescriptorsSection,
    extern: ExternSection,
    'standard-schema': StandardSchemaSection,
    comparison: ComparisonSection,
    'migrating-from-zod': MigratingFromZodSection,
    'api-reference': ApiReferenceSection
};

export async function generateMetadata({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const currentSlug = slug?.[0] ?? null;

    if (!currentSlug) {
        return schemaDocMetadata('why');
    }

    const redirectTarget = MODIFIER_REDIRECTS[currentSlug];
    if (redirectTarget) {
        return schemaDocMetadata(redirectTarget.split('#')[0] ?? 'why');
    }

    if (!SECTION_COMPONENTS[currentSlug]) {
        return {
            title: 'Not Found',
            robots: {
                index: false,
                follow: false
            }
        };
    }

    return schemaDocMetadata(currentSlug);
}

export default async function SchemaDocPage({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}) {
    const { slug } = await params;
    const currentSlug = slug?.[0] ?? null;

    if (!currentSlug) {
        permanentRedirect('/docs/why');
    }

    // Handle redirects from old individual modifier pages
    const redirectTarget = MODIFIER_REDIRECTS[currentSlug];
    if (redirectTarget) {
        permanentRedirect(`/docs/${redirectTarget}`);
    }

    const SectionComponent = SECTION_COMPONENTS[currentSlug];
    if (!SectionComponent) {
        notFound();
    }

    const section = SCHEMA_SECTIONS.find(entry => entry.slug === currentSlug);

    return (
        <>
            <JsonLd
                data={breadcrumbJsonLd(SCHEMA_SITE, [
                    { name: 'Home', path: '/' },
                    { name: '@cleverbrush/schema', path: '/docs/why' },
                    {
                        name: section?.title ?? 'Schema documentation',
                        path: `/docs/${currentSlug}`
                    }
                ])}
            />
            <SchemaDocLayout currentSlug={currentSlug}>
                <SectionComponent />
            </SchemaDocLayout>
        </>
    );
}
