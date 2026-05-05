const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Ventas diarias (fecha por defecto hoy)
router.get('/daily', authenticateToken, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const sales = db.prepare(`
    SELECT s.*, u.username, c.name as customer_name
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE date(s.created_at) = ?
    ORDER BY s.created_at DESC
  `).all(date);
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  res.json({ date, count: sales.length, total, sales });
});

// Ventas semanales (últimos 7 días)
router.get('/weekly', authenticateToken, (req, res) => {
  const sales = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count, SUM(total) as total
    FROM sales
    WHERE created_at >= date('now','-6 days')
    GROUP BY day
    ORDER BY day
  `).all();
  res.json(sales);
});

// Productos más vendidos
router.get('/top-products', authenticateToken, (req, res) => {
  const products = db.prepare(`
    SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.quantity * si.price * (1 - si.discount_percent/100)) as total_sales
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    GROUP BY p.id
    ORDER BY total_qty DESC
    LIMIT 10
  `).all();
  res.json(products);
});

// Ingresos por método de pago (periodo)
router.get('/payment-methods', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT payment_method, COUNT(*) as count, SUM(total) as total FROM sales';
  const params = [];
  if (from && to) {
    sql += ' WHERE date(created_at) BETWEEN ? AND ?';
    params.push(from, to);
  }
  sql += ' GROUP BY payment_method';
  const result = db.prepare(sql).all(...params);
  res.json(result);
});

module.exports = router;