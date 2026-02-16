import db from './db.js';
import { randomUUID } from 'crypto';

/** @param {number} paise */
function paiseToRupees(paise) {
  return Math.round(paise) / 100;
}

/** @param {number} rupees */
function rupeesToPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

/**
 * Create expense. Idempotent when Idempotency-Key is provided.
 * @param {{ amount: number, category: string, description: string, date: string }} body
 * @param {string | undefined} idempotencyKey
 */
export function createExpense(body, idempotencyKey) {
  const amountPaise = rupeesToPaise(body.amount);
  const date = String(body.date).trim();
  const category = String(body.category).trim();
  const description = String(body.description ?? '').trim();

  if (idempotencyKey) {
    const existing = db.prepare(
      'SELECT expense_id FROM idempotency_keys WHERE key = ?'
    ).get(idempotencyKey);
    if (existing) {
      const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(existing.expense_id);
      if (row) return rowToExpense(row);
    }
  }

  const id = randomUUID();
  const created_at = new Date().toISOString();

  db.prepare(`
    INSERT INTO expenses (id, amount_paise, category, description, date, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, amountPaise, category, description, date, created_at);

  if (idempotencyKey) {
    db.prepare(`
      INSERT OR IGNORE INTO idempotency_keys (key, expense_id, created_at)
      VALUES (?, ?, ?)
    `).run(idempotencyKey, id, created_at);
  }

  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
  return rowToExpense(row);
}

/**
 * @param {{ category?: string, sort?: string }} params
 */
export function listExpenses({ category, sort } = {}) {
  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const args = [];

  if (category != null && String(category).trim() !== '') {
    sql += ' AND category = ?';
    args.push(String(category).trim());
  }

  sql += ' ORDER BY date DESC, created_at DESC';
  if (sort === 'date_desc') {
    // already newest first
  }
  // else default is date_desc

  const rows = db.prepare(sql).all(...args);
  return rows.map(rowToExpense);
}

function rowToExpense(row) {
  return {
    id: row.id,
    amount: paiseToRupees(row.amount_paise),
    category: row.category,
    description: row.description,
    date: row.date,
    created_at: row.created_at,
  };
}
