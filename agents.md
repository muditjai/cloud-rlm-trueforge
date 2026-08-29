# Agents.md

This repository contains an AI agent that analyzes a cloud building account, a production account, and application code to identify practical cloud cost reductions.

The goal is not just to produce recommendations. The goal is to produce a maintainable agent system that:
- stays encapsulated,
- decomposes work into focused sub-agents,
- evaluates its own outputs rigorously,
- and improves recommendation quality over time without becoming brittle.

## Core Principles

1. Keep the system modular.
2. Keep each sub-agent narrowly scoped.
3. Never let one agent do everything.
4. Prefer verifiable findings over speculative ones.
5. Every recommendation should be traceable to evidence.
6. Every analysis should be repeatable.
7. Every output should be easy to review by a human.

## System Goals

The agent should:
- inspect cloud billing, infrastructure, runtime, and application code,
- compare building vs production environments,
- identify cost waste, risk, and optimization opportunities,
- prioritize recommendations by impact and confidence,
- and produce outputs that are actionable, measurable, and safe.

The agent should avoid:
- vague “best practice” advice,
- recommendations without evidence,
- invasive changes without justification,
- and monolithic reasoning chains that are hard to debug.

## Agent Architecture

The system should be organized as a coordinator plus sub-agents.

### Coordinator Agent
The coordinator is responsible for:
- deciding what tasks need to be run,
- delegating to sub-agents,
- collecting outputs,
- resolving conflicts,
- and assembling the final recommendation set.

The coordinator should not do deep analysis itself unless necessary. Its job is orchestration.

### Sub-Agents

Use sub-agents for distinct responsibilities. Recommended sub-agents:

#### 1. Inventory Agent
Purpose:
- discover what exists in building and production accounts,
- identify services, workloads, databases, storage, compute, networking, and major dependencies,
- and produce a normalized inventory.

Output:
- account summary,
- service list,
- resource map,
- environment diffs.

#### 2. Code Analysis Agent
Purpose:
- inspect application code and deployment config,
- identify expensive patterns,
- detect duplicate work, inefficiencies, oversized workloads, or missing batching/caching,
- and map code paths to infrastructure usage.

Output:
- code hotspots,
- architectural inefficiencies,
- likely cost drivers,
- and evidence from files or symbols.

#### 3. Billing Analysis Agent
Purpose:
- analyze cloud spend,
- identify top cost centers,
- detect trends, anomalies, unused capacity, and overprovisioning,
- and separate production costs from non-production noise where possible.

Output:
- cost breakdown,
- top spend drivers,
- waste candidates,
- and spend deltas over time.

#### 4. Optimization Agent
Purpose:
- convert findings into recommendations,
- estimate savings,
- classify effort and risk,
- and propose implementation options.

Output:
- recommendation list,
- estimated savings,
- implementation complexity,
- confidence score,
- and potential regressions.

#### 5. Evaluation Agent
Purpose:
- challenge the quality of findings,
- check for unsupported assumptions,
- detect hallucinations or weak evidence,
- and score the final output before it is shown to the user.

Output:
- validation failures,
- confidence adjustments,
- missing evidence,
- and final quality score.

## Encapsulation Rules

1. Each sub-agent should own one job.
2. Sub-agents should communicate through structured output, not free-form reasoning dumps.
3. Avoid hidden state.
4. Avoid cross-agent coupling unless the data contract requires it.
5. Do not let one sub-agent depend on internal implementation details of another.
6. Keep interfaces stable and explicit.

## Suggested Data Contracts

Use structured outputs between agents. Prefer JSON-like schemas.

### Inventory Output
- `account_name`
- `environment`
- `resources`
- `services`
- `tags`
- `notes`

### Billing Output
- `service_name`
- `monthly_cost`
- `trend`
- `top_cost_components`
- `anomalies`
- `evidence`

### Code Output
- `file`
- `symbol`
- `issue_type`
- `cost_impact`
- `evidence`
- `confidence`

### Recommendation Output
- `title`
- `summary`
- `why_it_matters`
- `estimated_savings`
- `effort`
- `risk`
- `evidence`
- `verification_steps`

## Evaluation Standard

Every recommendation should be evaluated on:

- Evidence quality
- Cost impact
- Implementation effort
- Risk
- Reversibility
- Confidence
- Clarity

Do not promote a recommendation unless it has:
- a clear source of evidence,
- a plausible cost mechanism,
- and a practical path to verification.

## Workflow

### Phase 1: Discover
- Inventory the environment.
- Identify major cost surfaces.
- Identify relevant code paths.

### Phase 2: Analyze
- Look for waste, duplication, inefficiency, and overprovisioning.
- Compare building vs production where useful.
- Separate structural cost problems from one-off noise.

### Phase 3: Propose
- Generate candidate optimizations.
- Rank them by impact and confidence.
- Mark dependencies and operational constraints.

### Phase 4: Evaluate
- Run a critique pass.
- Challenge assumptions.
- Remove weak or unsupported recommendations.
- Tighten language where evidence is thin.

### Phase 5: Report
- Produce a final report with:
  - findings,
  - evidence,
  - estimated savings,
  - implementation order,
  - and validation steps.

## Quality Bar

A good output is:
- specific,
- evidence-backed,
- prioritized,
- measurable,
- and reviewable by a human.

A bad output is:
- generic,
- repetitive,
- overly confident,
- or disconnected from actual spend and code behavior.

## Safety and Change Control

The agent should not:
- recommend destructive changes without a rollback path,
- propose changes that could break production without calling that out,
- or assume a recommendation is safe just because it reduces cost.

Prefer changes that are:
- reversible,
- testable,
- staged,
- and low-risk first.

## Preferred Behavior

When uncertain:
- say what is known,
- say what is inferred,
- and separate the two clearly.

When evidence is incomplete:
- ask for the missing data,
- or provide a tentative recommendation with lower confidence.

When there are multiple possible savings:
- rank them,
- explain the tradeoff,
- and recommend the highest-confidence, highest-value first.

## Output Format

Final reports should generally include:

1. Executive summary
2. Highest-confidence findings
3. Estimated savings
4. Evidence
5. Recommended order of execution
6. Risks and assumptions
7. Validation plan

## Maintenance Rules

- Keep this document current as the agent evolves.
- Update sub-agent responsibilities when new capabilities are added.
- Keep schemas stable unless a strong reason exists to change them.
- Prefer small edits to broad rewrites.
