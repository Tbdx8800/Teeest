const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  res.json(customers);
});

router.get('/search', authenticateToken, (req, res) => {
  const { q } = req.query;
  const customers = db.prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ?').all(`%${q}%`, `%${q}%`);
  res.json(customers);
});

router.post('/', authenticateToken, (req, res) => {
  const { name, phone, email } = req.body;
  const info = db.prepare('INSERT INTO customers (name, phone, email) VALUES (?,?,?)').run(name, phone, email);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', authenticateToken, (req, res) => {
  const { name, phone, email } = req.body;
  db.prepare('UPDATE customers SET name=?, phone=?, email=? WHERE id=?').run(name, phone, email, req.params.id);
  res.json({ success: true });
});

module.exports = router;