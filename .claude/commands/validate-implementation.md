# Validate Implementation Command

Validates PRP implementation against success criteria.

## Usage
```
/validate-implementation <prp-name> [--phase=<phase-number>]
```

## Description
This command validates that a PRP implementation meets the defined success criteria and acceptance requirements. It runs tests and checks implementation completeness.

## Parameters
- `prp-name`: The name of the PRP to validate
- `--phase` (optional): Specific phase to validate (1, 2, or 3)

## Example
```
/validate-implementation unified-ai-engine --phase=1
```

This will validate Phase 1 implementation of the unified-ai-engine PRP.