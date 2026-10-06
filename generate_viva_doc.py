"""
Script to generate the comprehensive, publication-grade Viva Preparation Guide (.docx)
for the Military OSINT Event Intelligence Platform (OSINT-EIP).
Contains 35+ in-depth technical questions, exact answers, mathematical proofs,
code-level walkthroughs, examiner counter-traps, and high-scoring defense strategies.
"""

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

VIVA_OUTPUT_PATH = r"c:\Users\Charan\codex_major\OSINT_EIP_Viva_Preparation_Guide.docx"

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_qa_card(doc, q_num, question, answer, examiner_trap=None, golden_tip=None):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "FAF6E9")
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    # Left border styling in Matcha Cream (#9CA764)
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="9CA764"/>'
        f'<w:top w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    
    # Question Header
    r_q = p.add_run(f"Q{q_num}: {question}\n")
    r_q.font.name = "Calibri"
    r_q.font.size = Pt(10.5)
    r_q.font.bold = True
    r_q.font.color.rgb = RGBColor(0x19, 0x1F, 0x0E)
    
    # Answer Body
    r_a_label = p.add_run("Detailed Answer: ")
    r_a_label.font.bold = True
    r_a_label.font.size = Pt(9.5)
    r_a_label.font.color.rgb = RGBColor(0x33, 0x3D, 0x1F)
    
    r_a = p.add_run(f"{answer}\n")
    r_a.font.size = Pt(9.5)
    r_a.font.color.rgb = RGBColor(0x24, 0x29, 0x18)
    
    # Examiner Follow-up Trap
    if examiner_trap:
        r_trap_label = p.add_run("⚠ Examiner Follow-up Trap: ")
        r_trap_label.font.bold = True
        r_trap_label.font.size = Pt(9)
        r_trap_label.font.color.rgb = RGBColor(0x8C, 0x2A, 0x1E)
        
        r_trap = p.add_run(f"{examiner_trap}\n")
        r_trap.font.size = Pt(9)
        r_trap.font.italic = True
        r_trap.font.color.rgb = RGBColor(0x5C, 0x23, 0x1A)
        
    # High-Scoring Defense Strategy
    if golden_tip:
        r_tip_label = p.add_run("★ Top-Scoring Defense Strategy: ")
        r_tip_label.font.bold = True
        r_tip_label.font.size = Pt(9)
        r_tip_label.font.color.rgb = RGBColor(0x4F, 0x68, 0x30)
        
        r_tip = p.add_run(f"{golden_tip}")
        r_tip.font.size = Pt(9)
        r_tip.font.color.rgb = RGBColor(0x19, 0x1F, 0x0E)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_table(table, col_widths, headers, data):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "FAF6E9")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        for run in p.runs:
            run.font.name = "Calibri"
            run.font.size = Pt(9.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(0x19, 0x1F, 0x0E)
            
    for r_idx, row_data in enumerate(data):
        row_cells = table.add_row().cells
        bg = "FCF9EF" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=140, right=140)
            p = row_cells[c_idx].paragraphs[0]
            for run in p.runs:
                run.font.name = "Calibri"
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(0x2D, 0x35, 0x17)
                
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

def build_viva_guide():
    print("Building Comprehensive Viva Examination Guide (.docx)...")
    doc = Document()
    
    # Page Margins
    for s in doc.sections:
        s.top_margin = Inches(1)
        s.bottom_margin = Inches(1)
        s.left_margin = Inches(1)
        s.right_margin = Inches(1)
        
        footer = s.footer
        p_ft = footer.paragraphs[0]
        p_ft.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_ft = p_ft.add_run("OSINT-EIP Project Viva & Oral Defense Master Guide | ")
        r_ft.font.name = "Calibri"
        r_ft.font.size = Pt(8.5)
        r_ft.font.color.rgb = RGBColor(0x7A, 0x85, 0x46)

    # Global Style
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(10)
    style_normal.font.color.rgb = RGBColor(0x24, 0x29, 0x18)
    style_normal.paragraph_format.line_spacing = 1.2
    style_normal.paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # HEADER / TITLE
    # -------------------------------------------------------------
    p_badge = doc.add_paragraph()
    r_badge = p_badge.add_run("MILITARY OSINT-EIP // ORAL EXAMINATION & VIVA VOCE MASTER DEFENSE MANUAL")
    r_badge.font.name = "Consolas"
    r_badge.font.size = Pt(9.5)
    r_badge.font.bold = True
    r_badge.font.color.rgb = RGBColor(0x7A, 0x85, 0x46)
    
    p_t = doc.add_heading(level=0)
    r_t = p_t.add_run("Viva Voce & Technical Defense Q&A Manual")
    r_t.font.name = "Georgia"
    r_t.font.size = Pt(24)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(0x19, 0x1F, 0x0E)

    p_sub = doc.add_paragraph()
    r_sub = p_sub.add_run(
        "Complete question-and-answer preparation guide for university project viva, technical evaluations, "
        "and architectural code reviews. Includes complete technical answers, algorithmic derivations, "
        "code-level pointers, and examiner traps."
    )
    r_sub.font.name = "Georgia"
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(0x55, 0x5C, 0x3E)

    # -------------------------------------------------------------
    # SECTION 1: CORE MOTIVATION & PROBLEM STATEMENT
    # -------------------------------------------------------------
    doc.add_heading("Section 1: Project Motivation & Domain Fundamentals", level=1)
    
    add_qa_card(
        doc,
        1,
        "What is the core objective of your project, and what real-world problem does it solve?",
        "OSINT-EIP is an automated Military Open Source Event Intelligence Platform. Traditional defense news aggregation suffers from news fragmentation, repetitive wire reporting, commercial and political noise, and conflicting claims (e.g., differing casualty numbers). Our platform continuously monitors defense news feeds, enforces a strict military domain taxonomy filter, extracts operational entities, clusters disparate articles into real-world events using a 5-signal hybrid mathematical algorithm, and generates collective multi-source summaries via a 3-tier LLM cascade.",
        "Why can't analysts just use Google News or an RSS reader like Feedly?",
        "Standard aggregators only group articles by keyword overlap or publication time and summarize individual articles in isolation. OSINT-EIP executes multi-signal semantic/entity/geographic clustering and generates a SINGLE COLLECTIVE BRIEFING synthesized from ALL member articles combined, highlighting corroborations and explicit discrepancies."
    )

    add_qa_card(
        doc,
        2,
        "What is OSINT, and why did you focus specifically on Military & Defense intelligence?",
        "OSINT stands for Open Source Intelligence—intelligence derived from publicly accessible, unclassified data such as news wires, official ministry press releases, defense blogs, and RSS feeds. We focused on the military domain because defense news demands high factual rigor, strict entity tracking (armed forces, weapon systems, geographic operational theaters), and rapid identification of conflicting battle damage assessments across competing international news outlets.",
        "Is scraping and monitoring public news feeds legal and ethical?",
        "Yes, OSINT strictly monitors publicly available RSS and REST endpoints without bypassing paywalls or violating terms of service. Furthermore, our platform stores citations and member article links, maintaining full journalistic provenance."
    )

    add_qa_card(
        doc,
        3,
        "Why is there NO authentication or login system in this platform?",
        "This is an intentional architectural law defined in our project specification (docs/01-project-proposal.md and AGENTS.md). The platform is engineered as a fully public research intelligence dashboard and verifiable RAG assistant for defense observers and researchers worldwide. Introducing authentication, JWT tokens, session cookies, and user tables would add unnecessary architectural overhead without enhancing the core analytical clustering or synthesis pipeline.",
        "Wouldn't an enterprise military platform require strict Role-Based Access Control (RBAC)?",
        "Explain that in an enterprise military intranet, network perimeter security, VPNs, and reverse-proxy gateways handle network access. At the application layer, this platform was specifically scoped as an open public research portal. If enterprise RBAC is needed, API gateway middleware can be placed in front without altering the core pipeline."
    )

    # -------------------------------------------------------------
    # SECTION 2: SYSTEM ARCHITECTURE & TECH STACK
    # -------------------------------------------------------------
    doc.add_heading("Section 2: System Architecture & Technology Selection", level=1)

    add_qa_card(
        doc,
        4,
        "Explain your high-level system architecture. What are the main tiers?",
        "The architecture consists of four distinct decoupled tiers: (1) Presentation Layer: React 19 SPA built with Tailwind CSS v4 and Vite, using our approved Matcha Cream (#9CA764) and Milky Honey (#F1E8C7) design system; (2) API & Application Layer: Asynchronous FastAPI backend in Python 3.12 managing the 7-phase deterministic pipeline; (3) Intelligence & Inference Layer: spaCy for NER, sentence-transformers for 384-d embeddings, a 5-signal hybrid clustering engine, and a 3-tier LLM synthesis cascade (Qwen3-14B tunnel -> OpenRouter -> Local Heuristic); and (4) Storage Layer: MongoDB Atlas cloud cluster for documents and ChromaDB for vector indexing.",
        "Why did you use both MongoDB and ChromaDB? Isn't one database enough?",
        "MongoDB Atlas handles transactional document storage (nested articles, events, telemetry logs, source registries) with rich queries and indexing. ChromaDB is a specialized vector store optimized for sub-millisecond approximate nearest neighbor (ANN) cosine similarity search over 384-dimensional dense vectors for RAG and semantic retrieval. Using each for its specialized domain yields optimal performance and separation of concerns."
    )

    add_qa_card(
        doc,
        5,
        "Why did you choose FastAPI over Flask or Django?",
        "FastAPI is natively asynchronous (AsyncIO), which is critical for Phase 2 where we concurrently poll multiple RSS feeds and API endpoints using httpx without blocking the event loop. In addition, FastAPI uses Pydantic v2 for automatic, high-performance request/response data validation and automatic OpenAPI documentation generation. Django is too heavy and monolithic with built-in ORM and auth that we explicitly do not need.",
        "What ASGI server are you using to run FastAPI?",
        "We use Uvicorn with the uvloop event loop implementation for maximum async throughput."
    )

    add_qa_card(
        doc,
        6,
        "Why is MongoDB Atlas cloud-only? Why not use a local MongoDB instance?",
        "Using MongoDB Atlas via the MONGODB_URI environment variable ensures the platform is cloud-native, portable, and accessible across distributed deployment environments (e.g., cloud VMs or local machines) without requiring a local database daemon to be installed, running, or maintained on developer machines. It also ensures persistent storage for source registries across environments."
    )

    add_qa_card(
        doc,
        7,
        "What is Motor in Python, and why is it preferred over standard PyMongo in FastAPI?",
        "Motor is an asynchronous Python driver for MongoDB built on top of Tornado and AsyncIO. Standard PyMongo is synchronous and blocking; if PyMongo executes a slow database query, it blocks Python's single-threaded event loop, preventing all other concurrent requests from being processed. Motor integrates natively with FastAPI's async def endpoints, allowing other requests to execute while waiting for MongoDB I/O."
    )

    add_qa_card(
        doc,
        8,
        "Why use Pydantic schemas instead of raw Python dictionaries?",
        "Pydantic v2 provides strict data validation, automatic type casting, JSON serialization, and comprehensive error reporting at runtime. If an API request sends an invalid date or an unrecognized protocol, Pydantic immediately returns an informative HTTP 422 Unprocessable Entity error before bad data reaches the database or processing pipelines."
    )

    # -------------------------------------------------------------
    # SECTION 3: THE 7-PHASE PIPELINE FLOW
    # -------------------------------------------------------------
    doc.add_heading("Section 3: The 7-Phase Ingestion & Processing Pipeline", level=1)

    add_qa_card(
        doc,
        9,
        "Walk me through the pipeline execution. What happens when a user clicks 'Execute Pipeline Run'?",
        "When an analyst triggers POST /api/pipeline/run, the backend acquires an execution concurrency lock (returning 409 if already running). It executes 7 phases: Phase 1 (Clean DB): Purges volatile MongoDB collections and ChromaDB collections, strictly preserving the sources collection. Phase 2 (Ingestion): Concurrently fetches all active RSS/API feeds, deduplicating via SHA-256 URL hashing. Phase 3 (Cleaning): Strips HTML, ads, and normalizes publication dates to UTC ISO-8601. Phase 4 (Topic Filter): Enforces military defense taxonomy, rejecting off-topic news. Phase 5 (Vectorization): Extracts spaCy entities and computes 384-d MiniLM dense vectors. Phase 6 (Hybrid Clustering): Runs 5-signal similarity math to form Event clusters (>= 0.62). Phase 7 (Synthesis): Synthesizes collective multi-wire summaries via the 3-tier LLM cascade.",
        "What happens if Phase 7 fails or an LLM times out? Does the whole pipeline crash?",
        "No. Phase 7 implements a 3-tier cascade: if Tier 1 (Qwen3-14B) times out or fails, it falls back to Tier 2 (OpenRouter). If Tier 2 fails or is rate-limited, it falls back to Tier 3 (Deterministic Local Heuristic). The event is NEVER left unsummarized, and errors are recorded in pipeline_logs without halting the pipeline."
    )

    add_qa_card(
        doc,
        10,
        "Why do you wipe the database on every pipeline run? Isn't that destructive?",
        "This is an explicit architectural law (Law 4). In military OSINT, event detection must be deterministic and reproducible without historical ghost events, stale vector embeddings, or drifting clusters. Because this is a manual trigger pipeline, every run represents a fresh, consistent intelligence snapshot. Crucially, the sources collection is NEVER wiped—configured feeds remain permanently preserved."
    )

    add_qa_card(
        doc,
        11,
        "How do you handle duplicate news articles across multiple RSS feeds?",
        "In Phase 2, we perform URL canonicalization: stripping tracking parameters (e.g., utm_source, utm_campaign, fbclid), normalizing scheme and host, and hashing the resulting canonical URL with SHA-256. If a story with that URL hash already exists in the current run's memory or database, it is immediately skipped with zero duplicate insertions."
    )

    add_qa_card(
        doc,
        12,
        "How does Phase 4 (Topic Filter) distinguish between a military missile test and a commercial space launch like SpaceX?",
        "The military topic filter uses a specialized defense taxonomy. Commercial keywords (Falcon 9, Starlink, telecom, NASA, commercial satellite, tourists) are explicitly penalized or excluded, while military indicators (ballistic missile, ICBM, warhead, air defense interception, defense ministry, combat readiness) trigger high defense confidence scores. Articles below the threshold are rejected before vectorization."
    )

    # -------------------------------------------------------------
    # SECTION 4: HYBRID CLUSTERING ALGORITHM (CRITICAL)
    # -------------------------------------------------------------
    doc.add_heading("Section 4: Hybrid Multi-Signal Event Clustering (Core Innovation)", level=1)

    add_qa_card(
        doc,
        13,
        "Explain your hybrid clustering algorithm. What are the signals and weights?",
        "Our hybrid clustering algorithm calculates pairwise similarity between reports using a weighted linear combination of five orthogonal signals:\n"
        "Score(A_i, A_j) = 0.55 * S_sem + 0.18 * S_ent + 0.12 * S_loc + 0.10 * S_time + 0.05 * S_meta\n"
        "• S_sem (55%): Cosine similarity between 384-d dense embeddings (captures narrative/semantic equivalence).\n"
        "• S_ent (18%): Jaccard index of extracted named entities (matching military units, actors, weapons).\n"
        "• S_loc (12%): Jaccard index of geographic entities (GPE/LOC, preventing conflation of different battlefronts).\n"
        "• S_time (10%): Exponential decay exp(-dt / tau) where tau = 48h (penalizes temporally distant reports).\n"
        "• S_meta (5%): Source diversity bonus awarded when reports originate from competing news wire publishers.\n"
        "Threshold: If composite Score >= 0.62, the articles merge into a unified Event.",
        "How did you arrive at the weights (0.55, 0.18, 0.12, 0.10, 0.05) and the 0.62 threshold?",
        "Through empirical tuning on defense news corpora. Semantic vector cosine provides the strongest thematic anchor (0.55), but alone can conflate separate drills in different countries; adding Entity (0.18) and Location (0.12) ensures precise operational grounding. The 0.62 threshold balances precision and recall—preventing false merges while grouping multi-source reports."
    )

    add_qa_card(
        doc,
        14,
        "What is the Jaccard similarity index, and how is it calculated for entities?",
        "The Jaccard similarity index measures the overlap between two sets. It is calculated as the size of the intersection divided by the size of the union:\n"
        "J(E_1, E_2) = |E_1 ∩ E_2| / |E_1 ∪ E_2|\n"
        "For example, if Article A mentions {'NATO', 'Ukraine', 'Patriot'} and Article B mentions {'NATO', 'Ukraine', 'F-16'}, the intersection is {'NATO', 'Ukraine'} (size 2) and the union is {'NATO', 'Ukraine', 'Patriot', 'F-16'} (size 4), yielding Jaccard = 2/4 = 0.50."
    )

    add_qa_card(
        doc,
        15,
        "What is Cosine Similarity, and why is it preferred over Euclidean Distance for text embeddings?",
        "Cosine similarity measures the cosine of the angle between two multi-dimensional vectors:\n"
        "Cosine(u, v) = (u · v) / (||u|| * ||v||)\n"
        "It ranges from -1 to +1 (or 0 to 1 for normalized text embeddings). It is preferred over Euclidean distance because it evaluates vector orientation (thematic topic) rather than vector magnitude (document length), ensuring short news bulletins and long in-depth articles on the same topic have high similarity."
    )

    add_qa_card(
        doc,
        16,
        "What happens to an article that doesn't match any other article with Score >= 0.62?",
        "It forms a 'singleton event' (an event with article_count = 1). In intelligence monitoring, single-source reports (e.g., an exclusive breaking report on a missile test) are still highly valuable and must never be discarded simply because another outlet hasn't reported it yet."
    )

    add_qa_card(
        doc,
        17,
        "How do you convert pairwise article similarity scores into multi-article event clusters?",
        "We construct an adjacency graph where each article is a vertex, and an undirected edge connects two vertices if their composite similarity score >= 0.62. We then apply Connected Components Graph Traversal (via BFS or DFS). All vertices in a connected component form a unified multi-article Event cluster."
    )

    # -------------------------------------------------------------
    # SECTION 5: THREE-TIER LLM CASCADE & COLLECTIVE SUMMARIZATION
    # -------------------------------------------------------------
    doc.add_heading("Section 5: Three-Tier LLM Cascade & Collective Summarization", level=1)

    add_qa_card(
        doc,
        18,
        "Why do you have THREE tiers in your LLM cascade? What are they?",
        "Tier 1 is Qwen3-14B accessed via a local or Colab Cloudflare tunnel (primary model with deep analytical capacity and zero per-token cost). Tier 2 is OpenRouter API (secondary cloud failover gateway, using Qwen-2.5-72B or Mistral). Tier 3 is a Deterministic Local Structured Fallback running pure Python heuristic extraction. This ensures high synthesis quality during normal operations while guaranteeing 100% platform uptime even under external API outages.",
        "What if the internet is completely disconnected? Does Tier 3 need an internet connection?",
        "No! Tier 3 is completely local and offline. It uses regex and heuristic linguistic extraction to pull lead sentences, key dates, and entity mentions. It executes in under 50 milliseconds with zero external API dependencies."
    )

    add_qa_card(
        doc,
        19,
        "What makes your summarization 'collective'? How does it differ from standard AI summarization?",
        "Standard tools summarize a single article. In OSINT-EIP, an event may contain 5 different news reports from Reuters, TASS, AP, and Defense News. Our summarizer receives ALL member articles combined into a single prompt. The LLM is instructed to synthesize a comprehensive 4-to-5 line collective briefing, explicitly noting confirmed facts corroborated by all wires, and highlighting any discrepancies (such as one source reporting 10 casualties while another reports 25)."
    )

    add_qa_card(
        doc,
        20,
        "How do you control LLM hallucination during summarization?",
        "Through strict prompt engineering constraints and grounded input windows. The system prompt instructs the model: 'You are an objective military intelligence analyst. Synthesize ONLY the facts provided in the member articles. Do NOT speculate, extrapolate, or invent details. If casualty numbers or attribution are contested, explicitly note the discrepancy.' In addition, the temperature is set low (0.2) to enforce factual determinism."
    )

    add_qa_card(
        doc,
        21,
        "What prompt structure did you use to get 4-to-5 line comprehensive summaries?",
        "We prompt the model with explicit line-length constraints, structured section markers, and zero-shot examples: 'Write an executive briefing of at least 4 to 5 comprehensive lines. Include operational context, engaged armed units, weapon systems employed, stated strategic objectives, and corroborations across sources. Do not output vague one-liners.'"
    )

    # -------------------------------------------------------------
    # SECTION 6: RAG ASSISTANT & VECTOR SEARCH
    # -------------------------------------------------------------
    doc.add_heading("Section 6: Grounded RAG Assistant & Vector Search", level=1)

    add_qa_card(
        doc,
        22,
        "What is RAG, and how does it work in your AI Assistant?",
        "RAG stands for Retrieval-Augmented Generation. Instead of asking an LLM to rely on its static training data (which has a knowledge cutoff and can hallucinate), our RAG workflow: (1) Vectorizes the user's question via all-MiniLM-L6-v2; (2) Queries ChromaDB vector store over the osint_events collection using cosine distance to retrieve the top 5 relevant event dossiers; (3) Injects these retrieved event briefs as grounding context into the LLM prompt; (4) The LLM generates an answer based strictly on the retrieved context, citing specific event IDs (e.g. Report #e4b109).",
        "What happens if an analyst asks a question about something NOT in the ingested data?",
        "The prompt explicitly instructs the LLM: 'If the provided event intelligence does not contain evidence to answer the query, state clearly that no matching evidence was found in the current intelligence index.' It returns a grounded 'No match' status rather than hallucinating an answer."
    )

    add_qa_card(
        doc,
        23,
        "What embedding model did you use, and what is its vector dimensionality?",
        "We use sentence-transformers/all-MiniLM-L6-v2, which produces 384-dimensional dense vectors. It is fast, lightweight (~80MB), and maintains high semantic fidelity on short-to-medium text passages."
    )

    add_qa_card(
        doc,
        24,
        "What is ChromaDB's underlying indexing algorithm?",
        "ChromaDB uses HNSW (Hierarchical Navigable Small World) graphs for Approximate Nearest Neighbor (ANN) search. HNSW builds multi-layer graphs that allow logarithmic O(log N) search times rather than brute-force O(N) linear scans across vectors."
    )

    # -------------------------------------------------------------
    # SECTION 7: FRONTEND & DESIGN SYSTEM
    # -------------------------------------------------------------
    doc.add_heading("Section 7: Frontend Architecture & Editorial Design System", level=1)

    add_qa_card(
        doc,
        25,
        "What is your frontend design system? What colors did you use?",
        "Our frontend follows an editorial, research-oriented intelligence aesthetic built around two approved colors: (1) Matcha Cream (#9CA764) used as the primary action accent, active navigation state, and status indicators; and (2) Milky Honey (#F1E8C7) used as the dominant light surface background, paired with soft cream panels (#FAF6E9) and neutral borders (#DDD2A8). Dark mode uses a deep warm olive-charcoal (#161912) derived systematically from the palette.",
        "Why did you avoid typical SaaS colors like bright blue or dark cyberpunk purple?",
        "The project specification explicitly mandates avoiding neon, cyberpunk, gaming, or generic SaaS aesthetics. The platform is designed to look like a serious, credible military intelligence briefing dossier—calm, precise, readable, and research-focused."
    )

    add_qa_card(
        doc,
        26,
        "Why is there NO map visualization in your platform?",
        "The map was explicitly removed from the project requirements (Rule 3 in project specifications). While novice observers assume every military tool must have a map, defense news wires often lack precise geo-coordinates (e.g. reporting 'Baltic Sea' or 'border region'). Pinning imprecise news to arbitrary map pins generates misleading visual intelligence. Instead, we prioritize structured event dossiers, chronological timelines, and actor directories."
    )

    add_qa_card(
        doc,
        27,
        "How did you implement Light and Dark mode without scattering hardcoded colors?",
        "We implemented centralized design tokens in index.css using Tailwind v4's @custom-variant dark (&:where(.dark, .dark *)) and CSS variables. Dark mode is toggled via document.documentElement.classList.toggle('dark') and persisted in localStorage (osint_theme). Components use unified tokens (e.g. dark:bg-[#161912] dark:text-[#F1E8C7]) so switching themes is instant and cohesive."
    )

    # -------------------------------------------------------------
    # SECTION 8: TESTING, DEPLOYMENT & RELIABILITY
    # -------------------------------------------------------------
    doc.add_heading("Section 8: Quality Assurance, Testing & Error Handling", level=1)

    add_qa_card(
        doc,
        28,
        "How did you test your backend, and what is your test coverage?",
        "We wrote an automated test suite using pytest across 7 test modules in backend/tests/: (1) test_api_read.py (verifies all GET endpoints and Pydantic response models); (2) test_assistant.py (verifies RAG query flow and citations); (3) test_clustering.py (verifies 5-signal composite math and 0.62 thresholding); (4) test_ner_embedding.py (verifies entity extraction and 384-d vectors); (5) test_pipeline_control.py (verifies execution lock, 409 conflict, and clean-db); (6) test_summarization.py (verifies LLM cascade and local fallback); and (7) test_topic_filter.py (verifies military topic inclusion and off-topic rejection). All 23 out of 23 unit tests pass in 10.71 seconds."
    )

    add_qa_card(
        doc,
        29,
        "What happens if two users click 'Run Pipeline' at the exact same moment?",
        "The backend uses an atomic pipeline execution lock. When the first request arrives, it checks is_running. If false, it flips is_running = True and proceeds. The concurrent request detects is_running == True and immediately returns HTTP 409 Conflict with the JSON message: 'Pipeline execution already in progress'."
    )

    add_qa_card(
        doc,
        30,
        "How does the frontend track real-time pipeline execution progress without WebSockets?",
        "The frontend uses polling over GET /api/pipeline/status every 2 seconds when an active run is detected. The status response returns a phases_so_far array detailing which of the 7 stages have completed, which is currently running, and any errors encountered. When running becomes false, polling stops."
    )

    add_qa_card(
        doc,
        31,
        "What is the difference between POST /api/pipeline/clean-db and POST /api/pipeline/run?",
        "clean-db strictly wipes volatile collections (articles, events, logs, Chroma vector stores) without executing new ingestion, leaving the database empty (except for sources). run wipes volatile collections first and then immediately proceeds through all 7 phases to ingest and cluster fresh intelligence."
    )

    add_qa_card(
        doc,
        32,
        "What happens if an RSS feed endpoint is offline or returns HTTP 500 during Phase 2?",
        "The ingestion service wraps each feed request in a try-except block with a 15-second timeout. If a feed fails or times out, it logs an error in the Phase 2 telemetry JSON and continues fetching the remaining feeds without crashing the pipeline."
    )

    add_qa_card(
        doc,
        33,
        "What are the current limitations of the platform, and how can it be improved in the future?",
        "Current limitations: (1) News feeds currently rely on English-language RSS and APIs; future work could add multi-lingual translation (e.g. Russian, Arabic, Mandarin wires) via NLLB; (2) The pipeline is triggered manually via REST API; while intentional by design, future iterations could offer scheduled Webhook triggers; (3) Entity extraction uses spaCy's standard NER; upgrading to a specialized defense-domain GLiNER model could isolate military unit designations and tactical call-signs with higher granularity."
    )

    add_qa_card(
        doc,
        34,
        "Why did you use React 19 and Tailwind CSS v4 instead of a component library like Material UI or Ant Design?",
        "Component libraries like MUI or AntD impose heavy default styles (bright blues, standard shadows) that conflict directly with our custom editorial military intelligence design requirements. React 19 + Tailwind CSS v4 gives us complete atomic control over design tokens, ensuring our exact Matcha Cream (#9CA764) and Milky Honey (#F1E8C7) aesthetic with zero CSS bloat."
    )

    add_qa_card(
        doc,
        35,
        "Summarize the complete lifecycle of a single defense news story in your system from ingestion to the dashboard.",
        "A story flows through 6 states: (1) Ingested via RSS, deduplicated by URL SHA-256; (2) Sanitized (HTML stripped, date parsed to UTC ISO-8601); (3) Evaluated by Topic Filter against defense taxonomy; (4) Processed by spaCy for entities and vectorized to 384-d by MiniLM; (5) Evaluated against other stories via 5-signal hybrid clustering (Score >= 0.62) to form an Event; (6) Combined with fellow member stories into a collective prompt synthesized by Qwen3-14B into an Event Dossier displayed on the dashboard."
    )

    # -------------------------------------------------------------
    # SECTION 9: RAPID CHEATSHEET TABLE (FLASH MEMORY)
    # -------------------------------------------------------------
    doc.add_page_break()
    doc.add_heading("Section 9: Rapid Viva Cheatsheet (Memorize Before Exam)", level=1)
    
    t_cheat = doc.add_table(rows=1, cols=3)
    format_table(
        t_cheat,
        [Inches(2.0), Inches(2.2), Inches(2.8)],
        ["Concept / Metric", "Key Value / Answer", "Key Formula / Rationale"],
        [
            ["Clustering Equation", "0.55 Sem + 0.18 Ent + 0.12 Loc + 0.10 Time + 0.05 Meta", "Threshold >= 0.62 forms Event clusters."],
            ["Temporal Half-life", "tau = 48 hours", "Exponential decay exp(-dt / tau)."],
            ["Embedding Dimension", "384 dimensions", "all-MiniLM-L6-v2 sentence-transformer."],
            ["NER Engine", "spaCy en_core_web_sm", "Extracts ORG, LOC, GPE, weapons, dates."],
            ["Primary LLM", "Qwen3-14B via Tunnel", "Timeout: 30s. Deep reasoning, zero API cost."],
            ["Secondary LLM", "OpenRouter Cloud API", "Timeout: 10s. Qwen-2.5-72B / Mistral failover."],
            ["Tertiary LLM", "Deterministic Local Heuristic", "Timeout: <50ms. Zero-dependency offline fail-safe."],
            ["Primary Colors", "Matcha #9CA764 & Honey #F1E8C7", "Editorial research intelligence palette."],
            ["Primary Database", "MongoDB Atlas (Cloud)", "URI connection. Volatile collections wiped on run."],
            ["Vector Store", "ChromaDB (Local Index)", "osint_articles and osint_events collections."],
            ["Concurrency Control", "HTTP 409 Conflict", "Single-run lock prevents duplicate pipeline runs."],
            ["Preserved Collection", "sources collection", "All other collections wiped on pipeline execution."],
            ["Test Suite", "23/23 tests passing (10.71s)", "pytest testing all 7 pipeline stages."]
        ]
    )

    print(f"Saving Viva Preparation Guide to {VIVA_OUTPUT_PATH}...")
    doc.save(VIVA_OUTPUT_PATH)
    print("SUCCESS: Comprehensive Viva guide created successfully!")

if __name__ == "__main__":
    build_viva_guide()
