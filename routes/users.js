const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/', authenticateToken, authorizeRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users').all();
  res.json(users);
});

router.post('/', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { username, password, role } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare('INSERT INTO users (username, password, role) VALUES (?,?,?)').run(username, hashed, role);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  db.prepare('DELETE FROM users WHERE id=? AND role != "admin"').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;