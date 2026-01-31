-- =====================================================
-- INDIAN CONTRACT ACT STORAGE
-- =====================================================

-- Full text of all 225 sections from 53-page PDF
CREATE TABLE IF NOT EXISTS act_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_number TEXT NOT NULL UNIQUE,   -- "Section 27", "Section 23"
  section_title TEXT NOT NULL,           -- "Agreements in restraint of trade"
  full_text TEXT NOT NULL,               -- Complete section text from PDF
  summary TEXT NOT NULL,                 -- Plain English summary
  page_number INTEGER,                   -- Page in PDF (1-53)
  chapter TEXT,                          -- "Chapter II: Of Contracts"
  gov_url TEXT DEFAULT 'https://www.indiacode.nic.in/bitstream/123456789/2187/2/A187209.pdf',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chunked text for semantic search (future: add embeddings)
CREATE TABLE IF NOT EXISTS act_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_number TEXT NOT NULL,
  chunk_text TEXT NOT NULL,             -- 500-word chunks
  chunk_index INTEGER,                  -- Position in section
  page_number INTEGER,
  FOREIGN KEY (section_number) REFERENCES act_sections(section_number)
);

-- =====================================================
-- CLAUSE DETECTION PATTERNS (RULE-BASED)
-- =====================================================

CREATE TABLE IF NOT EXISTS clause_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id TEXT UNIQUE,                 -- Unique ID like 's27_non_compete_01'
  clause_type TEXT NOT NULL,              -- "non_compete_section27", "unlawful_object_section23"
  keywords TEXT NOT NULL,                 -- JSON array: ["non-compete", "restraint of trade"]
  risk_level TEXT NOT NULL,               -- "CRITICAL", "HIGH", "MEDIUM", "LOW"
  risk_score INTEGER NOT NULL,            -- Numeric: CRITICAL=40, HIGH=25, MEDIUM=15, LOW=5
  linked_section TEXT NOT NULL,           -- "Section 27" (FK to act_sections)
  description TEXT NOT NULL,
  example_violation TEXT,                 -- Example of how this appears in contracts
  -- NEW: Enhanced pattern matching
  regex_pattern TEXT,                     -- Advanced pattern matching regex
  semantic_examples TEXT,                 -- Examples for embedding generation (comma-separated)
  context_required TEXT DEFAULT 'all',    -- freelance|employment|vendor|consultant|all
  modifiers TEXT,                         -- JSON: scoring modifiers
  industry_tags TEXT DEFAULT 'all',       -- software|design|content|video|marketing|all
  explanation_en TEXT,                    -- English explanation
  explanation_hi TEXT,                    -- Hindi explanation
  explanation_context TEXT,               -- Additional context for AI explanations
  FOREIGN KEY (linked_section) REFERENCES act_sections(section_number)
);

-- =====================================================
-- CONTRACT ANALYSIS CONTEXT (Analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_analysis_context (
  analysis_id TEXT PRIMARY KEY,
  contract_type TEXT DEFAULT 'freelance', -- freelance, employment, vendor, consultant
  industry TEXT DEFAULT 'general',        -- software, design, writing, video, marketing, general
  contract_value_inr INTEGER,             -- Contract value in INR
  duration_months INTEGER,                -- Contract duration
  user_experience_years INTEGER,          -- User's experience level
  file_type TEXT,                         -- pdf, docx, txt
  file_name TEXT,
  processing_time_ms INTEGER,
  risk_score INTEGER,
  risk_level TEXT,
  violations_count INTEGER,
  keyword_matches INTEGER,
  semantic_matches INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- VIOLATION FEEDBACK (Accuracy Tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS violation_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT,
  pattern_id TEXT,
  violation_type TEXT,
  user_feedback TEXT,                     -- accurate, false_positive, severity_wrong, missed
  user_comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES contract_analysis_context(analysis_id)
);

-- =====================================================
-- FAIR CONTRACT BASELINE
-- =====================================================

CREATE TABLE IF NOT EXISTS fair_contract_baseline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clause_category TEXT NOT NULL UNIQUE, -- "payment_terms", "termination_notice", etc.
  fair_standard TEXT NOT NULL,          -- "Net 30 days"
  acceptable_range TEXT,                -- "15-45 days"
  red_flag_threshold TEXT,              -- "Beyond 60 days"
  explanation TEXT NOT NULL
);

-- =====================================================
-- EXPLANATION TEMPLATES (FOR CONSISTENCY)
-- =====================================================

CREATE TABLE IF NOT EXISTS explanation_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clause_type TEXT NOT NULL UNIQUE,
  base_explanation_en TEXT NOT NULL,
  base_explanation_hi TEXT,             -- Hindi (future)
  real_life_impact_en TEXT NOT NULL,
  gemini_prompt_hint TEXT               -- Guide AI on what to emphasize
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_section_number ON act_sections(section_number);
CREATE INDEX IF NOT EXISTS idx_clause_type ON clause_patterns(clause_type);
CREATE INDEX IF NOT EXISTS idx_risk_level ON clause_patterns(risk_level);
CREATE INDEX IF NOT EXISTS idx_pattern_id ON clause_patterns(pattern_id);
CREATE INDEX IF NOT EXISTS idx_context_required ON clause_patterns(context_required);
CREATE INDEX IF NOT EXISTS idx_embeddings_section ON act_embeddings(section_number);
CREATE INDEX IF NOT EXISTS idx_analysis_context_type ON contract_analysis_context(contract_type);
CREATE INDEX IF NOT EXISTS idx_analysis_context_created ON contract_analysis_context(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_analysis ON violation_feedback(analysis_id);

-- =====================================================
-- CONTRACT DRAFTING FEATURE
-- =====================================================

-- User-created contracts (drafts and final)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL DEFAULT 'default',-- Owner (future auth)
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',   -- 'draft', 'final'
  content TEXT NOT NULL,                  -- Contract text (markdown/HTML)
  template_id TEXT,                       -- FK to contract_templates (if based on template)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User signatures (stored as base64 images)
CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL DEFAULT 'default',
  label TEXT NOT NULL,                    -- e.g., 'My Signature', 'Company Seal'
  image_data TEXT NOT NULL,               -- Base64 encoded image (PNG)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-defined clause library (for users to add to contracts)
CREATE TABLE IF NOT EXISTS clause_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,                 -- 'NDA', 'Payment', 'Termination', 'IP', etc.
  title TEXT NOT NULL,
  text TEXT NOT NULL,                     -- Clause content
  description TEXT,                       -- Short description
  is_default INTEGER DEFAULT 1           -- 1 = show by default
);

-- Contract templates (starting points for users)
CREATE TABLE IF NOT EXISTS contract_templates (
  id TEXT PRIMARY KEY,                    -- UUID
  title TEXT NOT NULL,                    -- 'Freelance Agreement', 'NDA', etc.
  description TEXT,
  default_content TEXT NOT NULL,          -- Template with placeholders like {{PARTY_A}}
  category TEXT NOT NULL DEFAULT 'general', -- 'freelance', 'employment', 'nda', etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_contracts_user ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_signatures_user ON signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_clause_library_category ON clause_library(category);
CREATE INDEX IF NOT EXISTS idx_templates_category ON contract_templates(category);

