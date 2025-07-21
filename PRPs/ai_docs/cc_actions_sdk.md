# Claude Code Actions SDK

## Overview

The Claude Code Actions SDK provides a comprehensive framework for automating development workflows through the PRP (Product Requirement Prompt) system. This SDK enables seamless integration with GitHub Actions, CI/CD pipelines, and automated testing workflows.

## Core Actions

### 1. PRP Execution Actions

#### Execute PRP Action
```yaml
name: Execute PRP
description: 'Execute a Product Requirement Prompt with validation'
inputs:
  prp_name:
    description: 'Name of the PRP to execute'
    required: true
  phase:
    description: 'Specific phase to execute (1, 2, or 3)'
    required: false
  validation_level:
    description: 'Validation level (basic, standard, comprehensive)'
    required: false
    default: 'standard'
  output_format:
    description: 'Output format (json, markdown, text)'
    required: false
    default: 'json'

runs:
  using: 'composite'
  steps:
    - name: Setup Environment
      shell: bash
      run: |
        python -m pip install --upgrade pip
        pip install -r PRPs/requirements.txt
        
    - name: Execute PRP
      shell: bash
      run: |
        python PRPs/scripts/prp_runner.py \
          --prp ${{ inputs.prp_name }} \
          --phase ${{ inputs.phase }} \
          --output-format ${{ inputs.output_format }}
          
    - name: Validate Implementation
      shell: bash
      run: |
        python PRPs/scripts/prp_runner.py \
          --validate ${{ inputs.prp_name }} \
          --phase ${{ inputs.phase }}
```

#### Create PRP Action
```yaml
name: Create PRP
description: 'Create a new Product Requirement Prompt from template'
inputs:
  prp_name:
    description: 'Name of the PRP to create'
    required: true
  template:
    description: 'Template to use (base, spec, planning)'
    required: false
    default: 'base'
  auto_fill:
    description: 'Auto-fill template with project context'
    required: false
    default: 'true'

runs:
  using: 'composite'
  steps:
    - name: Create PRP
      shell: bash
      run: |
        python PRPs/scripts/prp_runner.py \
          --create ${{ inputs.prp_name }} \
          --template ${{ inputs.template }} \
          --auto-fill ${{ inputs.auto_fill }}
          
    - name: Validate PRP Structure
      shell: bash
      run: |
        python PRPs/scripts/validate_prp_structure.py ${{ inputs.prp_name }}
```

### 2. Testing Actions

#### Comprehensive Test Action
```yaml
name: Comprehensive Testing
description: 'Run comprehensive test suite for PRP validation'
inputs:
  test_types:
    description: 'Test types to run (unit,integration,e2e,performance)'
    required: false
    default: 'unit,integration,e2e'
  coverage_threshold:
    description: 'Minimum test coverage threshold'
    required: false
    default: '80'
  performance_threshold:
    description: 'Performance threshold in milliseconds'
    required: false
    default: '2000'

runs:
  using: 'composite'
  steps:
    - name: Setup Test Environment
      shell: bash
      run: |
        npm ci
        npm run build
        
    - name: Run Unit Tests
      if: contains(inputs.test_types, 'unit')
      shell: bash
      run: |
        npm run test -- --coverage --coverageThreshold='{{ inputs.coverage_threshold }}'
        
    - name: Run Integration Tests
      if: contains(inputs.test_types, 'integration')
      shell: bash
      run: |
        npm run test:integration
        
    - name: Run E2E Tests
      if: contains(inputs.test_types, 'e2e')
      shell: bash
      run: |
        npm run test:e2e
        
    - name: Run Performance Tests
      if: contains(inputs.test_types, 'performance')
      shell: bash
      run: |
        npm run test:performance -- --threshold=${{ inputs.performance_threshold }}
        
    - name: Generate Test Report
      shell: bash
      run: |
        python PRPs/scripts/generate_test_report.py \
          --types ${{ inputs.test_types }} \
          --coverage-threshold ${{ inputs.coverage_threshold }}
```

#### AI Service Testing Action
```yaml
name: AI Service Testing
description: 'Test AI services and integrations'
inputs:
  ai_provider:
    description: 'AI provider to test (openai, anthropic, local)'
    required: false
    default: 'openai'
  test_scenarios:
    description: 'Test scenarios to run'
    required: false
    default: 'flow,component,content'

runs:
  using: 'composite'
  steps:
    - name: Setup AI Testing Environment
      shell: bash
      run: |
        export OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
        export AI_TEST_MODE=true
        
    - name: Test AI Flow Generation
      if: contains(inputs.test_scenarios, 'flow')
      shell: bash
      run: |
        npm run test:ai:flow
        
    - name: Test AI Component Generation
      if: contains(inputs.test_scenarios, 'component')
      shell: bash
      run: |
        npm run test:ai:component
        
    - name: Test AI Content Generation
      if: contains(inputs.test_scenarios, 'content')
      shell: bash
      run: |
        npm run test:ai:content
        
    - name: Validate AI Performance
      shell: bash
      run: |
        python PRPs/scripts/validate_ai_performance.py \
          --provider ${{ inputs.ai_provider }} \
          --scenarios ${{ inputs.test_scenarios }}
```

### 3. Deployment Actions

#### Deploy PRP Implementation Action
```yaml
name: Deploy PRP Implementation
description: 'Deploy PRP implementation with validation'
inputs:
  environment:
    description: 'Deployment environment (staging, production)'
    required: true
  prp_name:
    description: 'PRP name for deployment tracking'
    required: true
  health_check:
    description: 'Run health checks after deployment'
    required: false
    default: 'true'

runs:
  using: 'composite'
  steps:
    - name: Pre-deployment Validation
      shell: bash
      run: |
        python PRPs/scripts/prp_runner.py \
          --validate ${{ inputs.prp_name }} \
          --environment ${{ inputs.environment }}
          
    - name: Build for Deployment
      shell: bash
      run: |
        npm run build:production
        
    - name: Deploy to Environment
      shell: bash
      run: |
        if [ "${{ inputs.environment }}" == "staging" ]; then
          npm run deploy:staging
        elif [ "${{ inputs.environment }}" == "production" ]; then
          npm run deploy:production
        fi
        
    - name: Post-deployment Health Check
      if: inputs.health_check == 'true'
      shell: bash
      run: |
        python PRPs/scripts/health_check.py \
          --environment ${{ inputs.environment }} \
          --prp ${{ inputs.prp_name }}
          
    - name: Update PRP Status
      shell: bash
      run: |
        python PRPs/scripts/prp_runner.py \
          --complete ${{ inputs.prp_name }} \
          --environment ${{ inputs.environment }}
```

## GitHub Actions Workflows

### 1. PRP Development Workflow

#### Complete PRP Workflow
```yaml
name: PRP Development Workflow
on:
  push:
    paths:
      - 'PRPs/*.md'
      - 'PRPs/scripts/**'
  pull_request:
    paths:
      - 'PRPs/*.md'
      - 'src/**'
      - 'tests/**'

jobs:
  validate-prp:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.message, '[PRP]')
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        
    - name: Install Dependencies
      run: |
        npm ci
        pip install -r PRPs/requirements.txt
        
    - name: Extract PRP Name
      id: extract_prp
      run: |
        PRP_NAME=$(echo "${{ github.event.head_commit.message }}" | grep -oP '\[PRP:(\K[^\]]+)')
        echo "prp_name=$PRP_NAME" >> $GITHUB_OUTPUT
        
    - name: Validate PRP Structure
      run: |
        python PRPs/scripts/validate_prp_structure.py ${{ steps.extract_prp.outputs.prp_name }}
        
    - name: Execute PRP Phase 1
      run: |
        python PRPs/scripts/prp_runner.py \
          --prp ${{ steps.extract_prp.outputs.prp_name }} \
          --phase 1 \
          --output-format json
          
    - name: Run Tests
      run: |
        npm run test
        npm run test:integration
        
    - name: Performance Testing
      run: |
        npm run test:performance
        
    - name: Generate Report
      run: |
        python PRPs/scripts/generate_prp_report.py \
          --prp ${{ steps.extract_prp.outputs.prp_name }} \
          --phase 1 \
          --output reports/prp-report.json
          
    - name: Upload Report
      uses: actions/upload-artifact@v4
      with:
        name: prp-report
        path: reports/prp-report.json
```

### 2. AI Integration Workflow

#### AI Service CI/CD
```yaml
name: AI Service CI/CD
on:
  push:
    paths:
      - 'src/services/ai/**'
      - 'src/lib/ai/**'
  pull_request:
    paths:
      - 'src/services/ai/**'
      - 'src/lib/ai/**'

jobs:
  test-ai-services:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Environment
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        
    - name: Install Dependencies
      run: npm ci
      
    - name: Test AI Services
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        AI_TEST_MODE: true
      run: |
        npm run test:ai:unit
        npm run test:ai:integration
        
    - name: Validate AI Performance
      run: |
        python PRPs/scripts/validate_ai_performance.py \
          --provider openai \
          --scenarios flow,component,content
          
    - name: Security Scan
      run: |
        npm audit
        python PRPs/scripts/security_scan.py --target ai-services
        
    - name: Deploy to Staging
      if: github.ref == 'refs/heads/main'
      run: |
        npm run deploy:staging
        
    - name: Health Check
      if: github.ref == 'refs/heads/main'
      run: |
        python PRPs/scripts/health_check.py \
          --environment staging \
          --service ai-services
```

### 3. Performance Monitoring Workflow

#### Performance Monitoring
```yaml
name: Performance Monitoring
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  performance-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Environment
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        
    - name: Install Dependencies
      run: npm ci
      
    - name: Run Performance Tests
      run: |
        npm run test:performance:comprehensive
        
    - name: AI Performance Monitoring
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      run: |
        python PRPs/scripts/monitor_ai_performance.py \
          --duration 60 \
          --concurrent-users 100
          
    - name: Generate Performance Report
      run: |
        python PRPs/scripts/generate_performance_report.py \
          --output reports/performance-report.html
          
    - name: Upload Performance Report
      uses: actions/upload-artifact@v4
      with:
        name: performance-report
        path: reports/performance-report.html
        
    - name: Alert on Performance Issues
      if: failure()
      run: |
        python PRPs/scripts/alert_performance_issues.py \
          --webhook ${{ secrets.SLACK_WEBHOOK }}
```

## Custom Actions Development

### 1. PRP Validator Action

#### Action Definition
```yaml
# .github/actions/prp-validator/action.yml
name: 'PRP Validator'
description: 'Validate PRP structure and completeness'
inputs:
  prp_name:
    description: 'PRP name to validate'
    required: true
  validation_level:
    description: 'Validation level (basic, standard, comprehensive)'
    required: false
    default: 'standard'
outputs:
  validation_result:
    description: 'Validation result'
  score:
    description: 'Validation score'
    
runs:
  using: 'composite'
  steps:
    - name: Validate PRP Structure
      shell: bash
      run: |
        python ${{ github.action_path }}/validate_prp.py \
          --prp ${{ inputs.prp_name }} \
          --level ${{ inputs.validation_level }}
```

#### Implementation Script
```python
# .github/actions/prp-validator/validate_prp.py
import argparse
import json
import sys
from pathlib import Path

def validate_prp(prp_name: str, level: str) -> dict:
    """Validate PRP structure and completeness"""
    
    prp_path = Path(f"PRPs/{prp_name}.md")
    if not prp_path.exists():
        return {"valid": False, "error": f"PRP {prp_name} not found"}
    
    content = prp_path.read_text()
    
    # Basic validation
    required_sections = [
        "## Goal",
        "## Why",
        "## Context",
        "## Implementation Blueprint",
        "## Validation Loop",
        "## Success Criteria"
    ]
    
    missing_sections = []
    for section in required_sections:
        if section not in content:
            missing_sections.append(section)
    
    # Standard validation
    if level in ["standard", "comprehensive"]:
        # Check for code examples
        if "```typescript" not in content and "```javascript" not in content:
            missing_sections.append("Code examples")
        
        # Check for test cases
        if "describe(" not in content and "test(" not in content:
            missing_sections.append("Test cases")
    
    # Comprehensive validation
    if level == "comprehensive":
        # Check for database schema
        if "CREATE TABLE" not in content:
            missing_sections.append("Database schema")
        
        # Check for API endpoints
        if "/api/" not in content:
            missing_sections.append("API endpoints")
    
    score = max(0, 100 - len(missing_sections) * 10)
    
    return {
        "valid": len(missing_sections) == 0,
        "missing_sections": missing_sections,
        "score": score
    }

def main():
    parser = argparse.ArgumentParser(description="Validate PRP structure")
    parser.add_argument("--prp", required=True, help="PRP name to validate")
    parser.add_argument("--level", default="standard", choices=["basic", "standard", "comprehensive"])
    
    args = parser.parse_args()
    
    result = validate_prp(args.prp, args.level)
    
    print(json.dumps(result, indent=2))
    
    # Set GitHub Actions outputs
    with open(os.environ["GITHUB_OUTPUT"], "a") as f:
        f.write(f"validation_result={json.dumps(result)}\n")
        f.write(f"score={result['score']}\n")
    
    sys.exit(0 if result["valid"] else 1)

if __name__ == "__main__":
    main()
```

### 2. AI Performance Monitor Action

#### Action Definition
```yaml
# .github/actions/ai-performance-monitor/action.yml
name: 'AI Performance Monitor'
description: 'Monitor AI service performance and usage'
inputs:
  provider:
    description: 'AI provider to monitor'
    required: false
    default: 'openai'
  duration:
    description: 'Monitoring duration in seconds'
    required: false
    default: '300'
  thresholds:
    description: 'Performance thresholds JSON'
    required: false
    default: '{"response_time": 5000, "success_rate": 0.95}'
    
runs:
  using: 'composite'
  steps:
    - name: Monitor AI Performance
      shell: bash
      run: |
        python ${{ github.action_path }}/monitor_ai.py \
          --provider ${{ inputs.provider }} \
          --duration ${{ inputs.duration }} \
          --thresholds '${{ inputs.thresholds }}'
```

#### Implementation Script
```python
# .github/actions/ai-performance-monitor/monitor_ai.py
import argparse
import json
import time
import asyncio
from datetime import datetime
from typing import Dict, List

class AIPerformanceMonitor:
    def __init__(self, provider: str, thresholds: Dict):
        self.provider = provider
        self.thresholds = thresholds
        self.metrics = {
            "requests": 0,
            "successes": 0,
            "failures": 0,
            "total_response_time": 0,
            "max_response_time": 0,
            "min_response_time": float('inf')
        }
    
    async def test_ai_service(self) -> Dict:
        """Test AI service performance"""
        start_time = time.time()
        
        try:
            # Simulate AI service call
            await asyncio.sleep(0.1)  # Simulate network latency
            
            # In real implementation, call actual AI service
            # result = await ai_service.generate_test_content()
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            self.metrics["requests"] += 1
            self.metrics["successes"] += 1
            self.metrics["total_response_time"] += response_time
            self.metrics["max_response_time"] = max(self.metrics["max_response_time"], response_time)
            self.metrics["min_response_time"] = min(self.metrics["min_response_time"], response_time)
            
            return {"success": True, "response_time": response_time}
            
        except Exception as e:
            self.metrics["requests"] += 1
            self.metrics["failures"] += 1
            return {"success": False, "error": str(e)}
    
    async def monitor(self, duration: int) -> Dict:
        """Monitor AI service for specified duration"""
        start_time = time.time()
        
        while (time.time() - start_time) < duration:
            await self.test_ai_service()
            await asyncio.sleep(1)  # Test every second
        
        # Calculate final metrics
        avg_response_time = self.metrics["total_response_time"] / max(1, self.metrics["requests"])
        success_rate = self.metrics["successes"] / max(1, self.metrics["requests"])
        
        return {
            "provider": self.provider,
            "duration": duration,
            "total_requests": self.metrics["requests"],
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "max_response_time": self.metrics["max_response_time"],
            "min_response_time": self.metrics["min_response_time"],
            "thresholds_met": {
                "response_time": avg_response_time <= self.thresholds["response_time"],
                "success_rate": success_rate >= self.thresholds["success_rate"]
            }
        }

async def main():
    parser = argparse.ArgumentParser(description="Monitor AI service performance")
    parser.add_argument("--provider", default="openai", help="AI provider to monitor")
    parser.add_argument("--duration", type=int, default=300, help="Monitoring duration in seconds")
    parser.add_argument("--thresholds", help="Performance thresholds JSON")
    
    args = parser.parse_args()
    
    thresholds = json.loads(args.thresholds) if args.thresholds else {
        "response_time": 5000,
        "success_rate": 0.95
    }
    
    monitor = AIPerformanceMonitor(args.provider, thresholds)
    results = await monitor.monitor(args.duration)
    
    print(json.dumps(results, indent=2))
    
    # Check if thresholds were met
    if not all(results["thresholds_met"].values()):
        print("❌ Performance thresholds not met")
        sys.exit(1)
    else:
        print("✅ All performance thresholds met")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
```

## Integration with CI/CD Pipelines

### 1. Continuous Integration Pipeline

```yaml
name: Continuous Integration
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Environment
      uses: ./.github/actions/setup-environment
    
    - name: Validate PRPs
      uses: ./.github/actions/prp-validator
      with:
        prp_name: unified-ai-engine
        validation_level: comprehensive
    
    - name: Run Tests
      uses: ./.github/actions/comprehensive-testing
      with:
        test_types: unit,integration,e2e
        coverage_threshold: 80
    
    - name: Monitor AI Performance
      uses: ./.github/actions/ai-performance-monitor
      with:
        provider: openai
        duration: 60
        thresholds: '{"response_time": 3000, "success_rate": 0.98}'
    
    - name: Security Scan
      run: |
        npm audit
        python PRPs/scripts/security_scan.py
    
    - name: Generate Report
      run: |
        python PRPs/scripts/generate_ci_report.py
```

### 2. Deployment Pipeline

```yaml
name: Deployment Pipeline
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'PRPs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Pre-deployment Validation
      uses: ./.github/actions/prp-validator
      with:
        prp_name: unified-ai-engine
        validation_level: comprehensive
    
    - name: Build and Test
      run: |
        npm ci
        npm run build:production
        npm run test:all
    
    - name: Deploy to Staging
      uses: ./.github/actions/deploy-prp-implementation
      with:
        environment: staging
        prp_name: unified-ai-engine
    
    - name: Staging Health Check
      run: |
        python PRPs/scripts/health_check.py --environment staging
    
    - name: Deploy to Production
      if: success()
      uses: ./.github/actions/deploy-prp-implementation
      with:
        environment: production
        prp_name: unified-ai-engine
    
    - name: Production Health Check
      run: |
        python PRPs/scripts/health_check.py --environment production
```

## Best Practices

### 1. Action Design
- Keep actions focused and single-purpose
- Use clear, descriptive names
- Include comprehensive error handling
- Provide meaningful outputs

### 2. Workflow Organization
- Use matrix strategies for parallel execution
- Implement proper dependency management
- Include rollback mechanisms
- Add comprehensive logging

### 3. Security
- Use secrets for sensitive data
- Implement least privilege access
- Validate all inputs
- Audit action permissions

### 4. Performance
- Cache dependencies appropriately
- Use parallel execution where possible
- Implement timeout handling
- Monitor resource usage

This SDK provides a complete framework for automating PRP-based development workflows with comprehensive testing, monitoring, and deployment capabilities.