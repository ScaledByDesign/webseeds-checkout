# PRP: Theme-Based Component System for Puck Editor

## Summary
Implement a theme-based component system that allows switching between completely different component libraries (not just CSS styling). Each theme represents a distinct design or use case with its own unique set of components.

**Confidence Score: 9/10** - Very high confidence due to comprehensive research, clear implementation path, and complete CRUD system design.

## Problem Statement
The current Puck system loads all components for all use cases. We need to:
- Support industry-specific component sets (e.g., E-commerce, SaaS, Education, Agency)
- Allow switching between component themes via dropdown
- Maintain content integrity when switching themes
- Optimize loading by only showing relevant components

## User Stories
1. As a user, I want to select a theme to see only relevant components
2. As a user, I want to switch themes without losing my content from other themes will be able to use components 
3. As a developer, I want to easily add new theme-based component sets
4. As a designer, I want each theme to have unique components appropriate for that industry

## Technical Context

### Current Architecture
- **Component Registration**: Static imports in `/src/lib/puck/funnel-config.tsx`
- **Component Location**: `/src/components/business/funnel/puck/`
- **Total Components**: 51 active components across 10 categories
- **Theme System**: Currently only handles CSS styling via `CheckoutThemeConfig`
- **Registry Pattern**: `PuckComponentRegistry` exists but underutilized

### Puck.js Limitations (Critical)
- Components must be registered at initialization
- Cannot add/remove component types at runtime
- Requires editor reinitialization for new component sets
- Reference: https://puck.run/docs/api-reference/configuration

### Industry Examples Referenced
1. **WordPress Gutenberg**: Block-based themes with pattern libraries
2. **Shopify**: Section-based architecture with theme switching
3. **Builder.io**: Dynamic component registration with model binding
4. **Webflow**: Industry-specific component libraries

## Implementation Blueprint

### Architecture Overview
```
src/
├── lib/
│   └── puck/
│       ├── themes/                    # Theme definitions
│       │   ├── registry.ts           # Theme registry
│       │   ├── e-commerce/          # E-commerce theme
│       │   │   ├── config.ts        # Theme config
│       │   │   └── components.ts    # Component imports
│       │   ├── saas/                # SaaS theme
│       │   ├── education/           # Education theme
│       │   └── agency/              # Agency theme
│       └── funnel-config.tsx        # Updated config loader
├── components/
│   └── business/
│       └── funnel/
│           └── puck/
│               └── themes/          # Theme-specific components
│                   ├── e-commerce/
│                   ├── saas/
│                   ├── education/
│                   └── agency/
```

### Phase 1: Theme Registry System

```typescript
// src/lib/puck/themes/types.ts
export interface ComponentTheme {
  id: string;
  name: string;
  description: string;
  industry: string;
  icon: string;
  components: Record<string, ComponentConfig>;
  categories: Record<string, CategoryConfig>;
  patterns?: PatternConfig[];
  defaultContent?: any;
}

// src/lib/puck/themes/registry.ts
export class ThemeRegistry {
  private static instance: ThemeRegistry;
  private themes: Map<string, ComponentTheme>;
  
  registerTheme(theme: ComponentTheme): void;
  getTheme(themeId: string): ComponentTheme;
  getAllThemes(): ComponentTheme[];
  getComponentsForTheme(themeId: string): Record<string, ComponentConfig>;
}
```

### Phase 2: Theme-Specific Component Organization

```typescript
// Example: E-commerce theme components
// src/components/business/funnel/puck/themes/e-commerce/index.ts
export const ecommerceComponents = {
  // Product Components
  ProductCard: ProductCardConfig,
  ProductGrid: ProductGridConfig,
  ProductSlider: ProductSliderConfig,
  
  // Shopping Components
  ShoppingCart: ShoppingCartConfig,
  MiniCart: MiniCartConfig,
  CheckoutSteps: CheckoutStepsConfig,
  
  // Marketing Components
  FlashSale: FlashSaleConfig,
  BundleOffer: BundleOfferConfig,
  ReviewCarousel: ReviewCarouselConfig,
};
```

### Phase 3: Dynamic Configuration Loading

```typescript
// src/lib/puck/funnel-config.tsx
export function getFunnelPuckConfig(
  stepType: FunnelStepType,
  themeId: string = 'default'
): Config {
  const themeRegistry = ThemeRegistry.getInstance();
  const theme = themeRegistry.getTheme(themeId);
  
  if (!theme) {
    console.warn(`Theme ${themeId} not found, falling back to default`);
    return getDefaultConfig(stepType);
  }
  
  return {
    components: theme.components,
    categories: theme.categories,
    root: getRootConfig(theme),
  };
}
```

### Phase 4: UI Theme Selector

```typescript
// src/components/business/funnel-visual-editor/ThemeSelector.tsx
export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  const themes = ThemeRegistry.getInstance().getAllThemes();
  
  const handleThemeChange = (newThemeId: string) => {
    if (newThemeId !== currentTheme) {
      // Warn about potential content loss
      const confirmed = confirmThemeSwitch();
      if (confirmed) {
        onThemeChange(newThemeId);
      }
    }
  };
  
  return (
    <Select value={currentTheme} onValueChange={handleThemeChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select theme" />
      </SelectTrigger>
      <SelectContent>
        {themes.map((theme) => (
          <SelectItem key={theme.id} value={theme.id}>
            <div className="flex items-center gap-2">
              <span>{theme.icon}</span>
              <span>{theme.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### Phase 5: Theme Switching Handler

```typescript
// src/app/dashboard/(auth)/funnel-visual-editor/page.tsx
const handleThemeSwitch = useCallback((newThemeId: string) => {
  // Save current content
  const currentContent = puckData;
  
  // Get new theme config
  const newConfig = getFunnelPuckConfig(stepType, newThemeId);
  
  // Attempt to preserve compatible content
  const preservedContent = preserveCompatibleContent(
    currentContent,
    currentTheme,
    newThemeId
  );
  
  // Update state
  setCurrentTheme(newThemeId);
  setFunnelConfig(newConfig);
  setPuckData(preservedContent);
  
  // Store theme preference
  localStorage.setItem('puck-theme', newThemeId);
}, [stepType, puckData, currentTheme]);
```

## Implementation Tasks

### Task 1: Create Theme Registry Infrastructure
- [ ] Create theme types and interfaces
- [ ] Implement ThemeRegistry singleton class
- [ ] Add theme registration methods
- [ ] Create theme validation utilities

### Task 2: Implement E-commerce Theme
- [ ] Create ProductCard, ProductGrid, ProductSlider components
- [ ] Create ShoppingCart, MiniCart, CheckoutSteps components
- [ ] Create FlashSale, BundleOffer, ReviewCarousel components
- [ ] Define e-commerce theme configuration
- [ ] Register e-commerce theme

### Task 3: Implement SaaS Theme
- [ ] Create PricingTable, FeatureComparison, PlanSelector components
- [ ] Create TrialBanner, DemoScheduler, ROICalculator components
- [ ] Create IntegrationShowcase, APIDocumentation components
- [ ] Define SaaS theme configuration
- [ ] Register SaaS theme

### Task 4: Implement Education Theme
- [ ] Create CourseCard, LessonList, ProgressTracker components
- [ ] Create VideoPlayer, QuizSection, CertificateDisplay components
- [ ] Create InstructorProfile, StudentTestimonial components
- [ ] Define education theme configuration
- [ ] Register education theme

### Task 5: Implement Agency Theme
- [ ] Create PortfolioGallery, CaseStudyCard, ServiceShowcase components
- [ ] Create TeamMember, ClientLogo, ProcessTimeline components
- [ ] Create ContactForm, LocationMap, Testimonial components
- [ ] Define agency theme configuration
- [ ] Register agency theme

### Task 6: Update Funnel Configuration
- [ ] Modify getFunnelPuckConfig to accept theme parameter
- [ ] Implement theme-based component loading
- [ ] Add content preservation logic
- [ ] Handle theme switching edge cases

### Task 7: Create Theme Selector UI
- [ ] Create ThemeSelector component
- [ ] Add theme preview tooltips
- [ ] Implement confirmation dialog for switching
- [ ] Add theme icons and descriptions

### Task 8: Integrate Theme System
- [ ] Update funnel-visual-editor page
- [ ] Add theme state management
- [ ] Implement theme persistence
- [ ] Handle theme switching events

### Task 9: Create Content Mapping System
- [ ] Build component compatibility matrix
- [ ] Implement content preservation algorithm
- [ ] Create fallback strategies
- [ ] Add migration warnings

### Task 10: Add Developer Tools
- [ ] Create theme development CLI
- [ ] Add theme validation command
- [ ] Create component scaffolding tool
- [ ] Add theme documentation generator

### Task 11: Implement Theme CRUD Operations
- [ ] Create theme creation interface
- [ ] Implement theme update functionality
- [ ] Add theme deletion with safeguards
- [ ] Build theme import/export system

### Task 12: Implement Component CRUD Operations
- [ ] Create component builder interface
- [ ] Add visual component editor
- [ ] Implement component versioning
- [ ] Build component marketplace integration

### Task 13: Create Theme Management Dashboard
- [ ] Design theme management UI
- [ ] Add theme analytics and usage stats
- [ ] Implement theme sharing capabilities
- [ ] Create theme backup system

### Task 14: Build Component Development Tools
- [ ] Create component code generator
- [ ] Add component preview system
- [ ] Implement hot reload for development
- [ ] Build component testing framework

## CRUD Implementation Details

### Theme CRUD Operations

#### Create Theme
```typescript
// src/app/api/themes/route.ts
export async function POST(request: Request) {
  const { name, description, industry, components } = await request.json();
  
  const theme = await themeService.createTheme({
    name,
    description,
    industry,
    components: components || {},
    author: getUserId(),
    version: '1.0.0',
    status: 'draft'
  });
  
  return NextResponse.json(theme);
}
```

#### Theme Builder UI
```typescript
// src/components/business/theme-builder/ThemeBuilder.tsx
export const ThemeBuilder: React.FC = () => {
  const [theme, setTheme] = useState<ComponentTheme>({
    id: generateId(),
    name: '',
    description: '',
    industry: '',
    icon: '📦',
    components: {},
    categories: {}
  });

  return (
    <div className="theme-builder">
      <ThemeMetadataForm theme={theme} onChange={setTheme} />
      <ComponentSelector 
        selectedComponents={Object.keys(theme.components)}
        onComponentsChange={updateComponents}
      />
      <CategoryOrganizer 
        categories={theme.categories}
        components={theme.components}
        onChange={updateCategories}
      />
      <ThemePreview theme={theme} />
    </div>
  );
};
```

#### Update Theme
```typescript
// src/lib/services/themeService.ts
export class ThemeService {
  async updateTheme(themeId: string, updates: Partial<ComponentTheme>) {
    // Validate theme ownership
    await this.validateOwnership(themeId, userId);
    
    // Version the update
    const version = await this.createVersion(themeId);
    
    // Apply updates
    const updated = await supabase
      .from('component_themes')
      .update({
        ...updates,
        version: incrementVersion(version),
        updated_at: new Date().toISOString()
      })
      .eq('id', themeId)
      .single();
      
    // Invalidate cache
    await this.invalidateThemeCache(themeId);
    
    return updated;
  }
}
```

#### Delete Theme
```typescript
export async function deleteTheme(themeId: string) {
  // Check if theme is in use
  const usage = await checkThemeUsage(themeId);
  if (usage.count > 0) {
    throw new Error(`Theme is used in ${usage.count} funnels`);
  }
  
  // Soft delete with recovery option
  await supabase
    .from('component_themes')
    .update({ 
      deleted_at: new Date().toISOString(),
      status: 'deleted' 
    })
    .eq('id', themeId);
    
  // Schedule permanent deletion after 30 days
  await scheduleJob('delete-theme', themeId, '30 days');
}
```

### Component CRUD Operations

#### Component Builder Interface
```typescript
// src/components/business/component-builder/ComponentBuilder.tsx
export const ComponentBuilder: React.FC = () => {
  const [component, setComponent] = useState<ComponentDefinition>({
    name: '',
    category: '',
    fields: [],
    defaultProps: {},
    code: '',
    preview: null
  });

  return (
    <Split>
      <ComponentEditor
        component={component}
        onChange={setComponent}
        features={{
          fieldBuilder: true,
          codeEditor: true,
          propTypes: true,
          validation: true
        }}
      />
      <ComponentPreview
        component={component}
        mockData={generateMockData(component.fields)}
      />
    </Split>
  );
};
```

#### Visual Component Editor
```typescript
// src/components/business/component-builder/VisualEditor.tsx
export const VisualComponentEditor: React.FC<{
  component: ComponentDefinition;
  onChange: (component: ComponentDefinition) => void;
}> = ({ component, onChange }) => {
  return (
    <div className="visual-editor">
      {/* Drag-and-drop field builder */}
      <FieldBuilder
        fields={component.fields}
        onChange={(fields) => onChange({ ...component, fields })}
      />
      
      {/* Visual styling editor */}
      <StyleEditor
        styles={component.styles}
        onChange={(styles) => onChange({ ...component, styles })}
      />
      
      {/* Interactive preview */}
      <InteractivePreview
        component={component}
        onElementClick={(element) => openPropertyPanel(element)}
      />
      
      {/* Code generation */}
      <CodeGenerator
        component={component}
        framework="react"
        styling="tailwind"
      />
    </div>
  );
};
```

#### Component Versioning
```typescript
// src/lib/services/componentService.ts
export class ComponentService {
  async saveComponent(
    themeId: string,
    componentName: string,
    definition: ComponentDefinition
  ) {
    // Create version snapshot
    const version = await this.createComponentVersion(
      themeId,
      componentName,
      definition
    );
    
    // Update component in theme
    await this.updateThemeComponent(themeId, componentName, {
      ...definition,
      version: version.id,
      lastModified: new Date().toISOString()
    });
    
    // Trigger hot reload in development
    if (process.env.NODE_ENV === 'development') {
      await this.triggerHotReload(themeId, componentName);
    }
    
    return version;
  }
}
```

### Theme Management Dashboard
```typescript
// src/app/dashboard/(auth)/theme-manager/page.tsx
export default function ThemeManagerPage() {
  return (
    <div className="theme-manager">
      <ThemeList>
        {themes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            actions={
              <ThemeActions
                onEdit={() => openThemeEditor(theme.id)}
                onDuplicate={() => duplicateTheme(theme.id)}
                onExport={() => exportTheme(theme.id)}
                onDelete={() => deleteTheme(theme.id)}
                onShare={() => shareTheme(theme.id)}
              />
            }
            analytics={<ThemeAnalytics themeId={theme.id} />}
          />
        ))}
      </ThemeList>
      
      <CreateThemeButton onClick={() => router.push('/theme-builder/new')} />
    </div>
  );
}
```

### Database Schema Updates
```sql
-- Themes table with full CRUD support
CREATE TABLE component_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry VARCHAR(100),
  icon VARCHAR(10),
  author_id UUID REFERENCES auth.users(id),
  version VARCHAR(20) DEFAULT '1.0.0',
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived, deleted
  is_public BOOLEAN DEFAULT false,
  components JSONB DEFAULT '{}',
  categories JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_theme_name UNIQUE(name, author_id)
);

-- Component versions for history
CREATE TABLE component_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID REFERENCES component_themes(id) ON DELETE CASCADE,
  component_name VARCHAR(255) NOT NULL,
  version_number INTEGER NOT NULL,
  definition JSONB NOT NULL,
  changelog TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_component_version UNIQUE(theme_id, component_name, version_number)
);

-- Theme usage tracking
CREATE TABLE theme_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID REFERENCES component_themes(id),
  funnel_id UUID REFERENCES funnels(id),
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

### API Endpoints
```typescript
// Theme CRUD
POST   /api/themes              // Create theme
GET    /api/themes              // List themes
GET    /api/themes/:id          // Get theme
PUT    /api/themes/:id          // Update theme
DELETE /api/themes/:id          // Delete theme
POST   /api/themes/:id/duplicate // Duplicate theme
POST   /api/themes/:id/export   // Export theme
POST   /api/themes/import       // Import theme

// Component CRUD
POST   /api/themes/:id/components           // Add component
GET    /api/themes/:id/components           // List components
GET    /api/themes/:id/components/:name     // Get component
PUT    /api/themes/:id/components/:name     // Update component
DELETE /api/themes/:id/components/:name     // Delete component
GET    /api/themes/:id/components/:name/versions // Component history

// Theme sharing
POST   /api/themes/:id/share    // Share theme
GET    /api/themes/marketplace  // Browse shared themes
POST   /api/themes/:id/fork     // Fork shared theme
```

## Validation Gates

```bash
# 1. TypeScript compilation
npm run build

# 2. ESLint checks
npm run lint

# 3. Component tests
npm run test -- --testPathPattern="themes"

# 4. Theme validation
npm run validate:themes

# 5. Visual regression tests
npm run test:visual -- --theme=e-commerce
npm run test:visual -- --theme=saas
npm run test:visual -- --theme=education
npm run test:visual -- --theme=agency

# 6. Integration tests
npm run test:integration -- --testNamePattern="theme switching"

# 7. Performance benchmarks
npm run benchmark:themes
```

## Error Handling

1. **Theme Not Found**: Fallback to default theme with warning
2. **Component Incompatibility**: Show migration dialog with options
3. **Content Loss Prevention**: Auto-save before theme switch
4. **Loading Errors**: Progressive enhancement with error boundaries
5. **Performance Issues**: Lazy load theme components

## Testing Strategy

### Unit Tests
```typescript
describe('ThemeRegistry', () => {
  it('should register and retrieve themes');
  it('should handle duplicate theme registration');
  it('should validate theme structure');
  it('should return components for theme');
});
```

### Integration Tests
```typescript
describe('Theme Switching', () => {
  it('should switch themes without data loss');
  it('should preserve compatible content');
  it('should handle incompatible components');
  it('should persist theme selection');
});
```

### E2E Tests
```typescript
describe('Theme User Flow', () => {
  it('should allow theme selection from dropdown');
  it('should display only theme-specific components');
  it('should warn before switching themes');
  it('should maintain editor state after switch');
});
```

## Performance Considerations

1. **Lazy Loading**: Load theme components on demand
2. **Code Splitting**: Separate bundles per theme
3. **Caching**: Cache theme configurations
4. **Preloading**: Preload popular themes
5. **Tree Shaking**: Remove unused theme code

## Migration Path

1. **Phase 1**: Implement theme registry without breaking changes
2. **Phase 2**: Add first theme (e-commerce) alongside existing components
3. **Phase 3**: Migrate existing components to "default" theme
4. **Phase 4**: Add remaining themes incrementally
5. **Phase 5**: Deprecate direct component imports

## Success Metrics

- Theme switching completes in < 2 seconds
- Zero content loss when switching compatible themes
- 90% component coverage across all themes
- Developer can add new theme in < 1 hour
- User satisfaction score > 4.5/5

## References

- Puck Documentation: https://puck.run/docs
- WordPress Gutenberg Architecture: https://developer.wordpress.org/block-editor/
- Builder.io Component Registry: https://www.builder.io/c/docs/custom-components
- Shopify Theme Architecture: https://shopify.dev/docs/themes/architecture
- Current Puck Config: `/src/lib/puck/funnel-config.tsx`
- Component Registry: `/src/services/customComponentEngine.ts`

## Appendix: Example Theme Definition

```typescript
// src/lib/puck/themes/e-commerce/config.ts
export const ecommerceTheme: ComponentTheme = {
  id: 'e-commerce',
  name: 'E-commerce',
  description: 'Components for online stores and product sales',
  industry: 'retail',
  icon: '🛍️',
  components: {
    // Product Display
    ProductCard: {
      fields: {
        productId: { type: 'text', label: 'Product ID' },
        showPrice: { type: 'radio', label: 'Show Price', options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false }
        ]},
        showRating: { type: 'radio', label: 'Show Rating', options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false }
        ]},
        layout: { type: 'select', label: 'Layout', options: [
          { label: 'Grid', value: 'grid' },
          { label: 'List', value: 'list' },
          { label: 'Carousel', value: 'carousel' }
        ]}
      },
      defaultProps: {
        productId: '',
        showPrice: true,
        showRating: true,
        layout: 'grid'
      },
      render: ProductCard
    },
    // ... more components
  },
  categories: {
    'Product Display': {
      components: ['ProductCard', 'ProductGrid', 'ProductSlider']
    },
    'Shopping': {
      components: ['ShoppingCart', 'MiniCart', 'CheckoutSteps']
    },
    'Marketing': {
      components: ['FlashSale', 'BundleOffer', 'ReviewCarousel']
    }
  },
  patterns: [
    {
      id: 'product-showcase',
      name: 'Product Showcase',
      components: ['ProductSlider', 'ReviewCarousel', 'FlashSale']
    }
  ]
};
```