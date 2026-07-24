'use client';

import { useState, useMemo, useCallback } from 'react';

interface OptimizedOpinionPageProps {
  opinion: any;
}

export function OptimizedOpinionPage({ opinion }: OptimizedOpinionPageProps) {
  const [activeSection, setActiveSection] = useState<string>('summary');

  const sections = useMemo(() => [
    { id: 'summary', label: 'Executive Summary', content: opinion.executiveSummary },
    { id: 'issues', label: 'Key Issues', content: opinion.keyIssues?.map((i: any) => i.issue).join(', ') },
    { id: 'partyA', label: 'Party A Analysis' },
    { id: 'partyB', label: 'Party B Analysis' },
    { id: 'assessment', label: 'Comparative Assessment', content: opinion.comparativeAssessment },
    { id: 'confidence', label: 'Confidence Indicators' },
    { id: 'considerations', label: 'Suggested Considerations' },
    { id: 'disclaimers', label: 'Disclaimers' },
  ], [opinion]);

  const handleNavClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (!opinion) {
    return <div className="p-8 text-center text-gray-400">Opinion content not available.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="sticky top-0 bg-white z-10 border-b mb-6 py-2 flex gap-4 overflow-x-auto" aria-label="Opinion sections">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => handleNavClick(s.id)}
            className={`text-sm whitespace-nowrap px-3 py-1 rounded ${
              activeSection === s.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <section id="section-summary" className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Executive Summary</h2>
        <p className="text-gray-700 leading-relaxed">{opinion.executiveSummary}</p>
      </section>

      <section id="section-issues" className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Key Issues</h2>
        <div className="space-y-3">
          {opinion.keyIssues?.map((issue: any, i: number) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{issue.issue}</p>
              <p className="text-sm text-gray-500 mt-1">
                Evaluator Agreement: <span className={`font-semibold ${
                  issue.agreementLevel === 'high' ? 'text-green-600' :
                  issue.agreementLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>{issue.agreementLevel}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <section id="section-partyA">
          <h2 className="text-2xl font-bold mb-4">Party A Analysis</h2>
          <AnalysisBlock title="Strongest Arguments" items={opinion.partyAAnalysis?.strongestArguments} />
          <AnalysisBlock title="Weakest Points" items={opinion.partyAAnalysis?.weakestPoints} />
          <AnalysisBlock title="Factual Concerns" items={opinion.partyAAnalysis?.factualConcerns} />
        </section>
        <section id="section-partyB">
          <h2 className="text-2xl font-bold mb-4">Party B Analysis</h2>
          <AnalysisBlock title="Strongest Arguments" items={opinion.partyBAnalysis?.strongestArguments} />
          <AnalysisBlock title="Weakest Points" items={opinion.partyBAnalysis?.weakestPoints} />
          <AnalysisBlock title="Factual Concerns" items={opinion.partyBAnalysis?.factualConcerns} />
        </section>
      </div>

      <section id="section-assessment" className="mb-8 p-6 bg-blue-50 rounded-lg italic">
        <h2 className="text-2xl font-bold mb-4 not-italic">Comparative Assessment</h2>
        <p className="text-gray-700 leading-relaxed">{opinion.comparativeAssessment}</p>
      </section>

      {opinion.confidenceIndicators && (
        <section id="section-confidence" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Confidence Indicators</h2>
          <div className="flex gap-6">
            <ConfidenceCard
              label="Overall Confidence"
              value={opinion.confidenceIndicators.overallConfidence}
            />
            <ConfidenceCard
              label="Evaluator Agreement"
              value={opinion.confidenceIndicators.evaluatorAgreement}
            />
          </div>
        </section>
      )}

      <section id="section-considerations" className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Suggested Considerations</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-blue-700 mb-2">For Party A</h3>
            <ul className="list-disc pl-5 space-y-1">
              {opinion.suggestedConsiderations?.partyA?.map((c: string, i: number) => (
                <li key={i} className="text-gray-700">{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-red-700 mb-2">For Party B</h3>
            <ul className="list-disc pl-5 space-y-1">
              {opinion.suggestedConsiderations?.partyB?.map((c: string, i: number) => (
                <li key={i} className="text-gray-700">{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="section-disclaimers" className="mb-8 p-6 bg-gray-100 rounded-lg text-sm">
        <h2 className="text-xl font-bold mb-3">Disclaimers</h2>
        <ul className="list-disc pl-5 space-y-1">
          {opinion.disclaimers?.map((d: string, i: number) => (
            <li key={i} className="text-gray-600">{d}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AnalysisBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <ul className="list-disc pl-5 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 p-4 bg-gray-50 rounded-lg text-center">
      <div className="text-3xl font-bold text-blue-600">{(value * 100).toFixed(0)}%</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
