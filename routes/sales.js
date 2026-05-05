const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Crear una venta (transaccional)
router.post('/', authenticateToken, (req, res) => {
  const { customer_id, items, payment_method, cash_amount } = req.body; // items: [{product_id, quantity, price, discount_percent}]
  if (!items || items.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

  const transaction = db.transaction(() => {
    // Calcular total
    let total = 0;
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) throw new Error(`Producto ${item.product_id} no encontrado`);
      if (product.stock < item.quantity && !product.is_service) throw new Error(`Stock insuficiente para ${product.name}`);
      const itemTotal = item.price * item.quantity * (1 - (item.discount_percent || 0) / 100);
      total += itemTotal;
    }

    // Si hay cliente, sumar puntos (1 punto por cada 10 pesos)
    if (customer_id) {
      const pointsEarned = Math.floor(total / 10);
      db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(pointsEarned, customer_id);
    }

    // Insertar venta
    const saleInfo = db.prepare('INSERT INTO sales (user_id, customer_id, total, payment_method, cash_amount, change_amount) VALUES (?,?,?,?,?,?)').run(
      req.user.id, customer_id, total, payment_method,
      payment_method === 'cash' ? cash_amount : null,
      payment_method === 'cash' ? cash_amount - total : null
    );
    const saleId = saleInfo.lastInsertRowid;

    // Insertar items y actualizar stock
    const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, discount_percent) VALUES (?,?,?,?,?)');
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND is_service = 0');
    for (const item of items) {
      insertItem.run(saleId, item.product_id, item.quantity, item.price, item.discount_percent || 0);
      updateStock.run(item.quantity, item.product_id);
    }

    return saleId;
  });

  try {
    const saleId = transaction();
    const sale = db.prepare(`
      SELECT s.*, u.username, c.name as customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(saleId);
    const saleItems = db.prepare(`
      SELECT si.*, p.name as product_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(saleId);
    res.status(201).json({ sale, items: saleItems });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Historial de ventas (con filtros opcionales)
router.get('/', authenticateToken, (req, res) => {
  const { from, to } = req.query; // formato YYYY-MM-DD
  let sql = 'SELECT s.*, u.username, c.name as customer_name FROM sales s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN customers c ON s.customer_id = c.id';
  const params = [];
  if (from && to) {
    sql += ' WHERE date(s.created_at) BETWEEN ? AND ?';
    params.push(from, to);
  } else if (from) {
    sql += ' WHERE date(s.created_at) >= ?';
    params.push(from);
  } else if (to) {
    sql += ' WHERE date(s.created_at) <= ?';
    params.push(to);
  }
  sql += ' ORDER BY s.created_at DESC LIMIT 100';
  const sales = db.prepare(sql).all(...params);
  res.json(sales);
});

// Detalle de una venta
router.get('/:id', authenticateToken, (req, res) => {
  const sale = db.prepare('SELECT s.*, u.username, c.name as customer_name FROM sales s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
  const items = db.prepare('SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?').all(req.params.id);
  res.json({ sale, items });
});

module.exports = router;