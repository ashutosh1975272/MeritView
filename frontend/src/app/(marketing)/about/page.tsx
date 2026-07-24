export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">About MeritView</h1>
      <div className="prose prose-gray max-w-none">
        <p className="text-xl text-gray-600 mb-8">
          Making contract dispute resolution accessible, affordable, and transparent for everyone.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Our Mission</h2>
        <p>
          Contract disputes are stressful, expensive, and time-consuming. Legal fees can quickly run into thousands of dollars,
          leaving many people without affordable options. MeritView was created to change that.
        </p>
        <p>
          We provide AI-powered decision support that helps you understand the strengths and weaknesses of your case,
          so you can make informed decisions about how to proceed.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">How We Work</h2>
        <p>
          Our platform uses multiple leading AI models to analyze your contract dispute from different angles.
          Each model evaluates the same brief independently, and our system aggregates the results into a comprehensive
          opinion. This multi-model approach reduces bias and provides more reliable analysis.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Transparency</h3>
            <p className="text-sm text-gray-600">We clearly explain how our analysis works, what models are used, and what limitations exist.</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Affordability</h3>
            <p className="text-sm text-gray-600">At $49 per analysis, we provide professional-grade evaluation at a fraction of traditional costs.</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Accessibility</h3>
            <p className="text-sm text-gray-600">Our platform is designed to be used by anyone, regardless of legal background or experience.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
