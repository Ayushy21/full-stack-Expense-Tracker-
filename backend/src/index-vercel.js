/**
 * Express app for Vercel serverless. Uses in-memory store (no native SQLite).
 */
import express from 'express';
import cors from 'cors';
import { createExpense, listExpenses } from './expenses-memory.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/expenses', (req, res) => {
  try {
    const { amount, category, description, date } = req.body;
    const idempotencyKey = req.get('Idempotency-Key') || undefined;

    if (amount == null || category == null || date == null) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['amount', 'category', 'date'],
      });
    }

    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Amount must be a non-negative number' });
    }

    const expense = createExpense(
      {
        amount: numAmount,
        category: String(category),
        description: description ?? '',
        date: String(date),
      },
      idempotencyKey
    );
    res.status(201).json(expense);
  } catch (err) {
    console.error('POST /expenses error:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.get('/expenses', (req, res) => {
  try {
    const category = req.query.category;
    const sort = req.query.sort || 'date_desc';
    const expenses = listExpenses({ category, sort });
    res.json(expenses);
  } catch (err) {
    console.error('GET /expenses error:', err);
    res.status(500).json({ error: 'Failed to list expenses' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

export { app };
