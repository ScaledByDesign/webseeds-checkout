# AI Funnel Marketing Enhancement V2 - Product Requirement Prompt (PRP)

## Document Information
- **Project**: NMI Checkout AI Funnel System Enhancement
- **Version**: 2.0 (Optimized for existing codebase)
- **Date**: 2025-01-18
- **Type**: PRP (Product Requirement Prompt)
- **Target**: AI-Assisted Development with Maximum Code Reuse

## Goal
Enhance the existing AI funnel generation system to create marketing-focused, conversion-optimized sales funnels by **extending current functionality** rather than rebuilding, maintaining all existing APIs and adding marketing intelligence.

## Why
### Business Value
- **Zero Breaking Changes**: All existing functionality continues to work
- **Incremental Enhancement**: Add marketing features without disrupting current users
- **Cost Efficiency**: 60% reduced development cost by leveraging existing code
- **Faster Time-to-Market**: 3 weeks instead of 6 weeks implementation

### User Impact
- **Backward Compatibility**: Existing funnels continue to work unchanged
- **Progressive Enhancement**: New funnels get marketing features automatically
- **Seamless Upgrade**: No user migration or retraining required

## Context

### Current System Architecture (LEVERAGING)
```typescript
// EXISTING: Core orchestration flow that we'll EXTEND
export class AIOrchestrationService {
  async createCompleteFunnel(prompt: string, options: any): Promise<CompleteFunnelResponse> {
    const analysis = await this.analyzeBusinessNeeds(prompt);        // ENHANCE
    const flow = await this.generationService.generateFlow({...});   // KEEP
    const components = await this.generateAllComponents(flow);       // ENHANCE  
    const content = await this.generateAllContent(flow, analysis);   // ENHANCE
    const integrations = await this.setupIntegrations(analysis);     // KEEP
    return { flow, components, content, integrations };
  }
}

// EXISTING: Event orchestration that we'll EXTEND
export const aiOrchestrationV3 = inngest.createFunction(
  { event: 'ai/orchestration.trigger.v2' },
  async ({ event, step }) => {
    // Phase 1: Business analysis (ENHANCE existing)
    // Phase 2: Flow generation (KEEP existing)
    // Phase 3: Component generation (ENHANCE existing)
    // Phase 4: Content generation (ENHANCE existing)
  }
);
```

#### Current APIs That We'll EXTEND (Not Replace)
- ✅ `/api/ai/analyze-business` - Add marketing fields to response
- ✅ `/api/ai/generate-components` - Add marketing copy to component generation
- ✅ `/api/ai/generate-content` - Enhance with step-specific marketing templates
- ✅ Existing Inngest event handlers - Add new optional steps

### Key Dependencies (UNCHANGED)
- OpenAI API v4 (gpt-4) ✅
- Inngest v3.x ✅
- Supabase v2.x ✅
- Puck Editor v0.15.x ✅
- Existing orchestration tables ✅

## Implementation Blueprint (MINIMAL CHANGES)

### Phase 1: Extend Business Analysis (Week 1)
**Budget**: $2,000 (75% reduction by extending existing)

#### EXTEND Existing BusinessAnalysis Interface
**File**: `src/services/ai/types.ts`
```typescript
// ADD to existing file, don't replace
export interface MarketingAnalysis extends BusinessAnalysis {
  // Existing: industry, targetAudience, goals, products, integrations, prompt
  
  // NEW: Marketing-specific fields
  marketingData?: {  // Optional to maintain backward compatibility
    valuePropositions: string[];
    painPoints: string[];
    uniqueSellingPoints: string[];
    audienceDetails: {
      psychographics: string;
      desires: string[];
      objections: string[];
    };
    competitorDifferentiation: string[];
    urgencyFactors: string[];
    socialProof: {
      types: ('testimonials' | 'reviews' | 'stats')[];
      examples: string[];
    };
  };
}
```

#### MODIFY Existing analyzeBusinessNeeds Method
**File**: `src/services/ai/services/orchestrationService.ts`
```typescript
// ENHANCE existing method, don't replace
async analyzeBusinessNeeds(prompt: string, options: { includeMarketing?: boolean } = {}): Promise<BusinessAnalysis | MarketingAnalysis> {
  // Use existing system prompt as base
  const baseSystemPrompt = `You are a business analyst specializing in sales funnel strategy...`; // EXISTING
  
  // ADD marketing enhancement if requested
  const systemPrompt = options.includeMarketing 
    ? baseSystemPrompt + `\n\nMARKETING ENHANCEMENT:\nAlso extract: value propositions, pain points, target audience desires, competitor differentiation, urgency factors, and social proof opportunities.`
    : baseSystemPrompt;

  // REUSE existing completion logic
  const completion = await this.provider.generateCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ]);

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI service');

  const parsed = JSON.parse(content);
  
  // EXTEND existing return with optional marketing data
  const baseAnalysis = {
    industry: parsed.industry || 'General',
    targetAudience: parsed.targetAudience || 'General consumers',
    goals: parsed.goals || ['Generate leads'],
    products: parsed.products || [],
    integrations: parsed.integrations || ['payment'],
    prompt: parsed.prompt || prompt
  };

  // ADD marketing data if requested
  if (options.includeMarketing && parsed.marketingData) {
    return {
      ...baseAnalysis,
      marketingData: parsed.marketingData
    } as MarketingAnalysis;
  }

  return baseAnalysis;
}
```

#### UPDATE Existing API Endpoint (Backward Compatible)
**File**: `src/app/api/ai/analyze-business/route.ts`
```typescript
// ADD optional marketing parameter to existing API
const BusinessAnalysisSchema = z.object({
  prompt: z.string().min(10).max(500),
  userId: z.string().optional(),
  includeMarketing: z.boolean().optional(), // NEW: Optional marketing enhancement
});

export async function POST(request: NextRequest) {
  // ... existing validation logic

  const { prompt, includeMarketing = false } = validatedData; // NEW parameter

  // ENHANCE existing call
  const result = await aiEngine.services.orchestration.analyzeBusinessNeeds(
    prompt, 
    { includeMarketing }  // NEW: Pass marketing option
  );

  // Existing response format maintained + optional marketing data
  return NextResponse.json({
    success: true,
    data: result,
    metadata: {
      processingTime,
      prompt,
      industry: result.industry,
      targetAudience: result.targetAudience,
      goalsCount: result.goals.length,
      hasMarketingData: 'marketingData' in result, // NEW: Indicator
    },
  });
}
```

### Phase 2: Enhance Content Generation (Week 2)
**Budget**: $2,500 (65% reduction by extending existing)

#### EXTEND Existing generateAllContent Method
**File**: `src/services/ai/services/orchestrationService.ts`
```typescript
// ENHANCE existing method signature with optional marketing parameter
async generateAllContent(
  flow: GenerateFlowResponse, 
  analysis: BusinessAnalysis,
  options: { useMarketingCopy?: boolean } = {}
): Promise<GeneratedContent[]> {
  const content: GeneratedContent[] = [];
  
  for (const node of flow.nodes) {
    try {
      // EXISTING: Basic content generation
      const basicRequest = {
        nodeType: node.type,
        context: `Industry: ${analysis.industry}, Target: ${analysis.targetAudience}`,
        target: 'all' as const
      };

      // NEW: Enhanced marketing-focused content if available
      if (options.useMarketingCopy && 'marketingData' in analysis) {
        const marketingAnalysis = analysis as MarketingAnalysis;
        const enhancedRequest = {
          ...basicRequest,
          context: this.buildMarketingContext(node, marketingAnalysis) // NEW method
        };
        
        const contentSuggestions = await this.generationService.generateContentSuggestions(enhancedRequest);
        content.push(this.formatMarketingContent(node, contentSuggestions, marketingAnalysis)); // NEW method
      } else {
        // EXISTING: Fallback to current logic
        const contentSuggestions = await this.generationService.generateContentSuggestions(basicRequest);
        content.push(this.formatBasicContent(node, contentSuggestions)); // EXISTING logic
      }
    } catch (error) {
      console.error(`Failed to generate content for node ${node.id}:`, error);
    }
  }
  
  return content;
}

// NEW: Helper methods for marketing content
private buildMarketingContext(node: FlowNode, analysis: MarketingAnalysis): string {
  const marketingData = analysis.marketingData!;
  const templates = {
    landing: `AIDA Framework - Pain Points: ${marketingData.painPoints.join(', ')} | Value Props: ${marketingData.valuePropositions.join(', ')}`,
    product: `FAB Method - USPs: ${marketingData.uniqueSellingPoints.join(', ')} | Social Proof: ${marketingData.socialProof.examples.join(', ')}`,
    checkout: `Trust Focus - Urgency: ${marketingData.urgencyFactors.join(', ')} | Objections: ${marketingData.audienceDetails.objections.join(', ')}`
  };
  
  return templates[node.type] || templates.landing;
}

private formatMarketingContent(node: FlowNode, suggestions: any, analysis: MarketingAnalysis): GeneratedContent {
  // Transform AI suggestions into marketing-focused content structure
  return {
    componentId: `${node.id}_component`,
    type: 'marketing-copy',
    content: this.selectBestSuggestion(suggestions, node.type),
    variations: suggestions.headline || [],
    metadata: {
      marketingFramework: this.getFrameworkForNodeType(node.type),
      targetEmotions: analysis.marketingData?.audienceDetails.desires || []
    }
  };
}
```

### Phase 3: Enhance Component Generation (Week 3)
**Budget**: $3,000 (50% reduction by extending existing)

#### EXTEND Existing generateAllComponents Method
**File**: `src/services/ai/services/orchestrationService.ts`
```typescript
// ENHANCE existing method to accept marketing copy
async generateAllComponents(
  flow: GenerateFlowResponse,
  analysis?: BusinessAnalysis,
  options: { 
    marketingContent?: GeneratedContent[],
    includeMarketing?: boolean 
  } = {}
): Promise<GeneratedComponent[]> {
  const components: GeneratedComponent[] = [];
  
  for (const node of flow.nodes) {
    try {
      // EXISTING: Basic component prompt
      let componentPrompt = `Create a ${node.type} component for "${node.label}". 
      This component should be suitable for a sales funnel and optimized for conversions.
      Use modern React with TypeScript and Tailwind CSS.`;
      
      // NEW: Enhanced prompt with marketing copy if available
      if (options.includeMarketing && options.marketingContent) {
        const marketingCopy = options.marketingContent.find(c => 
          c.componentId === `${node.id}_component`
        );
        
        if (marketingCopy) {
          componentPrompt = this.enhanceComponentPromptWithMarketing(
            componentPrompt, 
            marketingCopy,
            node
          ); // NEW method
        }
      }
      
      // REUSE existing component generation
      const component = await this.generationService.generateComponent(componentPrompt);
      
      // EXISTING: Component association logic
      component.id = `${node.id}_component`;
      component.metadata = {
        ...component.metadata,
        flowNodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.label,
        // NEW: Add marketing copy reference if available
        hasMarketingCopy: !!options.marketingContent
      };
      
      components.push(component);
      
    } catch (error) {
      console.error(`Failed to generate component for node ${node.id}:`, error);
    }
  }
  
  return components;
}

// NEW: Helper to enhance component prompts with marketing copy
private enhanceComponentPromptWithMarketing(
  basePrompt: string, 
  marketingCopy: GeneratedContent,
  node: FlowNode
): string {
  return `${basePrompt}

MARKETING COPY TO INCLUDE:
- Headline: ${marketingCopy.content}
- Variations: ${marketingCopy.variations.join(', ')}
- Marketing Framework: ${marketingCopy.metadata?.marketingFramework || 'Conversion-focused'}

Ensure the component implements this copy effectively with proper emphasis and call-to-action placement.`;
}
```

#### UPDATE Existing Orchestration Controller
**File**: `src/inngest/functions/ai-orchestration-v3.ts`
```typescript
// MODIFY existing controller to add optional marketing steps
export const aiOrchestrationV3 = inngest.createFunction(
  // ... existing config
  async ({ event, step }) => {
    const { sessionId, config } = event.data;
    
    // EXISTING: Phase 1 - Business analysis
    const analysisData = await step.run('analyze-business', async () => {
      // NEW: Check if marketing enhancement is requested
      const includeMarketing = config.options?.includeMarketing || false;
      
      // ENHANCE existing API call
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/analyze-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: config.prompt,
          userId: config.userId,
          includeMarketing // NEW parameter
        })
      });
      
      return response.json().then(r => r.data);
    });

    // EXISTING: Phase 2 - Flow generation (unchanged)
    const flowData = await step.run('generate-flow', async () => {
      // ... existing flow generation logic
    });

    // ENHANCED: Phase 3 - Content generation with marketing
    let contentData = [];
    if (config.options.includeContent) {
      contentData = await step.run('generate-content', async () => {
        return await aiEngine.services.orchestration.generateAllContent(
          flowData,
          analysisData,
          { useMarketingCopy: config.options?.includeMarketing } // NEW option
        );
      });
    }

    // ENHANCED: Phase 4 - Component generation with marketing
    if (config.options.includeComponents) {
      await step.run('trigger-components', async () => {
        await inngest.send({
          name: 'ai/orchestration.step.components',
          data: {
            sessionId,
            stepId: 'components',
            config,
            dependencies: { 
              analyze: analysisData,
              flow: flowData,
              content: contentData // NEW: Pass marketing content
            }
          }
        });
      });
    }

    // ... existing completion logic
  }
);
```

## User Interface Components (MINIMAL CHANGES)

### EXTEND Existing Test Page
**File**: `src/app/test-orchestration/page.tsx`
```typescript
// ADD marketing toggle to existing test configuration
const testConfig = {
  prompt: 'Create a B2B SaaS lead generation funnel',
  options: {
    flowType: 'funnel' as const,
    maxNodes: 5,
    useColors: true,
    includeComponents: true,
    includeContent: true,
    includeIntegrations: true,
    includeMarketing: true, // NEW: Enable marketing features
    industry: 'Software',
    targetAudience: 'HR managers and business owners'
  },
  userId: 'test-user-' + Date.now()
};

// ADD marketing preview to existing UI
{marketingEnabled && orchestrationData?.analysis?.marketingData && (
  <Card className="mb-8">
    <CardHeader>
      <CardTitle>🎯 Marketing Intelligence</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold">Value Propositions</h4>
          <ul className="list-disc pl-4">
            {orchestrationData.analysis.marketingData.valuePropositions.map((vp, i) => (
              <li key={i}>{vp}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold">Pain Points</h4>
          <ul className="list-disc pl-4">
            {orchestrationData.analysis.marketingData.painPoints.map((pp, i) => (
              <li key={i}>{pp}</li>
            ))}
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

## Validation Loop (LEVERAGE EXISTING)

### 1. Unit Tests (EXTEND EXISTING)
**File**: `tests/unit/ai/orchestrationService.test.ts`
```typescript
// ADD to existing test suite
describe('Marketing Enhancement', () => {
  describe('analyzeBusinessNeeds with marketing', () => {
    it('should return basic analysis when marketing disabled', async () => {
      const result = await orchestrationService.analyzeBusinessNeeds('Test prompt');
      expect(result).toHaveProperty('industry');
      expect(result).not.toHaveProperty('marketingData');
    });

    it('should return enhanced analysis when marketing enabled', async () => {
      const result = await orchestrationService.analyzeBusinessNeeds(
        'Test prompt', 
        { includeMarketing: true }
      );
      expect(result).toHaveProperty('marketingData');
      expect(result.marketingData).toHaveProperty('valuePropositions');
    });
  });
});
```

### 2. Integration Tests (EXTEND EXISTING)
**File**: `tests/integration/ai/funnelGeneration.test.ts`
```typescript
// ADD marketing tests to existing suite
describe('Enhanced Funnel Generation', () => {
  it('should maintain backward compatibility', async () => {
    const result = await orchestrationService.createCompleteFunnel('Test prompt');
    expect(result).toHaveProperty('flow');
    expect(result).toHaveProperty('components');
    // Should work exactly as before
  });

  it('should add marketing features when requested', async () => {
    const result = await orchestrationService.createCompleteFunnel(
      'Test prompt',
      { includeMarketing: true }
    );
    expect(result.analysis).toHaveProperty('marketingData');
    expect(result.content[0].metadata).toHaveProperty('marketingFramework');
  });
});
```

## Success Criteria (FOCUSED)

### Phase 1 Success Criteria
- [ ] Existing `/api/ai/analyze-business` endpoint returns same format for existing calls
- [ ] New `includeMarketing=true` parameter adds marketing data without breaking existing format
- [ ] All existing unit tests continue to pass
- [ ] New marketing fields populated when requested

### Phase 2 Success Criteria
- [ ] Existing content generation works unchanged
- [ ] Marketing-enhanced content includes framework-based copy
- [ ] Content generation maintains existing performance (under 30s)
- [ ] Marketing copy includes headlines, CTAs, and social proof elements

### Phase 3 Success Criteria
- [ ] Existing component generation unchanged when marketing disabled
- [ ] Components include marketing copy when enabled
- [ ] All existing Puck integration continues to work
- [ ] New components saved to component library with marketing metadata

## Technical Implementation Notes

### Environment Configuration (ADD TO EXISTING)
```bash
# ADD to existing .env file
AI_MARKETING_ENABLED=true
MARKETING_COPY_TIMEOUT=30000
```

### Key File Changes (MINIMAL)
- **MODIFY**: `src/services/ai/types.ts` (add MarketingAnalysis interface)
- **MODIFY**: `src/services/ai/services/orchestrationService.ts` (enhance 3 methods)
- **MODIFY**: `src/app/api/ai/analyze-business/route.ts` (add optional parameter)
- **MODIFY**: `src/inngest/functions/ai-orchestration-v3.ts` (add marketing options)
- **MODIFY**: `src/app/test-orchestration/page.tsx` (add marketing preview)

### Development Commands (ADD TO EXISTING)
```bash
# Test marketing enhancement (non-breaking)
npm run test:marketing

# Test backward compatibility
npm run test:compatibility

# Run with marketing enabled
npm run dev -- --marketing-enabled
```

## Deployment Strategy (ZERO DOWNTIME)

### Week 1: Business Analysis Enhancement
1. Deploy enhanced types and interfaces
2. Deploy backward-compatible API changes
3. Existing functionality unchanged

### Week 2: Content Enhancement
1. Deploy enhanced content generation
2. Default behavior unchanged
3. Marketing features opt-in only

### Week 3: Component Enhancement
1. Deploy enhanced component generation
2. Full backward compatibility maintained
3. Marketing features available for new funnels

This enhanced PRP provides a **60% cost reduction** by leveraging existing code while adding powerful marketing capabilities through **extension rather than replacement**.