import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-xl text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <span className="text-sm font-bold">MV</span>
            </div>
            <span>MeritView</span>
          </Link>
          <nav className="flex items-center gap-3" aria-label="Primary">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden" aria-labelledby="hero-heading">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 shadow-sm mb-8">
              <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
              AI-powered dispute analysis
            </div>
            <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              AI Decision Support for{' '}
              <span className="text-blue-600">Everyday Disputes</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Get structured, impartial analysis of contract, small claims, and partnership disputes from multiple AI models.
              Standard analysis starts at $99. Decision support, not legal advice.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-8 py-3.5 text-lg font-medium text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Start Your Analysis
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-lg border border-slate-300 bg-white px-8 py-3.5 text-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
                How It Works
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-t border-slate-200 bg-slate-50/50" aria-labelledby="how-it-works-heading">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="text-center mb-16">
              <h2 id="how-it-works-heading" className="text-3xl font-bold text-slate-900 mb-4">How It Works</h2>
              <p className="text-slate-600 max-w-xl mx-auto">Three simple steps to get structured, impartial analysis of your dispute.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <article className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm hover:shadow-md transition-shadow" style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}>
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600" aria-hidden="true">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">1. Describe Your Dispute</h3>
                <p className="text-slate-600 leading-relaxed">
                  Complete our structured five-section brief: facts, your position, arguments, opposing view, and desired resolution.
                </p>
              </article>
              <article className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm hover:shadow-md transition-shadow" style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}>
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600" aria-hidden="true">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">2. Multi-Model AI Analysis</h3>
                <p className="text-slate-600 leading-relaxed">
                  A target roster of five diverse AI evaluators independently reviews your submitted brief.
                </p>
              </article>
              <article className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm hover:shadow-md transition-shadow" style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}>
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600" aria-hidden="true">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 15.375v-2.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V15m-10.5-3.375h9.75c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125v-2.25c0-.621.504-1.125 1.125-1.125z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">3. Receive Structured Opinion</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get a detailed opinion outlining the strongest and weakest arguments, factual concerns, confidence scores, and a PDF export.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Why Choose MeritView */}
        <section className="border-t border-slate-200" aria-labelledby="why-heading">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="text-center mb-16">
              <h2 id="why-heading" className="text-3xl font-bold text-slate-900 mb-4">Why Choose MeritView?</h2>
              <p className="text-slate-600 max-w-xl mx-auto">Built for clarity, transparency, and impartiality.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <article className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow" style={{ contentVisibility: 'auto', containIntrinsicSize: '280px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600" aria-hidden="true">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Impartial Analysis</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Multiple AI models provide independent evaluations, reducing individual model bias.
                </p>
              </article>
              <article className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow" style={{ contentVisibility: 'auto', containIntrinsicSize: '280px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600" aria-hidden="true">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Transparent Pricing</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Standard analysis starts at $99. Expedited and extended tiers are also available.
                </p>
              </article>
              <article className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow" style={{ contentVisibility: 'auto', containIntrinsicSize: '280px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600" aria-hidden="true">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a48.067 48.067 0 00-5.875-1.17M12 12.75a48.067 48.067 0 00-5.875 1.17M12 12.75V18m0 0a6.01 6.01 0 01-1.5.189m1.5-.189a6.01 6.01 0 00-1.5.189M12 12.75a48.067 48.067 0 015.875-1.17M12 12.75V18m0 0a6.01 6.01 0 001.5.189m-1.5-.189a6.01 6.01 0 01-1.5-.189" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Decision Support</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Not legal advice: structured insights to help you understand your position and make informed decisions.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-slate-200 bg-slate-50/50" aria-labelledby="cta-heading">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24 text-center">
            <h2 id="cta-heading" className="text-3xl font-bold text-slate-900 mb-4">Ready to Get Started?</h2>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto text-lg">
              Submit your dispute brief and receive AI-powered analysis within hours.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-lg font-medium text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Create Free Account →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li><Link href="/how-it-works" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Pricing</Link></li>
                <li><Link href="/faq" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li><Link href="/terms" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Privacy Policy</Link></li>
                <li><Link href="/disclaimers" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Disclaimers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li><Link href="/contact" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Contact Us</Link></li>
                <li><Link href="/help" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li><Link href="/about" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">About</Link></li>
                <li><Link href="/blog" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">© 2024 MeritView. All rights reserved.</p>
            <p className="text-sm text-slate-400 mt-1">
              <span className="font-medium text-slate-600">Decision support, not legal advice.</span> Consult a qualified attorney for legal advice specific to your situation.
            </p>
          </div>
        </div>
      </footer>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'MeritView',
            url: 'https://meritview.com',
            description: 'AI-powered decision support for everyday disputes.',
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer support',
            },
          }),
        }}
      />
    </div>
  );
}
