import {
    fmtKB,
    loadBundleSizes
} from '@cleverbrush/website-shared/lib/bundleSizes';
import { BenchmarkSection } from './BenchmarkSection';
import { CodeExamplesSection } from './sections/CodeExamplesSection';
import { CtaSections } from './sections/CtaSections';
import { EcosystemSection } from './sections/EcosystemSection';
import { HeroSection } from './sections/HeroSection';
import { InstallSection } from './sections/InstallSection';
import { QualitySection } from './sections/QualitySection';
import { SchemaSpotlightSection } from './sections/SchemaSpotlightSection';
import { SuperpowersSection } from './sections/SuperpowersSection';

export default function HomePage() {
    const bundleSizes = loadBundleSizes();
    const fullEntry = bundleSizes.entries.find(
        e => e.import === '@cleverbrush/schema'
    );
    const smallestEntry = bundleSizes.entries
        .filter(e => e.import !== '@cleverbrush/schema')
        .reduce(
            (min, e) => (e.gzip < min.gzip ? e : min),
            bundleSizes.entries[1] ?? bundleSizes.entries[0]
        );
    const fullGzip = fullEntry ? fmtKB(fullEntry.gzip) : '~17 KB';
    const smallGzip = smallestEntry ? fmtKB(smallestEntry.gzip) : '~5 KB';
    return (
        <>
            <HeroSection smallGzip={smallGzip} fullGzip={fullGzip} />
            <InstallSection />
            <SuperpowersSection />
            <SchemaSpotlightSection smallGzip={smallGzip} fullGzip={fullGzip} />
            <EcosystemSection />
            <CodeExamplesSection />
            <section className="section" id="quality">
                <div className="container">
                    <QualitySection />
                </div>
            </section>
            <BenchmarkSection />
            <CtaSections />
        </>
    );
}
