---
name: web-source-audit
description: Evaluate the trustworthiness of a web source — domain, author, publication date, primary vs secondary, conflicts of interest, and citation chains — before quoting it in research or decisions.
key: paperclipai/optional/research/web-source-audit
recommendedForRoles:
  - researcher
  - analyst
  - writer
tags:
  - research
  - sourcing
  - evidence
  - fact-checking
---

# Web Source Audit

Before quoting a web page as evidence, audit the source. The goal is not to score the publisher on a 1–10 trust scale; it is to know exactly which claims you can safely repeat, which need qualification, and which you should not use at all.

## When to use

- About to cite a web source in a research write-up, brief, or product decision.
- A user asks "is this true" about a specific article, blog post, or social media claim.
- You found a fact that, if wrong, would change the recommendation.

## When not to use

- The source is an official primary record (the entity's own site for its own facts, a published standards body, a regulator). Audit is still wise but the bar is lighter.
- The information is incidental color, not a load-bearing claim.

## The audit

Walk through these in order. Stop early if you hit a disqualifier.

1. **Source identity.**
   - Who published it (organization, individual)?
   - What is the domain's purpose (news outlet, advocacy, marketing, personal blog, forum)?
   - Is the author named? Do they have demonstrable subject expertise?

2. **Date and freshness.**
   - When was the page published? When was it last updated?
   - Is the claim time-sensitive (prices, versions, regulations)? If yes and the page is old, treat with suspicion.

3. **Primary vs secondary.**
   - Does the source make the claim from its own evidence (a study, dataset, internal record)?
   - Or is it summarizing a primary source you should read directly?
   - If secondary, follow the citation to the primary source and audit that instead.

4. **Conflict of interest.**
   - Does the publisher benefit from the claim (vendor describing its own product, partisan outlet describing a partisan topic)?
   - Disclose conflicts in any output that quotes the source.

5. **Evidence shown.**
   - Are claims linked to underlying evidence?
   - Are quantitative claims backed by numbers, with methodology?
   - "Studies show" without a study link is not evidence.

6. **Reproducibility.**
   - Can you find independent sources that make the same claim with their own evidence?
   - Two outlets repeating each other is not two sources — it is one source twice.

7. **Counter-evidence search.**
   - Spend at least one search query looking for the strongest counter-claim.
   - Note disagreements honestly.

## Disqualifiers

A source is unusable for the claim if any of these are true:

- The author is anonymous *and* the publisher is unverifiable.
- The page is undated *and* the claim is time-sensitive.
- The page makes the claim with no linked evidence *and* you cannot find an independent primary source.
- The page contradicts itself (different numbers in different sections).
- The page was last updated after a major change in the underlying fact and was not corrected.

A disqualified source can still inform your search direction — just do not cite it as evidence.

## Output

When you reference a source in research output, include:

- A direct link.
- Publication date (and last-updated date if different).
- One line on the source's nature (primary record, secondary reporting, opinion, vendor doc).
- Any conflicts of interest you noted.

Example:

```md
According to [the FCC's 2025 spectrum auction summary](https://example.example/auction-2025), bid totals reached $X.
- Primary record from the regulator.
- Published 2025-03-12, last updated 2025-04-02.
- No conflict noted.
```

## Anti-patterns

- "I saw it online" framing. Always identify the source.
- Citing aggregator summaries when the primary record is one click away.
- Treating widespread repetition as confirmation. Repetition is a vibe, not evidence.
- Hiding the date because it is inconvenient.
- Quoting a source for a claim it makes only implicitly. If the source did not say it, you cannot cite it for it.
