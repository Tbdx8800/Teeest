const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Obtener todos los productos (con categoría)
router.get('/', authenticateToken, (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.name
  `).all();
  res.json(products);
});

// Buscar por texto (nombre, sku o código de barras)
router.get('/search', authenticateToken, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.name LIKE ? OR p.sku = ? OR p.barcode = ?
    LIMIT 10
  `).all(`%${q}%`, q, q);
  res.json(products);
});

router.post('/', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { sku, barcode, name, category_id, price, cost, stock, min_stock, is_service } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO products (sku,barcode,name,category_id,price,cost,stock,min_stock,is_service) VALUES (?,?,?,?,?,?,?,?,?)');
    const info = stmt.run(sku, barcode, name, category_id, price, cost, stock, min_stock || 5, is_service ? 1 : 0);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { id } = req.params;
  const { sku, barcode, name, category_id, price, cost, stock, min_stock, is_service } = req.body;
  db.prepare(`
    UPDATE products SET sku=?, barcode=?, name=?, category_id=?, price=?, cost=?, stock=?, min_stock=?, is_service=?
    WHERE id=?
  `).run(sku, barcode, name, category_id, price, cost, stock, min_stock, is_service ? 1 : 0, id);
  res.json({ success: true });
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Obtener productos con stock bajo
router.get('/low-stock', authenticateToken, (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE stock <= min_stock AND is_service=0').all();
  res.json(products);
});

module.exports = router;