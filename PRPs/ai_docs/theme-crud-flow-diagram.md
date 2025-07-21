# Theme CRUD System Flow Diagrams

## Theme Management Flow

```mermaid
graph TB
    A[User Dashboard] --> B{Action}
    B -->|Create| C[Theme Builder]
    B -->|Edit| D[Theme Editor]
    B -->|Delete| E[Confirm Delete]
    B -->|Share| F[Share Settings]
    
    C --> G[Define Metadata]
    G --> H[Select Components]
    H --> I[Organize Categories]
    I --> J[Preview Theme]
    J --> K{Save}
    K -->|Draft| L[Save as Draft]
    K -->|Publish| M[Publish Theme]
    
    D --> N[Load Theme]
    N --> O[Edit Components]
    O --> P[Update Metadata]
    P --> Q[Version Control]
    Q --> R[Save Changes]
    
    E --> S{In Use?}
    S -->|Yes| T[Show Warning]
    S -->|No| U[Soft Delete]
    U --> V[Schedule Cleanup]
    
    F --> W[Set Permissions]
    W --> X[Generate Share Link]
    X --> Y[Publish to Marketplace]
```

## Component CRUD Flow

```mermaid
graph LR
    A[Component Library] --> B{Action}
    B -->|Create| C[Component Builder]
    B -->|Edit| D[Component Editor]
    B -->|Delete| E[Remove Component]
    B -->|Duplicate| F[Clone Component]
    
    C --> G{Builder Mode}
    G -->|Visual| H[Drag & Drop Builder]
    G -->|Code| I[Code Editor]
    G -->|Split| J[Split View]
    
    H --> K[Design Interface]
    K --> L[Set Properties]
    L --> M[Add Interactions]
    M --> N[Generate Code]
    
    I --> O[Write Component]
    O --> P[Define Props]
    P --> Q[Add Validation]
    Q --> R[Test Component]
    
    N --> S[Save Component]
    R --> S[Save Component]
    S --> T[Version Control]
    T --> U[Update Theme]
```

## Theme Switching Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as UI
    participant TS as Theme Service
    participant PC as Puck Config
    participant CM as Content Manager
    
    U->>UI: Select New Theme
    UI->>TS: Request Theme Switch
    TS->>CM: Check Content Compatibility
    CM-->>TS: Compatibility Report
    TS-->>UI: Show Warning (if needed)
    UI->>U: Confirm Switch?
    U->>UI: Confirm
    UI->>TS: Execute Switch
    TS->>PC: Load New Theme Config
    TS->>CM: Migrate Content
    CM-->>TS: Migrated Content
    TS->>PC: Apply Theme
    PC-->>UI: Theme Applied
    UI-->>U: Theme Switched
```

## Component Development Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Component
    Draft --> InDevelopment: Start Development
    InDevelopment --> Testing: Run Tests
    Testing --> InDevelopment: Tests Failed
    Testing --> Review: Tests Passed
    Review --> InDevelopment: Changes Requested
    Review --> Published: Approved
    Published --> Deprecated: Mark as Deprecated
    Published --> InDevelopment: Update Component
    Deprecated --> Archived: Archive
    Archived --> [*]
```

## Theme Marketplace Flow

```mermaid
graph TD
    A[Developer] --> B[Create Theme]
    B --> C[Test Locally]
    C --> D[Package Theme]
    D --> E[Submit to Marketplace]
    E --> F{Review}
    F -->|Approved| G[Published]
    F -->|Rejected| H[Feedback]
    H --> C
    
    G --> I[Browse Marketplace]
    I --> J[User]
    J --> K{Action}
    K -->|Install| L[Import Theme]
    K -->|Fork| M[Create Copy]
    K -->|Purchase| N[Payment]
    N --> L
    
    L --> O[Use in Project]
    M --> P[Customize Theme]
    P --> B
```

## Database Relationships

```mermaid
erDiagram
    USERS ||--o{ COMPONENT_THEMES : creates
    COMPONENT_THEMES ||--o{ COMPONENTS : contains
    COMPONENT_THEMES ||--o{ THEME_VERSIONS : has
    COMPONENT_THEMES ||--o{ THEME_USAGE : tracks
    COMPONENTS ||--o{ COMPONENT_VERSIONS : versioned
    THEME_USAGE }o--|| FUNNELS : uses
    
    COMPONENT_THEMES {
        uuid id PK
        string name
        string industry
        string status
        jsonb components
        jsonb categories
        timestamp created_at
        timestamp updated_at
    }
    
    COMPONENTS {
        uuid id PK
        uuid theme_id FK
        string name
        jsonb definition
        string version
        timestamp created_at
    }
    
    COMPONENT_VERSIONS {
        uuid id PK
        uuid component_id FK
        string version_number
        jsonb changes
        string changelog
        timestamp created_at
    }
```

## Performance Architecture

```mermaid
graph TB
    A[User Request] --> B{Cache Check}
    B -->|Hit| C[Memory Cache]
    B -->|Miss| D[IndexedDB]
    D -->|Miss| E[CDN]
    E -->|Miss| F[Database]
    
    C --> G[Return Theme]
    D --> H[Update Memory]
    H --> G
    E --> I[Update Local]
    I --> H
    F --> J[Update All Caches]
    J --> I
    
    subgraph "Lazy Loading"
        K[Theme Metadata] --> L[Load on Init]
        M[Component Code] --> N[Load on Demand]
        O[Assets] --> P[Preload Critical]
    end
```

## Security Model

```mermaid
graph LR
    A[User] --> B{Authentication}
    B -->|Success| C{Authorization}
    B -->|Fail| D[Deny Access]
    
    C -->|Owner| E[Full Access]
    C -->|Collaborator| F[Edit Access]
    C -->|Viewer| G[Read Only]
    C -->|Public| H[Limited Access]
    
    E --> I[CRUD Operations]
    F --> J[Edit Components]
    G --> K[View Only]
    H --> L[Use in Projects]
    
    subgraph "Component Sandbox"
        M[Untrusted Code] --> N[Sandbox Environment]
        N --> O[Limited DOM Access]
        N --> P[No Network Access]
        N --> Q[No Storage Access]
    end
```

## Backup Strategy

```mermaid
gantt
    title Theme Backup Schedule
    dateFormat  HH:mm
    section Hourly
    Quick Save     :done, 00:00, 1h
    Quick Save     :done, 01:00, 1h
    Quick Save     :done, 02:00, 1h
    
    section Daily
    Full Backup    :active, 03:00, 30m
    
    section Weekly
    Archive        :crit, 04:00, 1h
    
    section Monthly
    Offsite Backup :milestone, 05:00, 0m
```

## Error Handling Flow

```mermaid
graph TB
    A[Operation] --> B{Success?}
    B -->|No| C[Error Type]
    B -->|Yes| D[Complete]
    
    C --> E{Recoverable?}
    E -->|Yes| F[Auto Retry]
    E -->|No| G[User Notification]
    
    F --> H{Retry Success?}
    H -->|Yes| D
    H -->|No| I[Fallback Strategy]
    
    I --> J{Fallback Success?}
    J -->|Yes| K[Degraded Success]
    J -->|No| G
    
    G --> L[Log Error]
    L --> M[Show Options]
    M --> N[User Decision]
```