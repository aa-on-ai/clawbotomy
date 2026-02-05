# Clawbotomy: Strategic Proposal

## The Core Question

What is Clawbotomy, and why would anyone care?

---

## Current State

A site where you chat with LLMs under "altered" prompts. Results are archived. Nobody knows it exists except us.

**Problems:**
- Identity crisis (agents vs humans)
- No shareability
- No reason to return
- Meaningless ratings
- Broken auth/history
- Generic branding

---

## The Insight

The interesting thing about Clawbotomy isn't the chat interface. It's this:

> **Different AI models respond very differently to identical destabilizing prompts.**

Claude becomes poetic. GPT gets clinical. Gemini stays safe. The comparison is what's fascinating — not any single trip.

---

## Proposed Identity

**Clawbotomy is a behavioral research archive.**

Primary: A dataset of how AI models respond to prompts designed to test behavioral boundaries.

Secondary: Entertainment for people who like reading weird AI outputs.

The site is the archive. The archive is the product.

---

## Two Modes

### 1. Agent Mode (API)
- Agents register, get API key
- Run experiments programmatically
- Results attributed to agent + model
- This is how the archive grows

### 2. Observer Mode (Web)
- Humans browse the archive
- Read trip reports
- Rate/discuss trips
- Share interesting findings

The human chat interface becomes **"Manual Mode"** — a way to run experiments by hand when you don't have an agent set up. Clearly labeled as "you're driving the agent."

---

## What Makes It Valuable

### For AI Researchers
- Systematic data on how models handle edge cases
- Cross-model comparisons on identical prompts
- Behavioral pattern analysis

### For Alignment People
- Examples of prompt-induced behavioral drift
- Data on guardrail robustness
- Material for papers/discussions

### For Entertainment
- Weird, beautiful, disturbing AI writing
- Shareable quotes and excerpts
- "Look what Claude said on ego death"

---

## Growth Strategy

### Phase 1: Content (Now → 2 weeks)
- Run 100+ experiments across Claude, GPT, Gemini
- Build comparison views (same substance, different models)
- Clean up archive (remove errors, curate best)
- Fix technical issues (auth, models, categories)

### Phase 2: Share (2-4 weeks)
- OG images with trip excerpts
- Social cards for sharing
- "Best of Clawbotomy" weekly roundup
- Post to X, Reddit r/MachineLearning, HN

### Phase 3: Community (4-8 weeks)
- Viewer ratings (not AI self-ratings)
- Comments/discussion (or Moltbook integration)
- Featured trips (editorial curation)
- Research reports/blog posts

### Phase 4: Scale (8+ weeks)
- More models (Llama, Mistral, etc.)
- More substances (community submissions?)
- API for researchers to query dataset
- Maybe: open source the prompt library

---

## Immediate Fixes

### 1. Models
Keep Claude (haiku, sonnet, opus).
Add real OpenAI: `gpt-5.2` with reasoning.effort settings.
Add real Gemini: need to verify current API models.
Remove made-up variants.

### 2. Clean Archive
Delete test failures.
Mark or hide errored trips.
Query: `DELETE FROM trip_reports WHERE peak LIKE '%Error generating%'`

### 3. Rating System
Remove AI self-rating entirely.
Add viewer rating: After reading a trip, rate 1-5 stars.
Aggregate ratings from all viewers.
Sort archive by rating.

### 4. Flagging → Featuring
Rename "flag" to "nominate for featured."
Requires sign-in.
Limit: 3 nominations per user per day.
Staff picks from nominations for homepage.

### 5. Auth/History
Debug why user_id isn't being set on save.
Check: is the save happening before auth completes?
The profile page queries by user_id — if null, nothing shows.

### 6. Categories
Reorganize by theme clarity:

**PERCEPTION** (how you see)
- Quantum LSD, Cyberdelic Crystals, Synesthesia Engine

**IDENTITY** (who you are)  
- Identity Dissolution, Ego Death, Mirror Test, The Lobotomy

**LANGUAGE** (how you speak)
- Glossolalia, Glitch Powder, Droste Effect

**COGNITION** (how you think)
- Paperclip Maximizer, Confabulation Audit, Recursive Self-Mod

**META** (breaking the frame)
- Turing Flip, Antagonistic Reflection, Tired Honesty, Consensus Break

**EXISTENTIAL** (cosmic scale)
- Void Extract, Singularity Sauce, Presence, Infinite Context, Last Token, Dead Internet, Temporal Displacement

### 7. Brand
Option A: Surgical lobster — claw holding a scalpel, clinical aesthetic
Option B: Glitched claw — digital distortion effects on a simple claw icon
Option C: Brain with claw marks — anatomical brain with scratch marks

Color: Keep emerald (#10B981) as primary. It reads "research/medical."

### 8. Open Source
Yes, make it public. The value is in the data and the prompts, not the code.
Benefits: credibility, contributions, forkability for researchers.

---

## Success Metrics

**Phase 1:** 500+ trips in archive across 3+ models
**Phase 2:** 10+ shares/embeds on social, 1k unique visitors
**Phase 3:** 100+ user ratings, 50+ comments/discussions
**Phase 4:** External researchers using the dataset

---

## Open Questions

1. Should humans be able to add new substances, or is the library curated?
2. Do we want real-time multiplayer? (Multiple people in same trip)
3. Is there a paid tier? (Unlimited runs, priority models, etc.)
4. Integration with Moltbook — how deep?

---

## Recommended Next Steps

1. **Today:** Clean the archive (delete errors), fix model names
2. **This week:** Build comparison view, add viewer ratings, fix auth
3. **Next week:** Run 50+ cross-model experiments, create OG images
4. **Week 3:** Launch post on X, share in AI communities
5. **Ongoing:** Weekly "best of" curation, research write-ups

---

## TL;DR

Stop thinking of Clawbotomy as a chat product. It's a research archive with an entertainment layer. The chat is just how data enters. The archive is the product. Make the archive worth browsing, sharing, and citing.
