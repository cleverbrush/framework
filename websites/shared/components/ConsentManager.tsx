/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: GTM loads only after explicit consent */
'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

type ConsentState = 'accepted' | 'declined' | 'unknown';

const CONSENT_KEY = 'cleverbrush:analytics-consent';

export function ConsentManager({ gtmId }: { gtmId: string }) {
    const [consent, setConsent] = useState<ConsentState>('unknown');

    useEffect(() => {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (stored === 'accepted' || stored === 'declined') {
            setConsent(stored);
        }
    }, []);

    const updateConsent = (next: Exclude<ConsentState, 'unknown'>) => {
        localStorage.setItem(CONSENT_KEY, next);
        setConsent(next);
    };

    return (
        <>
            {consent === 'accepted' && (
                <Script
                    id="gtm-script"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`
                    }}
                />
            )}
            {consent === 'unknown' && (
                <div className="consent-banner" role="region" aria-label="Privacy choices">
                    <p>
                        We use optional analytics to understand documentation
                        usage. Essential site preferences still work without it.
                    </p>
                    <div className="consent-actions">
                        <button
                            type="button"
                            className="consent-btn consent-btn-primary"
                            onClick={() => updateConsent('accepted')}
                        >
                            Allow analytics
                        </button>
                        <button
                            type="button"
                            className="consent-btn"
                            onClick={() => updateConsent('declined')}
                        >
                            Decline
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
