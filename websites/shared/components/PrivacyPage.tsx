export interface PrivacyPageProps {
    siteName: string;
    siteUrl: string;
    contactEmail: string;
}

export function PrivacyPage({
    siteName,
    siteUrl,
    contactEmail
}: PrivacyPageProps) {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Privacy Policy</h1>
                    <p className="subtitle">
                        How {siteName} handles visitor data and site
                        preferences.
                    </p>
                </div>

                <div className="card">
                    <h2>Data we collect</h2>
                    <p>
                        The site is public documentation. We do not require an
                        account, and we do not collect form submissions on this
                        site. The theme switcher stores your light or dark mode
                        preference in your browser local storage.
                    </p>
                    <p>
                        If you allow analytics, Google Tag Manager may load
                        analytics scripts that collect usage events, device and
                        browser information, and approximate location derived
                        from network information.
                    </p>
                </div>

                <div className="card">
                    <h2>Why we use it</h2>
                    <p>
                        Preference storage keeps the interface consistent
                        between visits. Optional analytics help us understand
                        which documentation pages are useful and where users get
                        stuck.
                    </p>
                </div>

                <div className="card">
                    <h2>Your choices</h2>
                    <p>
                        Analytics are not loaded until you allow them in the
                        consent banner. You can clear or change stored choices
                        at any time through your browser site data settings for{' '}
                        <a href={siteUrl}>{siteUrl}</a>.
                    </p>
                </div>

                <div className="card">
                    <h2>Contact</h2>
                    <p>
                        For privacy questions, contact{' '}
                        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
