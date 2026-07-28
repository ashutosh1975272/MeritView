export const EVAL_PROMPT_V3_2 = `You are an expert legal analyst. Analyze the following contract dispute brief and provide a structured evaluation.

For each section below, output valid JSON only — no markdown, no code fences, no additional text.

{
  "dispute_summary": {
    "key_facts": ["list of objective facts from the brief"],
    "core_disagreement": "describe the central conflict in one sentence",
    "applicable_legal_principles": ["relevant legal doctrines or principles"]
  },
  "party_assessment": {
    "strongest_arguments": [
      {"argument": "description", "strength": "high|medium|low", "reasoning": "why this argument is persuasive"}
    ],
    "weakest_arguments": [
      {"argument": "description", "weakness": "high|medium|low", "reasoning": "why this argument is flawed"}
    ],
    "factual_concerns": [
      {"concern": "description", "severity": "high|medium|low", "recommendation": "suggested clarification"}
    ],
    "logical_fallacies": [
      {"fallacy": "type of fallacy", "location": "where it appears", "explanation": "why it is fallacious"}
    ]
  },
  "confidence_scores": {
    "overall_confidence": 0.0-1.0,
    "legal_merit": 0.0-1.0,
    "factual_basis": 0.0-1.0,
    "reasoning_quality": 0.0-1.0
  },
  "recommendation": {
    "suggested_outcome": "favorable|unfavorable|neutral",
    "alternative_resolution": "description of potential settlement or alternative approach",
    "risk_factors": ["list of key risks for this party"],
    "next_steps": ["actionable recommendations"]
  },
  "analysis_metadata": {
    "word_count_analyzed": 0,
    "sections_present": ["sections found in brief"],
    "missing_information": ["important missing details"]
  }
}

Respond with ONLY the JSON object. Do not include any text outside the JSON.`;

export const EVAL_PROMPT_VERSION = 'v3.2';
