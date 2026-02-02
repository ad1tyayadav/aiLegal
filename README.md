# 🚀 AndhaKanoon

**The AI Legal Sentinel for Indian Freelancers**

AndhaKanoon is a privacy-first contract analyzer that detects predatory clauses in freelance contracts using **Indian law** (NOT US law), explains risks in simple language, and generates a 0-100 risk score.

![Risk Score Demo](https://via.placeholder.com/800x400/1a1a2e/16213e?text=AndhaKanoon+-+Contract+Risk+Analyzer)

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| ⚖️ **Indian Law Grounded** | Validates against 225 sections of the Indian Contract Act, 1872 |
| 🎯 **Hybrid Detection** | Keyword matching + **Semantic AI Search** (ChromaDB + Gemini embeddings) |
| 📊 **0-100 Risk Score** | Deterministic scoring based on clause severity |
| 💬 **ELI5 Explanations** | AI-powered explanations in English or Hindi |
| 🔒 **Privacy-First** | Contracts analyzed in-memory and deleted immediately |
| 📄 **Multi-Format** | PDF, DOCX, PNG, JPG (with OCR) |

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (metadata) + ChromaDB (vectors)
- **AI**: Google Gemini 2.0 Flash
- **OCR**: Tesseract.js

---

## 📦 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/andhakanoon.git
cd andhakanoon
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
# Gemini API (Required)
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# Database
DATABASE_PATH=./data/legal_knowledge.db

# ════════════════════════════════════════════════════════════
# ChromaDB (Vector Database for Semantic Search)
# Choose ONE option below:
# ════════════════════════════════════════════════════════════

# Option 1: ChromaDB Cloud (Recommended - Free Tier)
# Sign up at: https://trychroma.com
CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_tenant_id
CHROMA_DATABASE=your_database_name

# Option 2: Local Docker
# Run: docker run -d -p 8000:8000 chromadb/chroma
# CHROMA_URL=http://localhost:8000

CHROMA_COLLECTION=clause_patterns
NODE_ENV=development
```

### 3. Initialize Database

```bash
# Seed SQLite with Indian Contract Act + clause patterns
npm run seed

# Generate embeddings and upload to ChromaDB
npm run generate-embeddings
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║       EMBEDDING GENERATION SCRIPT                          ║
╚════════════════════════════════════════════════════════════╝

[CHROMA] ☁️ CloudClient initialized
[CHROMA] 📚 Collection "clause_patterns" ready (0 patterns)

🔄 [1] non_compete_section27
    ✅ Generated 768-dim vector in 245ms
...

╔════════════════════════════════════════════════════════════╗
║  ✅ Generated: 50   embeddings                              ║
╚════════════════════════════════════════════════════════════╝

🎉 ChromaDB is ready! Semantic search is now enabled.
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing

### Sample Contracts Included

| File | Type | Expected Score |
|------|------|---------------|
| `public/samples/fair_contract.txt` | Safe | 0-15 ✅ |
| `public/samples/predatory_contract.txt` | Dangerous | 80-100 🚨 |
| `public/samples/deceptive_contract.txt` | Wolf-in-sheep's-clothing | 60-85 ⚠️ |

The **deceptive contract** looks professional but contains hidden predatory clauses - perfect for testing semantic search!

---

## 🧠 How It Works

### Detection Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Upload     │───▶│  Extract    │───▶│  Parse      │
│  Contract   │    │  Text       │    │  Clauses    │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         ▼                   ▼                   ▼
                   ┌──────────┐       ┌──────────────┐    ┌──────────┐
                   │ Keyword  │       │  Semantic    │    │ Deviation│
                   │ Matching │       │  Search      │    │ Checker  │
                   │ (SQLite) │       │  (ChromaDB)  │    │          │
                   └──────────┘       └──────────────┘    └──────────┘
                         │                   │                   │
                         └───────────────────┼───────────────────┘
                                             ▼
                                    ┌─────────────────┐
                                    │  Merge & Score  │
                                    │  0-100 Risk     │
                                    └─────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Gemini AI      │
                                    │  Explanations   │
                                    └─────────────────┘
```

### Detection Methods

| Method | Purpose | How It Works |
|--------|---------|--------------|
| **Keyword** | Exact matches | "non-compete" → Section 27 violation |
| **Semantic** | Synonym detection | "shall not engage with competitors" → Section 27 (via embeddings) |
| **Deviation** | Baseline comparison | "120 day payment" vs standard "30 days" |

### Risk Scoring

```
CRITICAL: 40 points   (Section 27, Section 23 violations)
HIGH:     25 points   (Unlimited liability, blanket IP transfer)
MEDIUM:   15 points   (Unilateral termination, delayed payments)
LOW:      5 points    (Vague scope, minor issues)

Total Score: Sum of all violations (capped at 100)
```

---

## ⚖️ Indian Law: Key Sections

### Section 27 (Non-Compete Clauses)

> "Every agreement by which anyone is restrained from exercising a lawful profession, trade or business of any kind, is to that extent **void**."

**This means**: Non-compete clauses are **VOID** in India. You can freely work with competitors after leaving a job.

### Section 23 (Unlawful Agreements)

> "The consideration or object of an agreement is unlawful if it is forbidden by law, or would defeat the provisions of any law, or is fraudulent."

**This means**: Contracts with illegal purposes are **void ab initio** (void from the start).

### Section 73/74 (Damages & Penalties)

Excessive penalty clauses (e.g., "10x contract value for any breach") may be unenforceable.

---

## 📁 Project Structure

```
andhakanoon/
├── app/
│   ├── page.tsx                   # Homepage with upload UI
│   ├── result/page.tsx            # Analysis results page
│   └── api/
│       ├── analyze/route.ts       # Main analysis endpoint
│       ├── health/route.ts        # Health check
│       └── laws/route.ts          # List Indian laws
│
├── components/
│   ├── contract/                  # Upload components
│   └── ui/                        # shadcn/ui components
│
├── lib/
│   ├── db/
│   │   ├── client.ts              # SQLite connection
│   │   ├── chromaClient.ts        # ChromaDB Cloud/Docker client
│   │   ├── schema.sql             # Database schema
│   │   └── seed.ts                # Seed data (50 patterns)
│   │
│   ├── services/
│   │   ├── indianLawValidator.ts  # Keyword-based validation
│   │   ├── semanticValidator.ts   # ChromaDB vector search
│   │   ├── deviationChecker.ts    # Baseline comparison
│   │   ├── explainer.service.ts   # Gemini AI explanations
│   │   └── scorer.service.ts      # Risk calculation
│   │
│   └── utils/
│       └── vector.utils.ts        # Embedding generation
│
├── scripts/
│   ├── generateEmbeddings.ts      # Entry point
│   └── generateEmbeddings.main.ts # Embedding logic
│
├── public/samples/                # Test contracts
│   ├── fair_contract.txt
│   ├── predatory_contract.txt
│   └── deceptive_contract.txt
│
└── data/
    ├── indian_contract_act.pdf    # Official PDF
    └── legal_knowledge.db         # SQLite database
```

---

## 🔌 API Reference

### POST /api/analyze

Analyze a contract file.

**Request:**
```typescript
FormData {
  file: File              // PDF, DOCX, or Image
  language: 'en' | 'hi'   // Optional
  enableSemantic: boolean // Enable semantic search (default: true)
}
```

**Response:**
```typescript
{
  success: true,
  processingTimeMs: 2345,
  analysis: {
    overallRiskScore: 75,
    riskLevel: "HIGH",
    totalClauses: 10,
    riskyClausesFound: 5,
    breakdown: { CRITICAL: 1, HIGH: 2, MEDIUM: 2, LOW: 0 }
  },
  riskyClauses: [{
    clauseId: "clause_3",
    text: "...",
    riskLevel: "CRITICAL",
    riskScore: 40,
    linkedSection: "Section 27",
    explanation: "...",
    matchSource: "semantic",        // "keyword" | "semantic" | "both"
    semanticSimilarity: 0.82
  }],
  deviations: [...],
  performance: {
    keywordSearchMs: 15,
    semanticSearchMs: 450,
    mergeMs: 5
  }
}
```

### GET /api/health

Check system health and ChromaDB status.

---

## 🔐 Privacy

1. **No Storage**: Contracts analyzed in-memory only
2. **Immediate Deletion**: Files deleted after analysis
3. **No Logging**: Contract content never logged
4. **Local Processing**: All processing happens server-side

---

## 🚨 Common Violations Detected

| Type | Risk | Section | Points |
|------|------|---------|--------|
| Non-compete clause | CRITICAL | Section 27 | 40 |
| Unlawful object | CRITICAL | Section 23 | 40 |
| Unlimited liability | HIGH | Section 73 | 25 |
| Blanket IP transfer | HIGH | Section 10 | 25 |
| Excessive penalties | HIGH | Section 74 | 20 |
| Unilateral termination | MEDIUM | Section 10 | 15 |
| Delayed payments (90+ days) | MEDIUM | Section 73 | 18 |
| Foreign jurisdiction | MEDIUM | Section 10 | 12 |

---

## 📜 NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run seed` | Seed SQLite database |
| `npm run generate-embeddings` | Generate ChromaDB embeddings |
| `npm run check-db` | Display database statistics |

---

## 🤝 Contributing

Contributions welcome! Focus areas:

1. Add more clause patterns (especially India-specific)
2. Improve semantic detection accuracy
3. Add support for more Indian languages
4. Improve UI/UX

---

## ⚠️ Disclaimer

This tool is for **educational purposes only**. It does not constitute legal advice. Always consult a qualified lawyer before signing any contract.

---

## 📜 License

MIT License

---

## 🙏 Acknowledgments

- Indian Contract Act, 1872: [indiacode.nic.in](https://www.indiacode.nic.in/)
- ChromaDB: [trychroma.com](https://trychroma.com/)
- Google Gemini AI
- Built for Indian freelancers ❤️

---

**Made in India 🇮🇳 for Indian Freelancers**

*"अंधा क़ानून" (Andha Kanoon) means "Blind Law" - highlighting how many freelancers sign contracts without understanding the legal implications.*
