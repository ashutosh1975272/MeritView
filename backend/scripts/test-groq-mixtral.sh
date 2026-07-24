#!/usr/bin/env bash
set -euo pipefail

# Groq Mixtral 8x7B Validation Script
# Usage: GROQ_API_KEY=gsk_... ./scripts/test-groq-mixtral.sh < dispute-1.json

API_KEY="${GROQ_API_KEY:?GROQ_API_KEY not set}"
MODEL="llama-3.1-8b-instant"
URL="https://api.groq.com/openai/v1/chat/completions"

BRIEF_JSON=$(cat)

PROMPT=$(cat backend/src/prompts/eval-v3.2.ts | grep -oP '(?<=")[^"]{100,}' | head -1)

PAYLOAD=$(jq -n \
  --arg model "$MODEL" \
  --arg prompt "$PROMPT" \
  --arg brief "$BRIEF_JSON" \
  '{
    model: $model,
    messages: [
      {role: "system", content: $prompt},
      {role: "user", content: $brief}
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: {type: "json_object"}
  }')

START_TIME=$(date +%s%N)
curl -s -w "\n%{http_code}" "$URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | {
  read -r body
  read -r http_code
  END_TIME=$(date +%s%N)
  DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

  if [ "$http_code" != "200" ]; then
    echo "{\"error\": \"HTTP $http_code\", \"body\": $body}" | jq .
    exit 1
  fi

  echo "$body" | jq --arg dur "${DURATION_MS}ms" \
    '{provider: "groq", model: "llama-3.1-8b-instant", duration: $dur, output: .choices[0].message.content | fromjson}'
}
