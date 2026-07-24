import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <span className="text-2xl">⚖️</span>
            <span>MeritView</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container py-20 px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            AI Decision Support for{' '}
            <span className="text-primary">Contract Disputes</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Get structured, impartial analysis of your contract dispute from multiple AI models.
            $49 flat fee. Decision support, not legal advice.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Your Analysis
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-md border border-input bg-background px-8 py-3 text-lg font-medium hover:bg-accent transition-colors"
            >
              How It Works
            </Link>
          </div>
        </section>

        <section id="how-it-works" className="py-20 bg-muted/50">
          <div className="container px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center p-6">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-xl font-semibold mb-2">1. Describe Your Dispute</h3>
                <p className="text-muted-foreground">
                  Fill out our structured 5-section brief: facts, your position, arguments, opposing view, and desired resolution.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold mb-2">2. Multi-Model AI Analysis</h3>
                <p className="text-muted-foreground">
                  Three leading AI models (Llama 3 70B, Mixtral 8x7B, Gemini 1.5 Pro) independently evaluate your brief.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2">3. Receive Structured Opinion</h3>
                <p className="text-muted-foreground">
                  Get a detailed opinion with strongest/weakest arguments, factual concerns, confidence scores, and PDF export.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Why Choose MeritView?</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Impartial Analysis</h3>
                <p className="text-muted-foreground">
                  Multiple AI models provide independent evaluations, reducing individual model bias.
                </p>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Flat $49 Fee</h3>
                <p className="text-muted-foreground">
                  Transparent pricing with no hidden costs. Pay once, get complete analysis.
                </p>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Decision Support</h3>
                <p className="text-muted-foreground">
                  Not legal advice — structured insights to help you understand your position and make informed decisions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Submit your dispute brief and receive AI-powered analysis within hours.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create Free Account →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12">
        <div className="container px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/how-it-works" className="hover:text-foreground">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/faq" className="hover:text-foreground">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/disclaimers" className="hover:text-foreground">Disclaimers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/contact" className="hover:text-foreground">Contact Us</Link></li>
                <li><Link href="/help" className="hover:text-foreground">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2024 MeritView. All rights reserved.</p>
            <p className="mt-1">
              <span className="font-medium">Decision support, not legal advice.</span> Consult a qualified attorney for legal advice specific to your situation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}