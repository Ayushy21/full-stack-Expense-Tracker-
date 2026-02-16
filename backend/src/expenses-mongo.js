/**
 * Expense store using MongoDB. Same API as expenses.js / expenses-memory.js.
 */
import { randomUUID } from 'crypto';
import { getDb, expensesCollection, idempotencyCollection } from './db-mongo.js';

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

export async function createExpense(body, idempotencyKey) {
  const db = await getDb();
  const expenses = expensesCollection(db);
  const idempotency = idempotencyCollection(db);

  const amountPaise = rupeesToPaise(body.amount);
  const date = String(body.date).trim();
  const category = String(body.category).trim();
  const description = String(body.description ?? '').trim();

  if (idempotencyKey) {
    const existing = await idempotency.findOne({ _id: idempotencyKey });
    if (existing) {
      const row = await expenses.findOne({ id: existing.expense_id });
      if (row) return rowToExpense(row);
    }
  }

  const id = randomUUID();
  const created_at = new Date().toISOString();
  const doc = {
    id,
    amount_paise: amountPaise,
    category,
    description,
    date,
    created_at,
  };
  await expenses.insertOne(doc);
  if (idempotencyKey) {
    await idempotency.updateOne(
      { _id: idempotencyKey },
      { $set: { expense_id: id, created_at } },
      { upsert: true }
    );
  }
  return rowToExpense(doc);
}

export async function listExpenses({ category, sort } = {}) {
  const db = await getDb();
  const expenses = expensesCollection(db);
  const filter = {};
  if (category != null && String(category).trim() !== '') {
    filter.category = String(category).trim();
  }
  const cursor = expenses
    .find(filter)
    .sort({ date: -1, created_at: -1 });
  const rows = await cursor.toArray();
  return rows.map(rowToExpense);
}
