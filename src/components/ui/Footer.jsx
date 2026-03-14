import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Youtube, Instagram, ArrowRight, Check } from 'lucide-react';

// Magazine Footer - Premium Editorial News Platform Footer
export default function Footer() {
    const currentYear = new Date().getFullYear();
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (email) {
            setSubscribed(true);
            setEmail('');
            setTimeout(() => setSubscribed(false), 3000);
        }
    };

    // Categories section
    const categories = [
        { name: 'Technology', slug: 'technology' },
        { name: 'AI', slug: 'ai' },
        { name: 'Startups', slug: 'startups' },
        { name: 'Business', slug: 'business' },
        { name: 'World', slug: 'world' },
        { name: 'Politics', slug: 'politics' },
        { name: 'Science', slug: 'science' }
    ];

    // Quick links
    const quickLinks = [
        { name: 'About Us', href: '/about' },
        { name: 'Contact', href: '/contact' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Advertise With Us', href: '/advertise' },
        { name: 'Careers', href: '/careers' }
    ];

    // Social media links
    const socialLinks = [
        { name: 'Twitter / X', icon: Twitter, href: 'https://twitter.com' },
        { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
        { name: 'YouTube', icon: Youtube, href: 'https://youtube.com' },
        { name: 'Instagram', icon: Instagram, href: 'https://instagram.com' }
    ];

    return (
        <footer className="magazine-footer">
            {/* Main Footer */}
            <div className="footer-main">
                <div className="max-w-7xl mx-auto px-4 lg:px-6">
                    <div className="footer-grid">
                        {/* Column 1: Brand */}
                        <div className="footer-brand">
                            <Link to="/" className="footer-logo">
                                <span className="logo-text">Posty</span>
                            </Link>
                            <p className="brand-description">
                                Delivering fast, reliable, and intelligent news across technology,
                                business, AI, and global affairs.
                            </p>
                            <p className="brand-tagline">
                                Your trusted source for the stories that shape our world.
                            </p>
                            <div className="social-links">
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.name}
                                        href={social.href}
                                        className="social-link"
                                        aria-label={social.name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <social.icon size={18} />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Categories */}
                        <div className="footer-section">
                            <h4 className="section-title">Categories</h4>
                            <ul className="footer-links">
                                {categories.map((category) => (
                                    <li key={category.name}>
                                        <Link
                                            to={`/?category=${category.slug}`}
                                            className="footer-link"
                                        >
                                            {category.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Column 3: Quick Links */}
                        <div className="footer-section">
                            <h4 className="section-title">Quick Links</h4>
                            <ul className="footer-links">
                                {quickLinks.map((link) => (
                                    <li key={link.name}>
                                        <Link to={link.href} className="footer-link">
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Newsletter Section */}
            <div className="footer-newsletter">
                <div className="max-w-7xl mx-auto px-4 lg:px-6">
                    <div className="newsletter-wrapper">
                        <div className="newsletter-content">
                            <div className="newsletter-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                                    <path d="M18 14h-8"></path>
                                    <path d="M15 18h-5"></path>
                                    <path d="M10 6h8v4h-8V6Z"></path>
                                </svg>
                            </div>
                            <div className="newsletter-text">
                                <h4>Stay Informed</h4>
                                <p>Subscribe to get the most important news delivered directly to your inbox.</p>
                            </div>
                        </div>
                        <form className="newsletter-form" onSubmit={handleSubscribe}>
                            <div className="input-wrapper">
                                <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                </svg>
                                <input
                                    type="email"
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className={subscribed ? 'subscribed' : ''}>
                                {subscribed ? (
                                    <>
                                        <Check size={18} /> Subscribed!
                                    </>
                                ) : (
                                    <>
                                        Subscribe
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                    <p className="newsletter-disclaimer">
                        By subscribing, you agree to our Privacy Policy and receive weekly news updates.
                    </p>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="footer-bottom">
                <div className="max-w-7xl mx-auto px-4 lg:px-6">
                    <div className="bottom-content">
                        <div className="copyright-section">
                            <p className="copyright">
                                © {currentYear} Posty. All rights reserved.
                            </p>
                            <p className="tagline">Made with passion for journalism</p>
                        </div>
                        <div className="bottom-links">
                            <Link to="/privacy">Privacy Policy</Link>
                            <Link to="/terms">Terms of Service</Link>
                            <Link to="/cookies">Cookie Policy</Link>
                            <Link to="/sitemap">Sitemap</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
