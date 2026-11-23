---
date: 2026-11-17
tags: [machine learning, optimisation]
status: growing
summary: Find a low point of a function by taking small steps downhill.
---

To make a loss small, look at which way it goes down fastest from where I stand, and take a small step that way. Repeat.

The step for weights `w`, loss `L` and step size `η`:

```python
w = w - eta * grad_L(w)
```

The gradient points uphill, so I subtract it.

## What can go wrong

- Step too large: the loss jumps around or blows up.
- Step too small: it takes forever.

The step size is the [[Learning rate]], and choosing it is most of the work.

> [!warning] Check the sign
> Adding the gradient instead of subtracting it climbs the hill. The loss going up from the first step is the sign of it.

In machine learning the gradient is usually estimated from a small batch of the data, which is noisy but cheap. That is stochastic gradient descent.

A model that reaches a very low loss on the training data may simply have memorised it: see [[Bias and variance]].
