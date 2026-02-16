/**
 * In-memory expense store for Vercel serverless (no native SQLite).
 * Same API as expenses.js; data is ephemeral per function instance.
 */
import { randomUUID } from 'crypto';

const expenses = [];
const idempotencyKeys = new Map();

function rupeesToPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

function paiseToRupees(paise) {
  return Math.round(paise) / 100;
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

export function createExpense(body, idempotencyKey) {
  const amountPaise = rupeesToPaise(body.amount);
  const date = String(body.date).trim();
  const category = String(body.category).trim();
  const description = String(body.description ?? '').trim();

  if (idempotencyKey && idempotencyKeys.has(idempotencyKey)) {
    const id = idempotencyKeys.get(idempotencyKey);
    const row = expenses.find((e) => e.id === id);
    if (row) return rowToExpense(row);
  }

  const id = randomUUID();
  const created_at = new Date().toISOString();
  const row = {
    id,
    amount_paise: amountPaise,
    category,
    description,
    date,
    created_at,
  };
  expenses.push(row);
  if (idempotencyKey) idempotencyKeys.set(idempotencyKey, id);
  return rowToExpense(row);
}

export function listExpenses({ category, sort } = {}) {
  let list = [...expenses];
  if (category != null && String(category).trim() !== '') {
    const c = String(category).trim();
    list = list.filter((e) => e.category === c);
  }
  list.sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    return d !== 0 ? d : new Date(b.created_at) - new Date(a.created_at);
  });
  return list.map(rowToExpense);
}
