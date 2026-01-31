import { NextRequest, NextResponse } from 'next/server';
import { extractText } from '@/lib/services/extractor.service';
import { parseIntoClauses } from '@/lib/services/parser.service';
import { validateAgainstIndianLaw } from '@/lib/services/indianLawValidator.service';
import { validateSemantic, clearEmbeddingCache } from '@/lib/services/semanticValidator.service';
import { enhancedDeviationChecker, checkDeviationsFromFairContract } from '@/lib/services/deviationChecker.service';
import { calculateRiskScore, getRiskLevel, enhancedScorer, ContractContext } from '@/lib/services/scorer.service';
import { explainClause } from '@/lib/services/explainer.service';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, DISCLAIMER, IMPACT_PROFILES } from '@/lib/utils/constants';
import type { IndianLawViolation, SemanticMatch } from '@/lib/types/contract.types';
import { db } from '@/lib/db/client';

// Generate unique analysis ID
function generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Merge keyword and semantic results
 * Priority: keyword matches take precedence
 * Deduplication: by clauseId
 */
function mergeResults(
    keywordViolations: IndianLawViolation[],
    semanticMatches: SemanticMatch[]
): (IndianLawViolation & { matchSource: 'keyword' | 'semantic' | 'both'; semanticSimilarity?: number })[] {
    const seenClauseIds = new Set<number>();
    const combined: (IndianLawViolation & { matchSource: 'keyword' | 'semantic' | 'both'; semanticSimilarity?: number })[] = [];

    console.log('\n[MERGE] ═══════════════════════════════════════════════════════');
    console.log(`[MERGE] 🔀 Merging results: ${keywordViolations.length} keyword + ${semanticMatches.length} semantic`);

    // Add keyword matches first (higher priority)
    for (const violation of keywordViolations) {
        seenClauseIds.add(violation.clauseId);
        combined.push({
            ...violation,
            matchSource: 'keyword' as const
        });
        console.log(`[MERGE] ➕ Clause ${violation.clauseId}: KEYWORD match (${violation.violationType})`);
    }

    // Add semantic matches for clauses not already matched
    for (const match of semanticMatches) {
        if (!seenClauseIds.has(match.clauseId)) {
            seenClauseIds.add(match.clauseId);
            combined.push({
                clauseId: match.clauseId,
                clauseText: match.clauseText,
                violationType: match.matchedPattern,
                sectionNumber: match.sectionNumber,
                sectionTitle: match.sectionTitle,
                sectionFullText: match.description,
                riskLevel: match.riskLevel,
                riskScore: match.riskScore,
                matchedKeywords: [],
                explanation: match.description,
                govUrl: 'https://www.indiacode.nic.in/bitstream/123456789/2187/2/A187209.pdf',
                matchSource: 'semantic' as const,
                semanticSimilarity: match.similarity
            });
            console.log(`[MERGE] ➕ Clause ${match.clauseId}: SEMANTIC match (${match.matchedPattern}, ${(match.similarity * 100).toFixed(1)}%)`);
        } else {
            // Clause was matched by both - update matchSource
            const existing = combined.find(c => c.clauseId === match.clauseId);
            if (existing) {
                existing.matchSource = 'both';
                existing.semanticSimilarity = match.similarity;
                console.log(`[MERGE] 🔗 Clause ${match.clauseId}: BOTH methods matched`);
            }
        }
    }

    // Sort by risk score descending
    combined.sort((a, b) => b.riskScore - a.riskScore);

    console.log(`[MERGE] ✅ Combined total: ${combined.length} unique violations`);
    console.log('[MERGE] ═══════════════════════════════════════════════════════\n');

    return combined;
}

/**
 * Parse contract context from form data
 * All context fields are OPTIONAL for backward compatibility
 */
function parseContractContext(formData: FormData): ContractContext {
    const contractType = formData.get('contractType') as string;
    const industry = formData.get('industry') as string;
    const contractValue = formData.get('contractValue');
    const durationMonths = formData.get('durationMonths');
    const userExperience = formData.get('userExperience');

    return {
        contractType: (['freelance', 'employment', 'vendor', 'consultant'].includes(contractType)
            ? contractType : 'freelance') as ContractContext['contractType'],
        industry: (['software', 'design', 'writing', 'video', 'marketing'].includes(industry)
            ? industry : 'general') as ContractContext['industry'],
        contractValue: contractValue ? parseInt(contractValue as string) : undefined,
        durationMonths: durationMonths ? parseInt(durationMonths as string) : undefined,
        userExperience: userExperience ? parseInt(userExperience as string) : undefined,
    };
}

/**
 * Store analysis context for analytics (non-blocking)
 */
async function storeAnalysisContext(
    analysisId: string,
    context: ContractContext,
    file: File,
    scoring: { score: number; level: string },
    keywordCount: number,
    semanticCount: number,
    processingTime: number
): Promise<void> {
    try {
        db.prepare(`
            INSERT INTO contract_analysis_context 
            (analysis_id, contract_type, industry, contract_value_inr, 
             duration_months, user_experience_years, file_type, file_name,
             processing_time_ms, risk_score, risk_level, violations_count, 
             keyword_matches, semantic_matches)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            analysisId,
            context.contractType,
            context.industry,
            context.contractValue || null,
            context.durationMonths || null,
            context.userExperience || null,
            file.type,
            file.name,
            processingTime,
            scoring.score,
            scoring.level,
            keywordCount + semanticCount,
            keywordCount,
            semanticCount
        );
        console.log(`[ANALYTICS] 📊 Stored analysis context: ${analysisId}`);
    } catch (error) {
        console.warn('[ANALYTICS] ⚠️ Failed to store analytics:', error);
        // Non-blocking - don't fail the request
    }
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const analysisId = generateAnalysisId();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              CONTRACT ANALYSIS REQUEST                       ║');
    console.log(`║              ID: ${analysisId}                    ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const language = (formData.get('language') as string) || 'en';
        const enableSemantic = formData.get('enableSemantic') !== 'false'; // default true

        // NEW: Parse contract context (optional, backward compatible)
        const context = parseContractContext(formData);

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file uploaded' },
                { status: 400 }
            );
        }

        console.log(`[REQUEST] 📄 File: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        console.log(`[REQUEST] 🌐 Language: ${language}`);
        console.log(`[REQUEST] 🔍 Semantic search: ${enableSemantic ? 'ENABLED' : 'DISABLED'}`);
        console.log(`[REQUEST] 📋 Context: type=${context.contractType}, industry=${context.industry}`);
        if (context.contractValue) console.log(`[REQUEST] 💰 Contract value: ₹${context.contractValue.toLocaleString('en-IN')}`);
        if (context.durationMonths) console.log(`[REQUEST] ⏱️ Duration: ${context.durationMonths} months`);
        console.log('');

        // 2. Validate file
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Only PDF, DOCX, TXT, PNG, JPG files allowed' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: 'File must be under 10MB' },
                { status: 400 }
            );
        }

        // 3. Extract text
        console.log('[STEP 1] 📝 Extracting text from document...');
        const { text, metadata } = await extractText(file);
        console.log(`[STEP 1] ✅ Extracted ${metadata.characterCount} characters\n`);

        // 4. Parse into clauses
        console.log('[STEP 2] ✂️ Parsing into clauses...');
        const clauses = parseIntoClauses(text);
        console.log(`[STEP 2] ✅ Found ${clauses.length} clauses\n`);

        // 5. Validate against Indian Contract Act (RULE-BASED - SYNC)
        console.log('[STEP 3] 🔑 Running KEYWORD validation...');
        const keywordStartTime = Date.now();
        const keywordViolations = validateAgainstIndianLaw(clauses);
        const keywordDuration = Date.now() - keywordStartTime;
        console.log(`[STEP 3] ✅ Found ${keywordViolations.length} keyword matches in ${keywordDuration}ms\n`);

        // 6. Semantic validation (VECTOR-BASED - ASYNC) - Independent system
        let semanticMatches: SemanticMatch[] = [];
        let semanticDuration = 0;

        if (enableSemantic) {
            console.log('[STEP 4] 🧠 Running SEMANTIC validation...');
            const semanticStartTime = Date.now();
            try {
                semanticMatches = await validateSemantic(clauses);
                semanticDuration = Date.now() - semanticStartTime;
                console.log(`[STEP 4] ✅ Found ${semanticMatches.length} semantic matches in ${semanticDuration}ms\n`);
            } catch (error) {
                console.warn('[STEP 4] ⚠️ Semantic search failed, continuing with keyword results:', error);
            }
        } else {
            console.log('[STEP 4] ⏭️ Semantic validation SKIPPED (disabled)\n');
        }

        // 7. Merge results (deduplicate by clauseId, prefer keyword matches)
        console.log('[STEP 5] 🔀 Merging keyword + semantic results...');
        const combinedViolations = mergeResults(keywordViolations, semanticMatches);

        // 8. Check deviations from fair contract baseline (ENHANCED with context)
        console.log('[STEP 6] ⚖️ Checking deviations from fair contract...');
        const deviations = enhancedDeviationChecker.check(text, context);
        console.log(`[STEP 6] ✅ Found ${deviations.length} deviations\n`);

        // 9. Calculate risk score (ENHANCED with context-aware scoring)
        console.log('[STEP 7] 📊 Calculating context-aware risk score...');
        const scoringResult = enhancedScorer.calculateOverallScore(combinedViolations, context);
        console.log(`[STEP 7] ✅ Risk score: ${scoringResult.score}/100 (${scoringResult.level})\n`);

        // 10. Generate role-based explanations using Gemini (IN PARALLEL for speed)
        console.log('[STEP 8] 💬 Generating role-based explanations with Gemini...');
        const explainedViolations = await Promise.all(
            combinedViolations.map(async (violation, index) => {
                // Default explanations for both roles
                let freelancerExplanation = { simpleExplanation: '', realLifeImpact: '' };
                let companyExplanation = { simpleExplanation: '', realLifeImpact: '' };

                try {
                    const explained = await explainClause(
                        violation.clauseText,
                        violation.violationType,
                        violation.sectionFullText,
                        language as 'en' | 'hi'
                    );
                    freelancerExplanation = explained.freelancer;
                    companyExplanation = explained.company;
                } catch (err) {
                    console.warn(`[EXPLAIN] ⚠️ Gemini failed for clause ${violation.clauseId}, using fallback`);
                    freelancerExplanation = {
                        simpleExplanation: violation.explanation,
                        realLifeImpact: 'This clause may put you at a significant disadvantage. Consider negotiating better terms.'
                    };
                    companyExplanation = {
                        simpleExplanation: 'This clause may face legal challenges under Indian law.',
                        realLifeImpact: 'Review with legal counsel before relying on this provision.'
                    };
                }

                // Find position of this clause in original text
                const clauseTextLower = violation.clauseText.toLowerCase();
                const textLower = text.toLowerCase();
                let startIndex = textLower.indexOf(clauseTextLower);

                // If exact match fails, try to find a substring match
                if (startIndex === -1) {
                    const searchText = clauseTextLower.substring(0, 50);
                    startIndex = textLower.indexOf(searchText);
                }

                // If still not found, estimate based on clause order
                if (startIndex === -1) {
                    startIndex = Math.floor((index / Math.max(combinedViolations.length, 1)) * text.length);
                }

                const endIndex = startIndex >= 0 ? startIndex + violation.clauseText.length : startIndex + 100;

                const profile = IMPACT_PROFILES[violation.violationType];

                // Calculate context-aware score for this violation
                const contextAwareScore = enhancedScorer.calculateViolationScore(violation, context);

                return {
                    id: index + 1,
                    clauseNumber: violation.clauseId,
                    originalText: violation.clauseText,
                    violationType: violation.violationType,
                    riskLevel: violation.riskLevel,
                    riskScore: violation.riskScore,
                    contextAwareScore, // NEW: Score adjusted for context
                    startIndex: Math.max(0, startIndex),
                    endIndex: Math.min(text.length, endIndex),
                    appliesTo: profile?.appliesTo || ['All'],
                    businessRisk: profile?.businessRisk || 'Contract Risk',
                    // Match source information
                    matchSource: violation.matchSource,
                    matchedKeywords: violation.matchedKeywords || [],
                    semanticSimilarity: violation.semanticSimilarity,
                    indianLawReference: {
                        section: violation.sectionNumber,
                        title: violation.sectionTitle,
                        fullText: violation.sectionFullText,
                        summary: violation.explanation,
                        url: violation.govUrl
                    },
                    // NEW: Role-based explanations (both perspectives)
                    explanation: {
                        freelancer: {
                            simple: freelancerExplanation.simpleExplanation,
                            realLifeImpact: freelancerExplanation.realLifeImpact
                        },
                        company: {
                            simple: companyExplanation.simpleExplanation,
                            realLifeImpact: companyExplanation.realLifeImpact
                        },
                        generatedBy: 'gemini-2.0-flash'
                    }
                };
            })
        );
        console.log(`[STEP 8] ✅ Generated ${explainedViolations.length} explanations\n`);

        // Clear embedding cache at end of request
        clearEmbeddingCache();

        const totalTime = Date.now() - startTime;

        // 11. Store analytics (non-blocking)
        storeAnalysisContext(
            analysisId,
            context,
            file,
            { score: scoringResult.score, level: scoringResult.level },
            keywordViolations.length,
            semanticMatches.length,
            totalTime
        );

        // 12. Format response with extracted text for contract viewer
        const response = {
            success: true,
            analysisId, // NEW: Include analysis ID for feedback
            processingTimeMs: totalTime,
            // Performance breakdown
            performance: {
                total: totalTime,
                keywordValidation: keywordDuration,
                semanticValidation: semanticDuration,
                semanticEnabled: enableSemantic
            },
            // NEW: Context used for scoring
            context: {
                contractType: context.contractType,
                industry: context.industry,
                contractValue: context.contractValue,
                durationMonths: context.durationMonths,
                userExperience: context.userExperience,
            },
            document: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                extractedCharacters: metadata.characterCount,
                pageCount: metadata.pageCount,
                extractedText: text  // Full text for contract viewer
            },
            analysis: {
                overallRiskScore: scoringResult.score,
                riskLevel: scoringResult.level,
                scoreExplanation: scoringResult.explanation, // NEW: Human-readable explanation
                totalClauses: clauses.length,
                riskyClausesFound: combinedViolations.length,
                // Breakdown by match source
                matchSourceBreakdown: {
                    keyword: combinedViolations.filter(v => v.matchSource === 'keyword').length,
                    semantic: combinedViolations.filter(v => v.matchSource === 'semantic').length,
                    both: combinedViolations.filter(v => v.matchSource === 'both').length
                },
                // NEW: Risk score breakdown by severity
                scoreBreakdown: scoringResult.breakdown,
                deviationsFromFairContract: deviations.length,
                breakdown: {
                    CRITICAL: combinedViolations.filter(v => v.riskLevel === 'CRITICAL').length,
                    HIGH: combinedViolations.filter(v => v.riskLevel === 'HIGH').length,
                    MEDIUM: combinedViolations.filter(v => v.riskLevel === 'MEDIUM').length,
                    LOW: combinedViolations.filter(v => v.riskLevel === 'LOW').length
                }
            },
            riskyClauses: explainedViolations,
            deviations: deviations,
            disclaimer: DISCLAIMER
        };

        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║              ANALYSIS COMPLETE                              ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║  ⏱️  Total time: ${totalTime}ms`);
        console.log(`║  📊 Risk score: ${scoringResult.score}/100 (${scoringResult.level})`);
        console.log(`║  📋 Context: ${context.contractType} / ${context.industry}`);
        console.log(`║  🔑 Keyword matches: ${keywordViolations.length}`);
        console.log(`║  🧠 Semantic matches: ${semanticMatches.length}`);
        console.log(`║  🔀 Combined unique: ${combinedViolations.length}`);
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        return NextResponse.json(response);

    } catch (error) {
        console.error('[ERROR] ❌ Analysis failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}
