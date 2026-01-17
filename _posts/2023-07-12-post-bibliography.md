---
layout: distill
title: Understanding RAG Hallucinations
date: 2023-07-12 09:56:00-0400
description: exploring why retrieval-augmented generation systems fail to stay faithful to context
tags: rag llm interpretability
categories: ai-safety
giscus_comments: true
related_posts: false
related_publications: true
---

## Why RAG Systems Hallucinate

Retrieval-augmented generation (RAG) systems are supposed to ground LLM outputs in retrieved documents, but they still hallucinate. Understanding _why_ requires looking at how these systems actually process retrieved context.

### The Faithfulness Problem

When an LLM receives retrieved context, we assume it will:

1. Read and comprehend the context
2. Generate responses based only on that context
3. Abstain when the context doesn't contain relevant information

In practice, all three assumptions often fail. The model might:

- Ignore parts of the retrieved context
- Blend retrieved information with its parametric knowledge
- Confidently generate claims not supported by the context

### Distribution Shift

RAG systems are particularly vulnerable during distribution shift. When:

- Retrieved documents use unfamiliar terminology or formatting
- The question type differs from training data
- Context length exceeds what the model handles well

...the model falls back on parametric knowledge rather than the provided context.

### What We Need

Better understanding of these failures requires:

- Mechanistic interpretability of how models process retrieved context
- Metrics that distinguish faithful vs. unfaithful generation
- Architectures designed for reliable context grounding

This remains an open research problem central to building trustworthy AI systems.
