import { db } from './client';
import { loadIndianContractActPDF } from './actLoader';

// Required sections referenced by clause patterns
const requiredSections = [
    { number: 'Section 10', title: 'What agreements are contracts', summary: 'All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void.' },
    { number: 'Section 16', title: 'Undue influence defined', summary: 'A contract is said to be induced by undue influence where the relations subsisting between the parties are such that one of the parties is in a position to dominate the will of the other.' },
    { number: 'Section 23', title: 'What considerations and objects are lawful', summary: 'The consideration or object of an agreement is lawful, unless it is forbidden by law, or is of such nature that if permitted would defeat provisions of any law, or is fraudulent, or involves injury to person or property, or is immoral or opposed to public policy.' },
    { number: 'Section 27', title: 'Agreement in restraint of trade void', summary: 'Every agreement by which anyone is restrained from exercising a lawful profession, trade or business of any kind, is to that extent void.' },
    { number: 'Section 73', title: 'Compensation for loss or damage caused by breach of contract', summary: 'When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby.' },
    { number: 'Section 74', title: 'Compensation for breach of contract where penalty stipulated for', summary: 'When a contract has been broken, if a sum is named in the contract as the amount to be paid in case of such breach, the party complaining of the breach is entitled to receive from the party who has broken the contract reasonable compensation not exceeding the amount so named.' }
];

export async function seedDatabase() {
    console.log('🌱 Seeding database...');

    // 1. Load full Indian Contract Act PDF
    await loadIndianContractActPDF();

    // 1.5. Ensure required sections exist for foreign key constraints
    seedRequiredSections();

    // 2. Seed clause patterns (most common violations)
    seedClausePatterns();

    // 3. Seed fair contract baseline
    seedFairContractBaseline();

    // 4. Seed explanation templates
    seedExplanationTemplates();

    // 5. Seed clause library for contract drafting
    seedClauseLibrary();

    // 6. Seed contract templates
    seedContractTemplates();

    console.log('✅ Database seeded successfully');
}

function seedRequiredSections() {
    const insert = db.prepare(`
        INSERT OR IGNORE INTO act_sections
        (section_number, section_title, full_text, summary, page_number, chapter)
        VALUES (?, ?, ?, ?, NULL, NULL)
    `);

    for (const section of requiredSections) {
        insert.run(
            section.number,
            section.title,
            section.summary,
            section.summary
        );
    }

    console.log(`✅ Ensured ${requiredSections.length} required sections exist`);
}

function seedClausePatterns() {
    const patterns = [
        // ===== CRITICAL RISK =====
        {
            clause_type: 'non_compete_section27',
            keywords: JSON.stringify([
                // Direct non-compete
                'non-compete', 'non compete', 'shall not compete', 'restraint of trade',
                'not engage in similar business', 'cannot work for competitor',
                'restricted from providing services', 'shall not solicit',
                'covenant not to compete', 'agree not to work',
                // Indirect restraint of trade
                'not engage in any', 'refrain from exercising', 'prohibited from working',
                'shall not provide similar services', 'exclusive engagement'
            ]),
            risk_level: 'CRITICAL',
            risk_score: 40,
            linked_section: 'Section 27',
            description: 'Non-compete clause restricting freelancer from taking other work - void under Indian law',
            example_violation: '"The Contractor agrees not to engage in any competing business for 2 years"'
        },
        {
            clause_type: 'unlawful_object_section23',
            keywords: JSON.stringify([
                'illegal purpose', 'unlawful', 'circumvent law', 'evade tax',
                'fraudulent activity', 'against public policy', 'immoral purpose',
                'prohibited by law', 'defeat provisions of law'
            ]),
            risk_level: 'CRITICAL',
            risk_score: 40,
            linked_section: 'Section 23',
            description: 'Contract with illegal or immoral object is void',
            example_violation: '"Services include structuring transactions to avoid tax compliance"'
        },

        // ===== HIGH RISK =====
        {
            clause_type: 'unlimited_liability_section73',
            keywords: JSON.stringify([
                'unlimited liability', 'all damages', 'consequential damages',
                'indirect damages', 'loss of profits', 'liable for all losses',
                'no limit on liability', 'without limitation', 'any and all damages'
            ]),
            risk_level: 'HIGH',
            risk_score: 25,
            linked_section: 'Section 73',
            description: 'Freelancer liable for unlimited damages without reasonable cap',
            example_violation: '"Contractor shall be liable for all direct, indirect, and consequential damages without limit"'
        },
        {
            clause_type: 'blanket_ip_transfer',
            keywords: JSON.stringify([
                // More specific - focuses on OWNERSHIP, not just delivery
                'all intellectual property belongs', 'assign all rights title',
                'waive moral rights', 'ownership of all work product',
                'whether related to the project or not', 'inventions conceived',
                'client owns all IP', 'transfer all intellectual property',
                'work created during or after', 'ideas conceived within'
            ]),
            risk_level: 'HIGH',
            risk_score: 25,
            linked_section: 'Section 27', // Not Section 10 - IP overreach can restrain trade
            description: 'Overreaching IP clause claiming ownership of all work including unrelated projects',
            example_violation: '"All intellectual property created during the term, whether related to the project or not, belongs to Client"'
        },
        // NEW: Indirect non-compete via portfolio restriction
        {
            clause_type: 'indirect_non_compete_portfolio',
            keywords: JSON.stringify([
                'portfolio.*confidential', 'showcase.*without.*consent',
                'not.*display.*work', 'cannot.*reference.*client',
                'prohibit.*portfolio', 'restrict.*showcase'
            ]),
            risk_level: 'CRITICAL',
            risk_score: 40,
            linked_section: 'Section 27',
            description: 'Restricting portfolio use combined with long confidentiality effectively prevents working in the field',
            example_violation: '"Developer may not showcase work in portfolio without prior written consent, confidentiality extends for 5 years"'
        },
        // NEW: Excessive liability cap
        {
            clause_type: 'excessive_liability_cap',
            keywords: JSON.stringify([
                'liability shall not exceed.*total fees',
                'liable.*full contract value', 'damages.*equal to.*contract',
                'indemnify.*full amount', 'liability capped at contract value'
            ]),
            risk_level: 'HIGH',
            risk_score: 20,
            linked_section: 'Section 74',
            description: 'Liability capped at full contract value is excessive for freelance work',
            example_violation: '"Developer liability shall not exceed total fees payable under this agreement (₹8,50,000)"'
        },
        {
            clause_type: 'excessive_penalty_section74',
            keywords: JSON.stringify([
                'penalty of', 'liquidated damages of', 'shall pay', 'penalty equal to',
                'penalty fee of', 'damages clause', 'breach penalty', 'forfeit'
            ]),
            risk_level: 'HIGH',
            risk_score: 20,
            linked_section: 'Section 74',
            description: 'Excessive penalty that exceeds reasonable compensation for breach',
            example_violation: '"Contractor shall pay penalty of 10x project value for any breach"'
        },

        // ===== MEDIUM RISK =====
        {
            clause_type: 'unilateral_termination',
            keywords: JSON.stringify([
                'terminate at will', 'without cause', 'immediate termination',
                'terminate without notice', 'at sole discretion', 'cancel anytime',
                'terminate for convenience', 'may terminate immediately'
            ]),
            risk_level: 'MEDIUM',
            risk_score: 15,
            linked_section: 'Section 73', // Section 73 - damages from breach/termination
            description: 'Client can terminate without reason or notice period, leaving freelancer unpaid',
            example_violation: '"Client may terminate this agreement at any time without cause or notice"'
        },
        {
            clause_type: 'unfair_payment_terms',
            keywords: JSON.stringify([
                'payment within 90 days', 'net 120', 'payment upon client receipt',
                'withhold payment', 'deduct from payment', 'payment subject to',
                'pay when client gets paid'
            ]),
            risk_level: 'MEDIUM',
            risk_score: 18,
            linked_section: 'Section 73',
            description: 'Unreasonably delayed or conditional payment terms',
            example_violation: '"Payment shall be made within 120 days of invoice, subject to client receiving payment from end customer"'
        },
        {
            clause_type: 'foreign_jurisdiction',
            keywords: JSON.stringify([
                'governed by laws of USA', 'jurisdiction of.*USA', 'courts of USA',
                'UK jurisdiction', 'Singapore courts', 'arbitration in Singapore',
                'New York law', 'California law', 'Delaware courts', 'English law'
            ]),
            risk_level: 'MEDIUM',
            risk_score: 12,
            linked_section: 'Section 23', // Foreign jurisdiction could defeat provisions of Indian law
            description: 'Disputes must be resolved in foreign jurisdiction - expensive and may circumvent Indian law protections',
            example_violation: '"This agreement shall be governed by the laws of Delaware, USA"'
        },
        {
            clause_type: 'undue_influence_section16',
            keywords: JSON.stringify([
                'must sign immediately', 'no time to review', 'take it or leave it',
                'cannot consult lawyer', 'confidential - do not share', 'non-negotiable',
                'sign now or lose opportunity'
            ]),
            risk_level: 'MEDIUM',
            risk_score: 20,
            linked_section: 'Section 16',
            description: 'Pressure tactics or coercion to sign without review',
            example_violation: '"This offer expires in 24 hours and terms are non-negotiable"'
        },

        // ===== LOW RISK =====
        {
            clause_type: 'vague_scope',
            keywords: JSON.stringify([
                // Only flag clearly vague terms, not standard project management language
                'scope may change without notice', 'at client discretion without',
                'other duties as assigned', 'additional work without compensation',
                'required from time to time'
            ]),
            risk_level: 'LOW',
            risk_score: 5,
            linked_section: 'Section 73', // Vague scope leads to unpaid work
            description: 'Work scope not clearly defined, may lead to unpaid scope creep',
            example_violation: '"Contractor shall perform services as required by Client from time to time without additional compensation"'
        }
    ];

    const insert = db.prepare(`
    INSERT OR IGNORE INTO clause_patterns 
    (clause_type, keywords, risk_level, risk_score, linked_section, description, example_violation)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    for (const pattern of patterns) {
        insert.run(
            pattern.clause_type,
            pattern.keywords,
            pattern.risk_level,
            pattern.risk_score,
            pattern.linked_section,
            pattern.description,
            pattern.example_violation
        );
    }

    console.log(`✅ Seeded ${patterns.length} clause patterns`);
}

function seedFairContractBaseline() {
    const baselines = [
        {
            clause_category: 'payment_terms',
            fair_standard: 'Net 30 days',
            acceptable_range: '15-45 days',
            red_flag_threshold: 'Beyond 60 days',
            explanation: 'Standard Indian practice is Net 30. Anything beyond 60 days is unfair.'
        },
        {
            clause_category: 'termination_notice',
            fair_standard: '15-30 days written notice',
            acceptable_range: '7-30 days',
            red_flag_threshold: 'Immediate termination without cause',
            explanation: 'Both parties should have reasonable notice period.'
        },
        {
            clause_category: 'liability_cap',
            fair_standard: 'Capped at contract value',
            acceptable_range: 'Contract value to 2x contract value',
            red_flag_threshold: 'Unlimited liability',
            explanation: 'Freelancer liability should be proportional to project value.'
        },
        {
            clause_category: 'ip_rights',
            fair_standard: 'Client owns deliverables, freelancer retains portfolio rights',
            acceptable_range: 'Client owns work product, freelancer can showcase',
            red_flag_threshold: 'All IP including pre-existing work',
            explanation: 'Freelancer should retain rights to prior work and portfolio use.'
        },
        {
            clause_category: 'non_compete',
            fair_standard: 'None (Section 27 makes them void)',
            acceptable_range: 'Project-specific confidentiality only',
            red_flag_threshold: 'Any broad non-compete',
            explanation: 'Non-compete clauses are generally unenforceable in India per Section 27.'
        },
        {
            clause_category: 'jurisdiction',
            fair_standard: 'Indian courts in freelancer\'s city',
            acceptable_range: 'Indian courts (any major city)',
            red_flag_threshold: 'Foreign jurisdiction',
            explanation: 'Disputes should be resolved in India for cost reasons.'
        }
    ];

    const insert = db.prepare(`
    INSERT OR IGNORE INTO fair_contract_baseline 
    (clause_category, fair_standard, acceptable_range, red_flag_threshold, explanation)
    VALUES (?, ?, ?, ?, ?)
  `);

    for (const baseline of baselines) {
        insert.run(
            baseline.clause_category,
            baseline.fair_standard,
            baseline.acceptable_range,
            baseline.red_flag_threshold,
            baseline.explanation
        );
    }

    console.log(`✅ Seeded ${baselines.length} fair contract baselines`);
}

function seedExplanationTemplates() {
    const templates = [
        {
            clause_type: 'non_compete_section27',
            base_explanation_en: 'This clause tries to prevent you from working with competitors or taking similar freelance projects.',
            real_life_impact_en: 'Under Section 27 of the Indian Contract Act, 1872, such broad restrictions on your ability to earn a livelihood are VOID and cannot be enforced. You cannot be legally prevented from taking other freelance work in your field.',
            gemini_prompt_hint: 'Emphasize that Section 27 makes most non-compete clauses void in India. This is DIFFERENT from US law where they may be enforceable. Explain freelancer can ignore this clause.'
        },
        {
            clause_type: 'unlawful_object_section23',
            base_explanation_en: 'This clause asks you to do something that is illegal or against public policy.',
            real_life_impact_en: 'Under Section 23 of the Indian Contract Act, any contract with an unlawful object is COMPLETELY VOID from the beginning (void ab initio). This means the entire contract is unenforceable, and you should not sign it.',
            gemini_prompt_hint: 'Emphasize the entire contract is void, not just this clause. Warn freelancer to walk away.'
        },
        {
            clause_type: 'unlimited_liability_section73',
            base_explanation_en: 'This clause makes you liable for all damages without any upper limit.',
            real_life_impact_en: 'If something goes wrong (even beyond your control), you could be forced to pay unlimited amounts. Indian Contract Act Section 73 allows only "reasonable" compensation. This clause may be challenged as unconscionable.',
            gemini_prompt_hint: 'Explain that liability should be capped at contract value or a reasonable amount. Unlimited liability is extremely risky.'
        },
        {
            clause_type: 'excessive_penalty_section74',
            base_explanation_en: 'This clause imposes a very high penalty for breach of contract.',
            real_life_impact_en: 'Under Section 74, you can only be required to pay "reasonable compensation" for actual losses, not punitive penalties. If the penalty is excessive, Indian courts will reduce it.',
            gemini_prompt_hint: 'Explain that courts will not enforce excessive penalties under Section 74. Freelancer should negotiate a reasonable cap.'
        }
    ];

    const insert = db.prepare(`
    INSERT OR IGNORE INTO explanation_templates 
    (clause_type, base_explanation_en, real_life_impact_en, gemini_prompt_hint)
    VALUES (?, ?, ?, ?)
  `);

    for (const template of templates) {
        insert.run(
            template.clause_type,
            template.base_explanation_en,
            template.real_life_impact_en,
            template.gemini_prompt_hint
        );
    }

    console.log(`✅ Seeded ${templates.length} explanation templates`);
}

function seedClauseLibrary() {
    const clauses = [
        // NDA / Confidentiality
        {
            category: 'Confidentiality',
            title: 'Standard NDA Clause',
            text: `The Receiving Party agrees to hold in confidence all Confidential Information disclosed by the Disclosing Party. "Confidential Information" means any non-public information, technical data, or know-how, including research, product plans, services, customers, markets, software, developments, inventions, processes, formulas, technology, designs, drawings, engineering, hardware configuration information, marketing, finances, or other business information disclosed by the Disclosing Party.`,
            description: 'Basic mutual confidentiality clause'
        },
        {
            category: 'Confidentiality',
            title: 'Limited Confidentiality (1 Year)',
            text: `The Receiving Party shall maintain the confidentiality of all Confidential Information for a period of one (1) year from the date of disclosure. After this period, the Receiving Party shall be free to use or disclose such information without restriction.`,
            description: 'Time-limited confidentiality clause'
        },
        // Payment Terms
        {
            category: 'Payment',
            title: 'Net 30 Payment Terms',
            text: `All invoices shall be paid within thirty (30) days of receipt. Late payments shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by law, whichever is lower.`,
            description: 'Standard 30-day payment with late fee'
        },
        {
            category: 'Payment',
            title: 'Milestone-Based Payment',
            text: `Payment shall be made according to the following schedule: 30% upon signing, 30% upon completion of the first milestone, and 40% upon final delivery and acceptance. Each payment is due within 15 days of the associated milestone.`,
            description: 'Split payment tied to project milestones'
        },
        // Intellectual Property
        {
            category: 'IP',
            title: 'Work-for-Hire IP Assignment',
            text: `Upon full payment, all intellectual property rights in the Deliverables shall be assigned to the Client. The Contractor retains the right to use the work in their portfolio for promotional purposes.`,
            description: 'IP transfers on payment, portfolio rights retained'
        },
        {
            category: 'IP',
            title: 'License Grant (Non-Exclusive)',
            text: `The Contractor grants the Client a perpetual, irrevocable, non-exclusive license to use the Deliverables. The Contractor retains ownership and may license the work to other parties.`,
            description: 'Client gets license, contractor keeps ownership'
        },
        // Termination
        {
            category: 'Termination',
            title: '30-Day Termination Notice',
            text: `Either party may terminate this Agreement with thirty (30) days written notice. Upon termination, the Client shall pay for all work completed up to the termination date.`,
            description: 'Mutual termination with fair notice'
        },
        {
            category: 'Termination',
            title: 'Termination for Cause',
            text: `Either party may terminate this Agreement immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within fifteen (15) days of receiving written notice of the breach.`,
            description: 'Immediate termination for uncured breaches'
        },
        // Dispute Resolution
        {
            category: 'Dispute',
            title: 'Mediation First',
            text: `In the event of any dispute arising out of or relating to this Agreement, the parties shall first attempt to resolve the dispute through good-faith mediation. If mediation fails within 30 days, either party may pursue arbitration or litigation.`,
            description: 'Requires mediation attempt before court'
        },
        {
            category: 'Dispute',
            title: 'Indian Jurisdiction',
            text: `This Agreement shall be governed by and construed in accordance with the laws of India. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the courts of [City], India.`,
            description: 'Keeps disputes in Indian courts'
        },
        // Indemnification
        {
            category: 'Indemnity',
            title: 'Mutual Indemnification',
            text: `Each party shall indemnify and hold harmless the other party from any claims, damages, or expenses arising from the indemnifying party's breach of this Agreement or negligent acts.`,
            description: 'Both parties protected equally'
        }
    ];

    const insert = db.prepare(`
        INSERT OR IGNORE INTO clause_library 
        (category, title, text, description, is_default)
        VALUES (?, ?, ?, ?, 1)
    `);

    for (const clause of clauses) {
        insert.run(clause.category, clause.title, clause.text, clause.description);
    }

    console.log(`✅ Seeded ${clauses.length} clause library entries`);
}

function seedContractTemplates() {
    const templates = [
        {
            id: 'tmpl-freelance-web',
            title: 'Freelance Web Development Agreement',
            description: 'Standard contract for freelance web development projects',
            category: 'freelance',
            default_content: `# FREELANCE WEB DEVELOPMENT AGREEMENT

**Date:** {{DATE}}

## PARTIES

**Client:** {{CLIENT_NAME}}
**Address:** {{CLIENT_ADDRESS}}

**Contractor:** {{CONTRACTOR_NAME}}
**Address:** {{CONTRACTOR_ADDRESS}}

---

## 1. SCOPE OF WORK

The Contractor agrees to provide the following services:

{{SCOPE_DESCRIPTION}}

### Deliverables:
- {{DELIVERABLE_1}}
- {{DELIVERABLE_2}}
- {{DELIVERABLE_3}}

---

## 2. TIMELINE

**Project Start Date:** {{START_DATE}}
**Expected Completion:** {{END_DATE}}

---

## 3. COMPENSATION

**Total Fee:** ₹{{TOTAL_FEE}}

**Payment Schedule:**
- {{PAYMENT_SCHEDULE}}

---

## 4. INTELLECTUAL PROPERTY

Upon full payment, all intellectual property rights in the Deliverables shall be assigned to the Client. The Contractor retains the right to use the work in their portfolio.

---

## 5. CONFIDENTIALITY

Both parties agree to keep confidential any proprietary information shared during this engagement.

---

## 6. TERMINATION

Either party may terminate this Agreement with 15 days written notice. Upon termination, the Client shall pay for all work completed.

---

## 7. GOVERNING LAW

This Agreement shall be governed by the laws of India.

---

## SIGNATURES

**Client:**
_________________________
Name: {{CLIENT_NAME}}
Date: {{SIGNATURE_DATE}}

**Contractor:**
_________________________
Name: {{CONTRACTOR_NAME}}
Date: {{SIGNATURE_DATE}}
`
        },
        {
            id: 'tmpl-nda-mutual',
            title: 'Mutual Non-Disclosure Agreement',
            description: 'Standard NDA for protecting confidential information',
            category: 'nda',
            default_content: `# MUTUAL NON-DISCLOSURE AGREEMENT

**Effective Date:** {{DATE}}

## PARTIES

**Party A:** {{PARTY_A_NAME}}
**Party B:** {{PARTY_B_NAME}}

---

## 1. PURPOSE

The parties wish to explore a potential business relationship and, in connection with this, may disclose confidential information to each other.

---

## 2. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any non-public information, technical data, trade secrets, or know-how, including research, product plans, products, services, customer lists, markets, software, developments, inventions, processes, formulas, technology, designs, drawings, engineering, marketing, finances, or other business information.

---

## 3. OBLIGATIONS

Each party agrees to:
- Hold the other party's Confidential Information in strict confidence
- Not disclose to any third party without prior written consent
- Use the information only for the stated purpose
- Protect information using reasonable security measures

---

## 4. EXCLUSIONS

This Agreement does not apply to information that:
- Was publicly known at the time of disclosure
- Becomes publicly known through no fault of the receiving party
- Was already known to the receiving party
- Is independently developed by the receiving party

---

## 5. TERM

This Agreement shall remain in effect for {{DURATION}} from the Effective Date.

---

## 6. GOVERNING LAW

This Agreement shall be governed by the laws of India.

---

## SIGNATURES

**Party A:**
_________________________
Name: {{PARTY_A_NAME}}
Date: {{SIGNATURE_DATE}}

**Party B:**
_________________________
Name: {{PARTY_B_NAME}}
Date: {{SIGNATURE_DATE}}
`
        },
        {
            id: 'tmpl-intern-onboarding',
            title: 'Intern Onboarding Agreement',
            description: 'Agreement for hiring interns with learning objectives',
            category: 'employment',
            default_content: `# INTERNSHIP AGREEMENT

**Date:** {{DATE}}

## PARTIES

**Company:** {{COMPANY_NAME}}
**Address:** {{COMPANY_ADDRESS}}

**Intern:** {{INTERN_NAME}}
**Address:** {{INTERN_ADDRESS}}

---

## 1. INTERNSHIP DETAILS

**Position:** {{POSITION_TITLE}}
**Department:** {{DEPARTMENT}}
**Duration:** {{START_DATE}} to {{END_DATE}}
**Working Hours:** {{WORKING_HOURS}}

---

## 2. STIPEND

**Monthly Stipend:** ₹{{STIPEND_AMOUNT}}

Payment shall be made on the {{PAYMENT_DAY}} of each month.

---

## 3. LEARNING OBJECTIVES

The internship is designed to provide practical experience in:
- {{OBJECTIVE_1}}
- {{OBJECTIVE_2}}
- {{OBJECTIVE_3}}

---

## 4. RESPONSIBILITIES

The Intern agrees to:
- Follow company policies and procedures
- Complete assigned tasks diligently
- Maintain confidentiality of company information
- Report to {{SUPERVISOR_NAME}}

---

## 5. INTELLECTUAL PROPERTY

Any work product created during the internship shall belong to the Company.

---

## 6. TERMINATION

Either party may terminate this agreement with 7 days written notice.

---

## 7. CERTIFICATE

Upon successful completion, the Company shall issue an internship completion certificate.

---

## SIGNATURES

**For Company:**
_________________________
Name: {{AUTHORIZED_SIGNATORY}}
Designation: {{SIGNATORY_DESIGNATION}}
Date: {{SIGNATURE_DATE}}

**Intern:**
_________________________
Name: {{INTERN_NAME}}
Date: {{SIGNATURE_DATE}}
`
        }
    ];

    const insert = db.prepare(`
        INSERT OR REPLACE INTO contract_templates 
        (id, title, description, default_content, category)
        VALUES (?, ?, ?, ?, ?)
    `);

    for (const template of templates) {
        insert.run(template.id, template.title, template.description, template.default_content, template.category);
    }

    console.log(`✅ Seeded ${templates.length} contract templates`);
}

// Run seed if called directly
if (require.main === module) {
    seedDatabase().catch(console.error);
}
