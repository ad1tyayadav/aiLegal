/**
 * Contract Manager Service
 * 
 * Handles CRUD operations for contracts, drafts, templates, clauses, and signatures.
 */

import { db } from '../db/client';
import { randomUUID } from 'crypto';

// Types
export interface Contract {
    id: string;
    userId: string;
    title: string;
    status: 'draft' | 'final';
    content: string;
    templateId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Signature {
    id: string;
    userId: string;
    label: string;
    imageData: string;
    createdAt: string;
}

export interface ClauseLibraryItem {
    id: number;
    category: string;
    title: string;
    text: string;
    description: string;
    isDefault: number;
}

export interface ContractTemplate {
    id: string;
    title: string;
    description: string;
    defaultContent: string;
    category: string;
    createdAt: string;
}

// =====================================================
// CONTRACTS
// =====================================================

export function createContract(data: {
    userId?: string;
    title: string;
    content: string;
    status?: 'draft' | 'final';
    templateId?: string;
}): Contract {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO contracts (id, user_id, title, content, status, template_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        data.userId || 'default',
        data.title,
        data.content,
        data.status || 'draft',
        data.templateId || null,
        now,
        now
    );

    return getContractById(id)!;
}

export function getContractById(id: string): Contract | null {
    const stmt = db.prepare(`
        SELECT id, user_id as userId, title, status, content, template_id as templateId, 
               created_at as createdAt, updated_at as updatedAt
        FROM contracts WHERE id = ?
    `);

    return stmt.get(id) as Contract | null;
}

export function getContractsByUser(userId: string = 'default'): Contract[] {
    const stmt = db.prepare(`
        SELECT id, user_id as userId, title, status, content, template_id as templateId,
               created_at as createdAt, updated_at as updatedAt
        FROM contracts WHERE user_id = ?
        ORDER BY updated_at DESC
    `);

    return stmt.all(userId) as Contract[];
}

export function updateContract(id: string, data: Partial<{
    title: string;
    content: string;
    status: 'draft' | 'final';
}>): Contract | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
        updates.push('title = ?');
        values.push(data.title);
    }
    if (data.content !== undefined) {
        updates.push('content = ?');
        values.push(data.content);
    }
    if (data.status !== undefined) {
        updates.push('status = ?');
        values.push(data.status);
    }

    if (updates.length === 0) return getContractById(id);

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
        UPDATE contracts SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return getContractById(id);
}

export function deleteContract(id: string): boolean {
    const stmt = db.prepare('DELETE FROM contracts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

// =====================================================
// SIGNATURES
// =====================================================

export function createSignature(data: {
    userId?: string;
    label: string;
    imageData: string;
}): Signature {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO signatures (id, user_id, label, image_data, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.userId || 'default', data.label, data.imageData, now);

    return getSignatureById(id)!;
}

export function getSignatureById(id: string): Signature | null {
    const stmt = db.prepare(`
        SELECT id, user_id as userId, label, image_data as imageData, created_at as createdAt
        FROM signatures WHERE id = ?
    `);

    return stmt.get(id) as Signature | null;
}

export function getSignaturesByUser(userId: string = 'default'): Signature[] {
    const stmt = db.prepare(`
        SELECT id, user_id as userId, label, image_data as imageData, created_at as createdAt
        FROM signatures WHERE user_id = ?
        ORDER BY created_at DESC
    `);

    return stmt.all(userId) as Signature[];
}

export function deleteSignature(id: string): boolean {
    const stmt = db.prepare('DELETE FROM signatures WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

// =====================================================
// CLAUSE LIBRARY
// =====================================================

export function getClauses(category?: string): ClauseLibraryItem[] {
    let query = `
        SELECT id, category, title, text, description, is_default as isDefault
        FROM clause_library
    `;

    if (category) {
        query += ' WHERE category = ?';
        const stmt = db.prepare(query);
        return stmt.all(category) as ClauseLibraryItem[];
    }

    const stmt = db.prepare(query + ' ORDER BY category, title');
    return stmt.all() as ClauseLibraryItem[];
}

export function getClauseCategories(): string[] {
    const stmt = db.prepare('SELECT DISTINCT category FROM clause_library ORDER BY category');
    const rows = stmt.all() as { category: string }[];
    return rows.map(r => r.category);
}

// =====================================================
// CONTRACT TEMPLATES
// =====================================================

export function getTemplates(category?: string): ContractTemplate[] {
    let query = `
        SELECT id, title, description, default_content as defaultContent, category, created_at as createdAt
        FROM contract_templates
    `;

    if (category) {
        query += ' WHERE category = ?';
        const stmt = db.prepare(query);
        return stmt.all(category) as ContractTemplate[];
    }

    const stmt = db.prepare(query + ' ORDER BY title');
    return stmt.all() as ContractTemplate[];
}

export function getTemplateById(id: string): ContractTemplate | null {
    const stmt = db.prepare(`
        SELECT id, title, description, default_content as defaultContent, category, created_at as createdAt
        FROM contract_templates WHERE id = ?
    `);

    return stmt.get(id) as ContractTemplate | null;
}

export function getTemplateCategories(): string[] {
    const stmt = db.prepare('SELECT DISTINCT category FROM contract_templates ORDER BY category');
    const rows = stmt.all() as { category: string }[];
    return rows.map(r => r.category);
}
