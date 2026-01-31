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

// Run seed if called directly
if (require.main === module) {
    seedDatabase().catch(console.error);
}
