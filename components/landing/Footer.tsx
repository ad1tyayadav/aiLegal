import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-background border-t border-border pt-16 pb-8">
            <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-sm">
                                अ
                            </div>
                            <span className="font-heading font-bold text-xl text-foreground">Andhakanoon</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Empowering Indians with instant, accessible, and accurate legal contract analysis.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">Features</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Upload</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Disclaimer</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                        © 2026 Andhakanoon. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground text-center md:text-right">
                        Educational tool only. Not a substitute for professional legal advice.
                    </p>
                </div>
            </div>
        </footer>
    );
}
