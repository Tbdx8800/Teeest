const db = require('./db');
const bcrypt = require('bcryptjs');

// Limpiar e insertar datos de ejemplo
db.exec('DELETE FROM sale_items');
db.exec('DELETE FROM sales');
db.exec('DELETE FROM products');
db.exec('DELETE FROM categories');
db.exec('DELETE FROM customers');
db.exec('DELETE FROM users');

// Usuarios
const hashedAdmin = bcrypt.hashSync('admin123', 10);
const hashedCashier = bcrypt.hashSync('cajero123', 10);
db.prepare('INSERT INTO users (username, password, role) VALUES (?,?,?)').run('admin', hashedAdmin, 'admin');
db.prepare('INSERT INTO users (username, password, role) VALUES (?,?,?)').run('cajero1', hashedCashier, 'cashier');

// Categorías
db.prepare('INSERT INTO categories (name) VALUES (?)').run('Teléfonos');
db.prepare('INSERT INTO categories (name) VALUES (?)').run('Accesorios');
db.prepare('INSERT INTO categories (name) VALUES (?)').run('Servicios');

// Productos (índices para categorías: 1 Teléfonos, 2 Accesorios, 3 Servicios)
const products = [
  { sku:'PHONE001', barcode:'7501000000010', name:'iPhone 14 128GB', category_id:1, price:18999, cost:15000, stock:20, is_service:0 },
  { sku:'PHONE002', barcode:'7501000000027', name:'Samsung Galaxy S23', category_id:1, price:15999, cost:12000, stock:15, is_service:0 },
  { sku:'ACC001', barcode:'7501000000034', name:'Funda transparente iPhone 14', category_id:2, price:299, cost:100, stock:50 },
  { sku:'ACC002', barcode:'7501000000041', name:'Audífonos Bluetooth', category_id:2, price:899, cost:400, stock:30 },
  { sku:'SERV001', barcode:'7501000000058', name:'Instalación de software', category_id:3, price:350, cost:0, stock:999, is_service:1 },
  { sku:'SERV002', barcode:'7501000000065', name:'Reparación básica (diagnóstico)', category_id:3, price:500, cost:0, stock:999, is_service:1 }
];

const insertProduct = db.prepare('INSERT INTO products (sku,barcode,name,category_id,price,cost,stock,min_stock,is_service) VALUES (?,?,?,?,?,?,?,?,?)');
products.forEach(p => insertProduct.run(p.sku, p.barcode, p.name, p.category_id, p.price, p.cost, p.stock, 5, p.is_service));

// Clientes de ejemplo
db.prepare('INSERT INTO customers (name, phone, email) VALUES (?,?,?)').run('Juan Pérez', '555-1234', 'juan@example.com');
db.prepare('INSERT INTO customers (name, phone, email) VALUES (?,?,?)').run('María López', '555-5678', 'maria@example.com');

console.log('Base de datos sembrada correctamente.');
process.exit(0);