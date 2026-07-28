import Link from 'next/link';

const steps = [
  {
    number: '01',
    title: 'Describe Your Dispute',
    icon: '📝',
    description: 'Fill out our structured 5-section brief form covering the facts, your position, supporting arguments, the opposing view, and your desired resolution. Each section helps the AI models provide a comprehensive analysis.',
    details: [
      'Factual background of the dispute',
      'Your position and interpretation',
      'Supporting arguments with reasoning',
      'Acknowledgment of opposing arguments',
      'Your desired resolution or outcome',
    ],
  },
  {
    number: '02',
    title: 'Submit & Pay',
    icon: '🔒',
    description: 'Once your brief is complete, submit it and pay the flat $49 fee. Your content is encrypted and sealed for immutability. Our system then dispatches your brief to three independent AI models for evaluation.',
    details: [
      'Content encrypted with AES-256-GCM',
      'Seal hash created for immutability proof',
      'Flat $49 fee — no hidden costs',
      'Secure payment via Stripe',
      'Automatic receipt and invoice',
    ],
  },
  {
    number: '03',
    title: 'Receive Your Analysis',
    icon: '📊',
    description: 'Within hours, you will receive a structured opinion with confidence scores, argument analysis, and factual concern flags from three leading AI models, aggregated into a clear, actionable report.',
    details: [
      'Three independent AI evaluations',
      'Strongest and weakest arguments identified',
      'Factual concerns and gaps flagged',
      'Confidence scores for each assessment',
      'PDF export for your records',
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container px-4 py-16 space-y-16">
      <section className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          How It Works
        </h1>
        <p className="text-xl text-muted-foreground">
          Get structured, impartial analysis of your contract dispute in three simple steps.
          No legal expertise required.
        </p>
      </section>

      <div className="max-w-4xl mx-auto space-y-16">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex md:flex-col items-center gap-4 md:w-48 shrink-0">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                  <span className="text-3xl" aria-hidden="true">{step.icon}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-primary">Step {step.number}</span>
                  <h2 className="text-xl font-semibold mt-1">{step.title}</h2>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                <ul className="space-y-2">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5 shrink-0">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute left-8 top-20 bottom-0 w-px bg-border" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      <section className="max-w-3xl mx-auto text-center space-y-6 bg-muted/50 p-12 rounded-xl">
        <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
        <p className="text-muted-foreground">
          The entire process takes about 30 minutes. Create your account and submit your first dispute today.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create Free Account →
        </Link>
      </section>
    </div>
  );
}
