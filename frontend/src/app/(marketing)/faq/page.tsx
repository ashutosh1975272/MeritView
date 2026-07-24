'use client';

import { useState } from 'react';

const faqs = [
  { q: 'What is MeritView?', a: 'MeritView is an AI-powered decision support platform that analyzes contract disputes. It uses multiple AI models to evaluate your case and provides a structured opinion outlining strengths, weaknesses, and confidence assessments.' },
  { q: 'Is this legal advice?', a: 'No. MeritView provides AI-generated decision support, not legal advice. Our opinions are for informational purposes only and should not replace consultation with a qualified attorney. We clearly state this in all our outputs.' },
  { q: 'How much does it cost?', a: 'A standard analysis costs $49. We offer tiered pricing for expedited ($99), extended ($199), and re-analysis ($49) options.' },
  { q: 'How long does analysis take?', a: 'Most analyses complete within 5-10 minutes after payment. Our system dispatches your brief to three AI models in parallel and aggregates the results.' },
  { q: 'What types of disputes do you handle?', a: 'Currently we handle contract interpretation disputes. We are expanding to small claims assessment and partnership conflict categories in future releases.' },
  { q: 'How is my data protected?', a: 'All brief content is encrypted using AES-256-GCM before storage. Data is decrypted only during evaluation and is never shared with third parties. We enforce strict access controls and retention policies.' },
  { q: 'Can both parties submit briefs?', a: 'Currently we support single-party submissions. Two-party support with mutual brief submission is coming in a future release.' },
  { q: 'What AI models do you use?', a: 'We use Groq Llama 3 70B, Groq Mixtral 8x7B, and Gemini 1.5 Pro. Each model evaluates independently to reduce bias.' },
  { q: 'Can I get a refund?', a: 'If your evaluation fails (fewer than 3 successful model analyses), we automatically issue a full refund. Withdrawal requests before evaluation begins are also eligible for refund.' },
  { q: 'Is my information confidential?', a: 'Yes. We treat all dispute information as confidential. Our AI providers have no-training guarantees, meaning your data is not used to train their models.' },
  { q: 'Can I download my opinion?', a: 'Yes, each opinion is available as both a web page and a downloadable PDF document.' },
  { q: 'What if I need more help?', a: 'Contact our support team at support@meritview.ai. We strive to respond within 24 hours.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-gray-900">{q}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-4 text-gray-600 text-sm">{a}</div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">Frequently Asked Questions</h1>
      <p className="text-xl text-gray-600 text-center mb-12">
        Everything you need to know about MeritView
      </p>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>
    </div>
  );
}
