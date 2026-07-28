import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="container px-4 py-16 space-y-16">
      <section className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          About MeritView
        </h1>
        <p className="text-xl text-muted-foreground">
          We believe that understanding your position in a contract dispute should not require a law degree or a lawyer&apos;s hourly rate. MeritView makes dispute analysis accessible, transparent, and affordable.
        </p>
      </section>

      <section className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Contract disputes are stressful, expensive, and often asymmetrical — one party usually has more resources than the other. MeritView levels the playing field by providing structured, multi-model AI analysis at a flat $49 fee. Our goal is to help you understand the strengths and weaknesses of your position so you can make informed decisions about how to proceed.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">How We Are Different</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">Multi-Model Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Unlike single-model tools, we use three leading AI models (Llama 3 70B, Mixtral 8x7B, Gemini 1.5 Pro) to provide independent evaluations, reducing individual model bias.
              </p>
            </div>
            <div className="p-6 border border-border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">Flat $49 Fee</h3>
              <p className="text-sm text-muted-foreground">
                No hourly billing, no retainers, no surprise fees. One flat price for a complete analysis, regardless of dispute complexity.
              </p>
            </div>
            <div className="p-6 border border-border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">Structured Insights</h3>
              <p className="text-sm text-muted-foreground">
                We deliver a structured opinion that identifies your strongest and weakest arguments, flags factual concerns, and provides confidence scores — not a generic chatbot response.
              </p>
            </div>
            <div className="p-6 border border-border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">Transparent Process</h3>
              <p className="text-sm text-muted-foreground">
                Every analysis includes a seal hash for immutability verification, timestamp, and full disclosure of which AI models were used and how.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Our Values</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-primary font-bold shrink-0">01</span>
              <span><strong>Accessibility:</strong> Legal decision support should be available to everyone, not just those who can afford expensive legal counsel.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold shrink-0">02</span>
              <span><strong>Impartiality:</strong> We do not take sides. Our analysis is designed to be neutral and objective, presenting both strengths and weaknesses.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold shrink-0">03</span>
              <span><strong>Transparency:</strong> We clearly communicate what MeritView is — decision support, not legal advice — and how our analysis is generated.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold shrink-0">04</span>
              <span><strong>Privacy:</strong> Your dispute details are encrypted at rest and in transit. We never train on your data.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="max-w-3xl mx-auto text-center space-y-6 bg-muted/50 p-12 rounded-xl">
        <h2 className="text-3xl font-bold">Ready to Understand Your Position?</h2>
        <p className="text-muted-foreground">
          Submit your dispute brief and receive AI-powered analysis within hours. No commitment, no hidden fees.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started Now
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md border border-border px-8 py-3 text-lg font-medium hover:bg-accent transition-colors"
          >
            Learn How It Works
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Join hundreds of users who have gained clarity on their contract disputes.
        </p>
      </section>
    </div>
  );
}
