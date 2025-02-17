# @empiricalrun/ai

## 0.9.0

### Minor Changes

- bde6bf0: feat: add support for configuring assistant tools
- 93e12e0: feat: add support for assistant tool calls

### Patch Changes

- d6d8b5c: fix: fireworks error should not get absorbed

## 0.8.0

### Minor Changes

- 2b0cc32: feat: add support for assistant run config defaults

### Patch Changes

- 51f2f52: fix: add retry logs for model api calls

## 0.7.0

### Minor Changes

- 2517c74: feat: add support for openai assistants

### Patch Changes

- bc3aa56: fix: py-script getting timed out

## 0.6.1

### Patch Changes

- ba98ebb: feat: add support for chat format prompt
- d81cff4: fix: error messaging in case of request timeout
- 4150b1f: fix: typo in chat prompt type
- Updated dependencies [d81cff4]
  - @empiricalrun/fetch@0.3.1

## 0.6.0

### Minor Changes

- 7a67267: feat: add azure-openai model provider

### Patch Changes

- Updated dependencies [7a67267]
  - @empiricalrun/fetch@0.3.0

## 0.5.0

### Minor Changes

- 66cddb3: feat: support for model parameters in gemini models

## 0.4.2

### Patch Changes

- ac10032: fix: throw error from anthropic response instead of returning

## 0.4.1

### Patch Changes

- a952bd9: fix: recursively replace placeholders and allow whitespaces in them

## 0.4.0

### Minor Changes

- e77b76e: feat: support for gemini 1.5 pro model
- 9822db6: feat: accept timeout as parameter in empiricalrc.json

### Patch Changes

- 06b1667: chore: change api key name for google models
- bbd5cd0: fix: don't retry gemini unless we get a 429 error
- 2bc5465: fix: minor improvements for execution accuracy in spider example

## 0.3.0

### Minor Changes

- a94aa16: feat: add stop reason and token usage metrics to run output

## 0.2.0

### Minor Changes

- 90082c8: feat: support model parameters with passthrough
- a4cfb49: feat: add support for fireworks provider for dbrx

### Patch Changes

- b354507: fix: change script value property to path in run
- a9e840a: fix: openai errors not getting captured
- b3cb527: fix: openai run gets stuck when balance is negative

## 0.1.1

### Patch Changes

- 571986a: chore: update npm package license
- 4a858f5: fix: monaco instances block page scroll

## 0.1.0

### Minor Changes

- dbb2abb: first version of empirical package

### Patch Changes

- 8787bf0: feat: add run summary in cli
