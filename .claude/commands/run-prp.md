# Run PRP Command

Executes a PRP (Product Requirement Prompt) for implementation.

## Usage
```
/run-prp <prp-name> [--phase=<phase-number>]
```

## Description
This command executes a PRP for implementation, optionally targeting a specific phase. It provides structured context and guides the implementation process.

## Parameters
- `prp-name`: The name of the PRP to execute
- `--phase` (optional): Specific phase to implement (1, 2, or 3)

## Example
```
/run-prp unified-ai-engine --phase=1
```

This will execute Phase 1 of the unified-ai-engine PRP.