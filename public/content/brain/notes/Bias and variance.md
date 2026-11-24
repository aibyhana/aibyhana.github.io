---
date: 2026-11-16
tags: [machine learning, statistics]
status: seed
summary: Two ways a model can be wrong. Too simple, and it misses the pattern. Too flexible, and it learns the noise.
---

The expected error of a model on new data splits into three parts:

- **Bias**: how far off the model is on average, because it is too simple to follow the pattern.
- **Variance**: how much the model would change if it were trained on a different sample, because it follows the noise as well.
- **Noise**: what no model can predict.

A straight line through curved data has high bias. A wiggly curve through every point has high variance. The second case is [[Overfitting]].

More data lowers variance. A more flexible model lowers bias. Training longer with [[Gradient descent]] moves a model from the first problem towards the second, which is why I watch the loss on data the model has not seen.

To do: read about why very large networks do not seem to follow this picture.
