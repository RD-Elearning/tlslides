# ## Communication
- Communicates in Vietnamese; expects Vietnamese responses from the main agent. Confidence: 0.9
- Wants subagent prompts written in English even when the user speaks Vietnamese. Confidence: 0.85
- Strongly prefers parallel subagent execution to accelerate progress — expects the main agent to act as coordinator/dispatcher. Confidence: 0.9
- Prefers backlog-driven, systematic work: review the plan first, then dispatch tasks respecting dependency graph, fanning out where possible. Confidence: 0.9
- Preferred subagent model: xiaomi/mimo-v2.5 (slash separator, not colon). Confidence: 0.95
- Prefers focused testing/linting — run tests and eslint only on the relevant portions of code, not the entire project. Confidence: 0.8
- Uses a backlog/plan-driven workflow with numbered tasks (e.g. Q0–Q20), dependency graphs, and staged execution (Stage 0 → Stage 4). Confidence: 0.85
