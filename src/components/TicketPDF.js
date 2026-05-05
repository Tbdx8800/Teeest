import { jsPDF } from 'jspdf';

export function generateTicket(sale, items) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
  doc.setFontSize(10);
  doc.text('POS Tech Store', 10, 10);
  doc.text(`Ticket #${sale.id}`, 10, 16);
  doc.text(`Fecha: ${new Date(sale.created_at).toLocaleString()}`, 10, 22);
  doc.text(`Cajero: ${sale.username}`, 10, 28);
  if (sale.customer_name) doc.text(`Cliente: ${sale.customer_name}`, 10, 34);

  let y = 40;
  items.forEach((item, i) => {
    doc.text(`${item.product_name}`, 10, y);
    doc.text(`${item.quantity} x $${item.price.toFixed(2)}`, 10, y+5);
    y += 10;
  });

  doc.text('------------------------', 10, y);
  y += 5;
  doc.text(`Total: $${sale.total.toFixed(2)}`, 10, y);
  doc.text(`Método: ${sale.payment_method}`, 10, y+5);
  if (sale.cash_amount) doc.text(`Efectivo: $${sale.cash_amount}`, 10, y+10);

  doc.save(`ticket_${sale.id}.pdf`);
}