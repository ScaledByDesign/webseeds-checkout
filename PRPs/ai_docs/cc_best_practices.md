# Claude Code Best Practices for PRP Implementation

## PRP Design Principles

### 1. Context Engineering
**Principle**: Provide comprehensive technical context upfront

**Best Practices**:
- Include current system architecture with actual code examples
- Provide precise file paths and directory structures
- Add database schemas with actual table definitions
- Include API documentation with request/response examples
- Specify dependency versions and configurations

**Example**:
```markdown
### Current System Architecture
The existing AI system has these key components:

#### Core AI Service (`/src/services/aiService.ts`)
```typescript
class AIService {
  private static instance: AIService;
  private openai: OpenAI;
  
  async generateFlow(prompt: string): Promise<FlowResponse> {
    // Actual implementation code
  }
}
```
```

### 2. Progressive Success
**Principle**: Build working software incrementally

**Best Practices**:
- Break complex features into 3-phase implementation
- Define clear success criteria for each phase
- Implement validation loops at each stage
- Ensure each phase delivers working functionality

**Example**:
```markdown
### Phase 1: Foundation (Months 1-3)
- [ ] Transform existing aiService to UnifiedAIEngine
- [ ] Add provider abstraction layer
- [ ] Implement basic orchestration
- [ ] Success: 50% reduction in creation time

### Phase 2: Enhancement (Months 4-6)
- [ ] Add analytics and performance tracking
- [ ] Implement content management system
- [ ] Add personalization capabilities
- [ ] Success: Comprehensive monitoring dashboard
```

### 3. Validation Loops
**Principle**: Include multiple levels of testing and verification

**Best Practices**:
- Unit tests for individual components
- Integration tests for system interactions
- End-to-end tests for user workflows
- Performance tests for scalability
- Manual validation checklists

**Example**:
```markdown
### Validation Loop
#### Unit Tests
```typescript
describe('UnifiedAIEngine', () => {
  it('should create complete funnel from prompt', async () => {
    const result = await engine.createCompleteFunnel(prompt);
    expect(result).toHaveProperty('flow');
    expect(result.flow.steps.length).toBeGreaterThan(0);
  });
});
```
```

## Implementation Best Practices

### 1. File Organization
```
PRPs/
├── templates/           # Base templates
├── scripts/            # Execution scripts
├── ai_docs/           # Documentation
├── completed/         # Finished PRPs
└── active-prp.md     # Current PRP
```

### 2. Code Examples
- Always include actual TypeScript/JavaScript code
- Show complete class and method signatures
- Include error handling and validation
- Provide database schema with actual SQL

### 3. Success Criteria
- Make criteria specific and measurable
- Include performance benchmarks
- Add user experience metrics
- Define acceptance tests

## Technical Implementation Patterns

### 1. Service Architecture Pattern
```typescript
// Base service with dependency injection
abstract class BaseService {
  constructor(protected dependencies: Dependencies) {}
  
  protected async validateInput<T>(input: T): Promise<T> {
    // Validation logic
  }
  
  protected async handleError(error: Error): Promise<never> {
    // Error handling
  }
}

// Concrete implementation
class UnifiedAIEngine extends BaseService {
  async executeOperation(input: Input): Promise<Output> {
    const validated = await this.validateInput(input);
    const result = await this.performOperation(validated);
    return await this.validateOutput(result);
  }
}
```

### 2. Database Schema Pattern
```sql
-- Always include complete table definitions
CREATE TABLE ai_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,
  performance_metrics JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Include indexes for performance
CREATE INDEX idx_ai_providers_status ON ai_providers(status);
CREATE INDEX idx_ai_providers_performance ON ai_providers USING GIN(performance_metrics);
```

### 3. API Endpoint Pattern
```typescript
// Complete API endpoint with error handling
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, options } = req.body;
    
    // Validate input
    const validated = await validateRequest(req.body);
    
    // Execute operation
    const result = await aiEngine.executeOperation(validated);
    
    // Return response
    res.status(200).json(result);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Testing Best Practices

### 1. Test Structure
```typescript
describe('Component Tests', () => {
  let service: ServiceType;
  
  beforeEach(() => {
    // Setup test environment
    service = new ServiceType(mockDependencies);
  });
  
  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });
  
  describe('Happy Path', () => {
    it('should handle valid input correctly', async () => {
      const input = createValidInput();
      const result = await service.execute(input);
      expect(result).toMatchSnapshot();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      const input = createInvalidInput();
      await expect(service.execute(input)).rejects.toThrow();
    });
  });
});
```

### 2. Integration Testing
```typescript
describe('Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    // Cleanup test database
    await cleanupTestDatabase();
  });
  
  it('should persist data to database', async () => {
    const result = await service.create(testData);
    
    const persisted = await database.findById(result.id);
    expect(persisted).toBeDefined();
  });
});
```

### 3. E2E Testing
```typescript
test('should complete user workflow', async ({ page }) => {
  await page.goto('/feature');
  
  await page.fill('[data-testid="input"]', 'test input');
  await page.click('[data-testid="submit"]');
  
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
});
```

## Performance Optimization

### 1. Caching Strategy
```typescript
class CachedService {
  private cache = new Map<string, any>();
  
  async getCachedResult(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const result = await this.computeResult(key);
    this.cache.set(key, result);
    return result;
  }
}
```

### 2. Database Optimization
```sql
-- Add appropriate indexes
CREATE INDEX CONCURRENTLY idx_table_query_pattern ON table_name(column1, column2);

-- Use EXPLAIN ANALYZE for query optimization
EXPLAIN ANALYZE SELECT * FROM table_name WHERE condition;
```

### 3. API Performance
```typescript
// Implement rate limiting
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Use connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000
});
```

## Security Best Practices

### 1. Input Validation
```typescript
const schema = z.object({
  prompt: z.string().min(1).max(1000),
  options: z.object({
    temperature: z.number().min(0).max(1).optional()
  }).optional()
});

const validateInput = (input: unknown) => {
  return schema.parse(input);
};
```

### 2. Authentication
```typescript
const authenticateRequest = async (req: NextApiRequest) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new Error('No token provided');
  }
  
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return payload;
};
```

### 3. Data Protection
```typescript
// Encrypt sensitive data
const encryptData = (data: string) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};
```

## Common Pitfalls to Avoid

### 1. Insufficient Context
❌ **Don't**: "Add AI features to the system"
✅ **Do**: "Extend the existing aiService singleton at `/src/services/aiService.ts` to include orchestration capabilities"

### 2. Vague Success Criteria
❌ **Don't**: "System should be faster"
✅ **Do**: "Complete funnel generation should complete in < 10 seconds with 95% success rate"

### 3. Missing Validation
❌ **Don't**: Skip testing implementation
✅ **Do**: Include comprehensive test suites with unit, integration, and E2E tests

### 4. Over-engineering
❌ **Don't**: Build complex abstractions upfront
✅ **Do**: Start with simple, working implementation and refactor as needed

## Monitoring and Observability

### 1. Logging
```typescript
const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({ level: 'info', message, meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, error?: Error) => {
    console.error(JSON.stringify({ level: 'error', message, error: error?.stack, timestamp: new Date().toISOString() }));
  }
};
```

### 2. Metrics
```typescript
const metrics = {
  incrementCounter: (name: string, value: number = 1) => {
    // Increment counter metric
  },
  recordDuration: (name: string, duration: number) => {
    // Record duration metric
  }
};
```

### 3. Health Checks
```typescript
const healthCheck = async () => {
  const checks = [
    checkDatabase(),
    checkExternalAPI(),
    checkAIService()
  ];
  
  const results = await Promise.allSettled(checks);
  const healthy = results.every(r => r.status === 'fulfilled');
  
  return { healthy, checks: results };
};
```

## Conclusion

Following these best practices ensures:
- **Successful Implementation**: Clear context and progressive success
- **Maintainable Code**: Proper architecture and testing
- **Scalable Systems**: Performance optimization and monitoring
- **Secure Applications**: Input validation and data protection

Remember: The goal is to provide AI agents with everything they need to deliver production-ready software on the first pass.