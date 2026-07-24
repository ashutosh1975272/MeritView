export default function HowItWorksPage() {
  const steps = [
    {
      number: '01',
      title: 'Create Your Dispute',
      description: 'Describe your contract issue using our structured 5-section brief form. Include your factual background, position, supporting arguments, acknowledgment of opposing views, and desired resolution.',
      details: 'Your brief is encrypted before storage and only decrypted when evaluation begins.',
    },
    {
      number: '02',
      title: 'AI Analysis',
      description: 'Our system dispatches your brief to three leading AI models: Groq Llama 3 70B, Groq Mixtral 8x7B, and Gemini 1.5 Pro. Each model independently evaluates your case.',
      details: 'Results are compared for consistency, and an inter-evaluator agreement score is calculated.',
    },
    {
      number: '03',
      title: 'Get Your Opinion',
      description: 'Receive a detailed, structured opinion analyzing the strengths and weaknesses of your case, with confidence scores and actionable insights.',
      details: 'Opinions are available as both a web page and downloadable PDF.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">How It Works</h1>
      <p className="text-xl text-gray-600 text-center mb-16">
        Get a comprehensive AI-powered analysis of your contract dispute in three simple steps.
      </p>

      <div className="space-y-12">
        {steps.map((step) => (
          <div key={step.number} className="flex gap-8">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                {step.number}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600 mb-2">{step.description}</p>
              <p className="text-sm text-gray-400 italic">{step.details}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-gray-50 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to get started?</h2>
        <p className="text-gray-600 mb-6">Create your first dispute and get AI-powered analysis for just $49.</p>
        <a
          href="/register"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Create Your Account
        </a>
      </div>
    </div>
  );
}
