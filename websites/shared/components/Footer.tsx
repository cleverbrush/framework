import type { ReactNode } from 'react';

export interface FooterSection {
    title: string;
    titleIcon?: ReactNode;
    description?: string;
    links: { label: string; href: string; external?: boolean }[];
}

export interface FooterProps {
    sections: FooterSection[];
    bottomText?: ReactNode;
}

export function Footer({ sections, bottomText }: FooterProps) {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                {sections.map(section => (
                    <div key={section.title} className="footer-section">
                        <h4>
                            {section.titleIcon}
                            {section.title}
                        </h4>
                        {section.description && <p>{section.description}</p>}
                        {section.links.map(link =>
                            link.external ? (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <a key={link.href} href={link.href}>
                                    {link.label}
                                </a>
                            )
                        )}
                    </div>
                ))}
            </div>
            <div className="footer-bottom">
                <p>
                    {bottomText ?? (
                        <>
                            BSD-3-Clause License •{' '}
                            <a
                                href="https://cleverbrush.com"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                cleverbrush.com
                            </a>
                        </>
                    )}
                </p>
            </div>
        </footer>
    );
}
