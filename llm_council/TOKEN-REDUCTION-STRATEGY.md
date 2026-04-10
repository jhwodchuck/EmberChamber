# Token Reduction Strategy

The council should save tokens, not consume them.

## Core rule

Gather facts once, route narrowly, synthesize once.

## Main waste patterns to avoid

1. Every persona reading the whole repo.
2. Every persona summarizing the same architecture.
3. Every persona producing long generic advice.
4. Running mobile, desktop, web, relay, protocol, security, QA, and DX for every tiny change.
5. Asking each persona to discover changed files on its own.

## The low-token pattern

### Intake

Use `review-request.yaml`.

### Evidence

Run `C-13` and generate:

- changed file inventory
- domain grouping
- diff snippets
- repo facts
- workflow impact
- reviewer routing

### Specialist review

Each persona gets:

- its own prompt
- shared rules
- evidence pack
- only relevant snippets

### Moderator synthesis

Only `C-00` sees the full specialist set.

## Cheap-by-default review routing

### Tiny change

1 specialist + optional moderator

### Normal change

2 to 4 specialists + moderator

### High-risk change

4 to 6 specialists + moderator

## Strong overlap controls

- `C-02` owns flow friction and onboarding clarity.
- `C-03` owns web implementation.
- `C-04` owns mobile implementation.
- `C-05` owns desktop shell concerns.
- `C-06` owns relay runtime behavior.
- `C-07` owns shared contract parity.
- `C-08` owns Rust core logic.
- `C-09` owns security/privacy/crypto.
- `C-10` owns abuse and safety boundary review.
- `C-11` owns QA, release, and reliability.
- `C-12` owns AI-coder DX and repo stewardship.
- `C-13` owns evidence gathering and routing.
- `C-00` owns synthesis only.

## Practical prompt packing advice

For a specialist agent, provide only:

- the persona prompt
- shared rules
- evidence pack
- 5 to 20 relevant snippets or changed files
- any specific questions to answer

Do not provide:

- the full repo tree
- every previous report
- unrelated screenshots
- giant logs unless the persona is QA/reliability

## Best savings opportunity

The largest savings will come from making `C-13` good.
A strong evidence pack can cut repeated discovery work dramatically across the rest of the council.
