# UML Diagrams Document

## 1. Use Case Diagram

```mermaid
flowchart LR
    Visitor((Any Visitor — no login))

    Visitor --> UC1[Browse Events]
    Visitor --> UC2[Search Events]
    Visitor --> UC3[Ask Assistant]
    Visitor --> UC4[View Event Detail]
    Visitor --> UC5[Manage Sources]
    Visitor --> UC6[Run Pipeline]
    Visitor --> UC7[Clean Database]
    Visitor --> UC8[View Pipeline Logs/Status]

    SYS((System — pipeline)) --> UC9[Collect Articles]
    SYS --> UC10[Clean Text]
    SYS --> UC11[Filter Military Topic]
    SYS --> UC12[Batch NER + Embed]
    SYS --> UC13[Cluster by Meaning]
    SYS --> UC14[Collective Summarize]
```

## 2. Class Diagram (Core Domain Model)

```mermaid
classDiagram
    class Source {
        +ObjectId id
        +string type
        +string url
        +int trust_rating
        +bool active
    }
    class Article {
        +ObjectId id
        +ObjectId source_id
        +datetime published_at
        +string category_hint
        +string status
    }
    class Entity {
        +ObjectId id
        +ObjectId article_id
        +string text
        +string type
    }
    class Event {
        +ObjectId id
        +string summary
        +string summary_source
        +string category
        +float credibility_score
        +string status
    }
    class EventArticle {
        +ObjectId event_id
        +ObjectId article_id
    }
    class ChatSession {
        +ObjectId id
    }
    class ChatMessage {
        +ObjectId id
        +ObjectId session_id
        +string role
        +string answer_source
    }
    class PipelineLog {
        +ObjectId id
        +string overall_status
        +array phases
    }
    class PipelineStatus {
        +bool running
        +ObjectId current_run_id
    }

    Source "1" --> "many" Article : provides
    Article "1" --> "many" Entity : contains
    Event "1" --> "many" EventArticle : groups
    Article "1" --> "1" EventArticle : linked via
    ChatSession "1" --> "many" ChatMessage : contains
    Event "many" <--> "many" ChatMessage : cited by
    PipelineStatus "1" --> "0..1" PipelineLog : points to
```

## 3. Sequence Diagram — Run Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Pipeline Router
    participant ORCH as Pipeline Orchestrator
    participant DB as MongoDB Atlas
    participant VEC as ChromaDB
    participant OMNI as Omniroute

    U->>FE: Click "Run Pipeline"
    FE->>API: POST /api/pipeline/run
    API->>ORCH: start_run()
    alt already running
        ORCH-->>API: 409
        API-->>FE: error
    else free
        ORCH->>DB: wipe collections
        ORCH->>VEC: wipe vectors
        ORCH-->>API: 202 {run_id}
        API-->>FE: run_id, status=running
        loop each phase
            ORCH->>DB: run phase logic
            ORCH->>OMNI: (filter/summarize calls as needed)
            ORCH->>DB: append phase JSON to pipeline_logs
        end
        ORCH->>DB: overall_status=completed
        FE->>API: GET /api/pipeline/status (poll)
        API-->>FE: phase JSON stream
    end
```

## 4. Sequence Diagram — Basic Assistant

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Assistant Router
    participant SVC as Assistant Service
    participant VEC as ChromaDB
    participant OMNI as Omniroute

    U->>FE: Ask question
    FE->>API: POST /api/assistant/chat
    API->>SVC: handle_message()
    SVC->>VEC: embed + similarity search
    VEC-->>SVC: top-K events
    alt no relevant match
        SVC-->>API: answer_source=no_match
    else relevant match
        SVC->>OMNI: grounded prompt (timeout 6-8s)
        alt Omniroute responds
            OMNI-->>SVC: answer + citations
            SVC-->>API: answer_source=omniroute
        else Omniroute fails/times out
            SVC-->>API: answer_source=fallback_excerpt (event.summary)
        end
    end
    API-->>FE: answer, citations, answer_source
```

## 5. Activity Diagram — Full Pipeline

```mermaid
flowchart TD
    A[Run Pipeline triggered] --> B{Already running?}
    B -- yes --> Z[409, no-op]
    B -- no --> C[Wipe DB + vectors]
    C --> D[Collect from sources]
    D --> E[Clean text]
    E --> F{Length >= 100?}
    F -- no --> G[rejected: too_short]
    F -- yes --> H[Keyword military check]
    H --> I{Matched?}
    I -- yes --> J[filtered_ok + category_hint]
    I -- no --> K[Omniroute classify]
    K --> L{Military?}
    L -- no --> M[rejected: off_topic]
    L -- yes --> J
    J --> N[Batch NER + Embed]
    N --> O[Cluster: embeddings only]
    O --> P[Collective summarize via Omniroute]
    P --> Q{Omniroute OK?}
    Q -- yes --> R[summary_source=omniroute]
    Q -- no --> S[TextRank fallback: summary_source=textrank_fallback]
    R --> T[status=summarized]
    S --> T
    T --> U[Pipeline complete, lock released]
```

## 6. Component Diagram

```mermaid
flowchart TB
    subgraph Frontend
        FE[React App — public, no auth]
    end
    subgraph Backend
        API[FastAPI Routers]
        ORCH[Pipeline Orchestrator]
        SVC[Service Layer]
        REPO[Repository Layer]
    end
    subgraph Data
        ATLAS[(MongoDB Atlas)]
        VDB[(ChromaDB)]
    end
    subgraph External
        OMNI[Omniroute API]
        SRC[News Sources]
    end
    subgraph Local
        TR[TextRank Fallback]
    end

    FE --> API
    API --> ORCH
    API --> SVC
    ORCH --> SVC
    SVC --> REPO
    REPO --> ATLAS
    REPO --> VDB
    SVC --> OMNI
    SVC --> TR
    ORCH --> SRC
```
