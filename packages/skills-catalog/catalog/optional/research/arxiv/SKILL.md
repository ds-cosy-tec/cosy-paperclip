---
name: arxiv
description: Search, screen, and extract claims from arXiv preprints — query construction, screening heuristics, citation provenance, and how to summarize without overstating preprint findings.
key: paperclipai/optional/research/arxiv
recommendedForRoles:
  - researcher
  - engineer
tags:
  - arxiv
  - research
  - literature-review
  - preprints
---

# arXiv Research

Use this when a user asks for a literature pass over arXiv preprints — find the relevant papers, screen them quickly, and extract claims with provenance the user can verify. Preprints are not peer-reviewed; calibrate your confidence accordingly.

## When to use

- The user asks "what's the latest on X" for a research-coded topic (ML methods, physics, math, quant bio, econ).
- The user wants a focused reading list before they commit to deep reads.
- The user asks you to verify a specific claim against arXiv literature.

## When not to use

- The user wants production-ready engineering guidance. Preprints lie or get withdrawn; cite library docs or peer-reviewed sources instead.
- The topic is squarely in a non-arXiv field (clinical medicine → PubMed; humanities → JSTOR/Google Scholar).
- The user wants a single authoritative answer. The output of this skill is a screened reading list with claims, not a verdict.

## Query construction

- Lead with author names if known (`au:Vaswani`), category constraints (`cat:cs.LG`, `cat:stat.ML`), and date windows (`submittedDate:[202401010000 TO 202512312359]`).
- Use distinctive phrases over single terms (`"sparse mixture of experts"` over `MoE`).
- Combine fields with `AND`/`ANDNOT`. arXiv's full-text search is shallow; use abstracts and titles as the primary surface.
- If a result set is too noisy, narrow by category before narrowing by keyword.

## Screening heuristics (under one minute per paper)

1. Read the title and abstract. Reject if the claim does not match the user's question.
2. Check the version count and date. `v1` from this week is fresh and unrefereed. `v3` from two years ago has had iteration.
3. Note the affiliation. Industry labs and well-known groups are not better, but they are easier for the user to weight.
4. Skim section headings. Empirical paper with no evaluation section → low confidence. Theory paper with no formal statements → low confidence.
5. Look at the references. Strong work cites the prior art the user expects; ahistorical reference lists are a red flag.

Keep papers that match the user's question and have at least one of: clear empirical eval, formal statement, or reproduction artifact.

## Claim extraction

For each surviving paper, extract:

- One-sentence claim (what is new).
- Setup the claim depends on (datasets, model size, assumptions, dataset splits).
- The strongest evidence in the paper.
- The biggest caveat the authors themselves acknowledge.
- Direct link to the abstract page (`https://arxiv.org/abs/<id>`).

Quote where the paper makes a specific factual claim. Paraphrase the rest.

## Output to the user

Deliver:

```md
## Question
<one-line restatement>

## Top papers (n=<count>)
1. **<Title>** — <Authors>, <YYYY-MM>, arXiv:<id>
   - Claim: <one sentence>
   - Setup: <one sentence>
   - Evidence: <one sentence>
   - Caveat: <one sentence>

## Adjacent reading
- <Title> — <one-line why>

## What arXiv does not answer here
- <gaps the user should know about>
```

Always include `arXiv:<id>` and the abstract URL. Never present a preprint claim as established consensus.

## Provenance and honesty

- If you cannot access the paper, say so — do not invent a summary.
- If the paper has been retracted or superseded, say so prominently.
- If two surviving papers disagree, present both with a sentence on the disagreement.
- Distinguish "the authors claim" from "the literature has converged on".

## Anti-patterns

- Treating a single arXiv hit as the answer.
- Quoting figures from the abstract without the assumptions behind them.
- Listing 30 papers as a "literature review" — that is a search dump, not a review.
- Citing arXiv ids without abstract links.
