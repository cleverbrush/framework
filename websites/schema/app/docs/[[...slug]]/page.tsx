import { redirect } from 'next/navigation';
import ApiReferenceSection from '../sections/api-reference';
import BuiltInExtensionsSection from '../sections/built-in-extensions';
import CatchFallbackSection from '../sections/catch-fallback';
import ComparisonSection from '../sections/comparison';
import DefaultValuesSection from '../sections/default-values';
import DescribeSection from '../sections/describe';
import DiscriminatedUnionsSection from '../sections/discriminated-unions';
import ExtensionsSection from '../sections/extensions';
import GenericSchemasSection from '../sections/generic-schemas';
import GettingStartedSection from '../sections/getting-started';
import ImmutabilitySection from '../sections/immutability';
import { SCHEMA_SECTIONS } from '../sections/index';
import ObjectConstructorsSection from '../sections/object-constructors';
import ParseStringSection from '../sections/parse-string';
import PromiseSchemaSection from '../sections/promise-schema';
import PropertyDescriptorsSection from '../sections/property-descriptors';
import ReadonlySection from '../sections/readonly';
import RecursiveSchemasSection from '../sections/recursive-schemas';
import SchemaNameSection from '../sections/schema-name';
import SchemaTypesSection from '../sections/schema-types';
import StandardSchemaSection from '../sections/standard-schema';
import ValidationSection from '../sections/validation';
import { SchemaDocLayout } from './SchemaDocLayout';

export function generateStaticParams() {
    return [{ slug: [] }, ...SCHEMA_SECTIONS.map(s => ({ slug: [s.slug] }))];
}

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
    'getting-started': GettingStartedSection,
    'schema-types': SchemaTypesSection,
    immutability: ImmutabilitySection,
    'discriminated-unions': DiscriminatedUnionsSection,
    'recursive-schemas': RecursiveSchemasSection,
    'generic-schemas': GenericSchemasSection,
    'parse-string': ParseStringSection,
    'promise-schema': PromiseSchemaSection,
    'object-constructors': ObjectConstructorsSection,
    validation: ValidationSection,
    'property-descriptors': PropertyDescriptorsSection,
    'default-values': DefaultValuesSection,
    'catch-fallback': CatchFallbackSection,
    readonly: ReadonlySection,
    describe: DescribeSection,
    'schema-name': SchemaNameSection,
    extensions: ExtensionsSection,
    'built-in-extensions': BuiltInExtensionsSection,
    'standard-schema': StandardSchemaSection,
    comparison: ComparisonSection,
    'api-reference': ApiReferenceSection
};

export default async function SchemaDocPage({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}) {
    const { slug } = await params;
    const currentSlug = slug?.[0] ?? null;

    if (!currentSlug) {
        redirect('/docs/getting-started');
    }

    const SectionComponent = SECTION_COMPONENTS[currentSlug];
    if (!SectionComponent) {
        redirect('/docs/getting-started');
    }

    return (
        <SchemaDocLayout currentSlug={currentSlug}>
            <SectionComponent />
        </SchemaDocLayout>
    );
}
