import { format } from 'date-fns';
import { escapeHtml } from './sanitize';

interface ExportOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  total: number;
  subtotal: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  order_items: Array<{
    product_name_en: string;
    product_name_bn: string;
    quantity: number;
    price: number;
  }>;
}

export function exportToCSV(orders: ExportOrder[], filename: string) {
  const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Email', 'City', 'Address', 'Items', 'Subtotal', 'Total', 'Payment Method', 'Payment Status', 'Order Status'];
  const rows = orders.map(o => [
    o.id.slice(0, 8).toUpperCase(),
    format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
    `"${o.customer_name}"`,
    o.customer_phone,
    o.customer_email || '',
    `"${o.customer_city}"`,
    `"${o.customer_address}"`,
    o.order_items.map(i => `${i.product_name_en} x${i.quantity}`).join('; '),
    o.subtotal,
    o.total,
    o.payment_method,
    o.payment_status,
    o.order_status,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

export function exportToExcel(orders: ExportOrder[], filename: string) {
  // Create HTML table that Excel can open
  const header = '<tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Phone</th><th>Email</th><th>City</th><th>Address</th><th>Items</th><th>Subtotal</th><th>Total</th><th>Payment</th><th>Payment Status</th><th>Order Status</th></tr>';
  const rows = orders.map(o => `<tr>
    <td>${escapeHtml(o.id.slice(0, 8).toUpperCase())}</td>
    <td>${format(new Date(o.created_at), 'yyyy-MM-dd HH:mm')}</td>
    <td>${escapeHtml(o.customer_name)}</td>
    <td>${escapeHtml(o.customer_phone)}</td>
    <td>${escapeHtml(o.customer_email || '')}</td>
    <td>${escapeHtml(o.customer_city)}</td>
    <td>${escapeHtml(o.customer_address)}</td>
    <td>${o.order_items.map(i => `${escapeHtml(i.product_name_en)} x${i.quantity}`).join(', ')}</td>
    <td>${o.subtotal}</td>
    <td>${o.total}</td>
    <td>${escapeHtml(o.payment_method)}</td>
    <td>${escapeHtml(o.payment_status)}</td>
    <td>${escapeHtml(o.order_status)}</td>
  </tr>`).join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Orders</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1">${header}${rows}</table></body></html>`;
  downloadFile(html, `${filename}.xls`, 'application/vnd.ms-excel');
}

export function exportToPDF(orders: ExportOrder[], filename: string, storeSettings?: Record<string, string>) {
  const storeName = storeSettings?.store_name || 'ShopLandBD';
  const storePhone = storeSettings?.store_phone || '';
  const storeEmail = storeSettings?.store_email || '';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${filename}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; font-size: 11px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #10b981; padding-bottom: 15px; }
  .header h1 { color: #10b981; margin: 0; font-size: 22px; }
  .header p { color: #666; margin: 3px 0; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 10px; border: 1px solid #ddd; }
  td { padding: 6px 8px; border: 1px solid #eee; font-size: 10px; }
  tr:nth-child(even) { background: #fafafa; }
  .footer { margin-top: 20px; text-align: center; color: #999; font-size: 10px; }
  .summary { margin-top: 15px; text-align: right; font-weight: bold; }
  @media print { body { padding: 10px; } }
</style></head><body>
   <div class="header">
    ${storeSettings?.store_logo ? `<img src="${escapeHtml(storeSettings.store_logo)}" alt="${escapeHtml(storeName)}" style="max-height:50px;width:auto;margin-bottom:8px;" />` : ''}
    <h1>${escapeHtml(storeName)}</h1>
    <p>Orders Report - Generated: ${format(new Date(), 'PPP')}</p>
    ${storePhone ? `<p>Phone: ${escapeHtml(storePhone)}</p>` : ''}
    ${storeEmail ? `<p>Email: ${escapeHtml(storeEmail)}</p>` : ''}
    ${storeSettings?.store_address ? `<p>${escapeHtml(storeSettings.store_address)}</p>` : ''}
  </div>
  <table>
    <thead><tr><th>#</th><th>Order ID</th><th>Date</th><th>Customer</th><th>Phone</th><th>City</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
    <tbody>
      ${orders.map((o, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(o.id.slice(0, 8).toUpperCase())}</td>
        <td>${format(new Date(o.created_at), 'dd/MM/yy')}</td>
        <td>${escapeHtml(o.customer_name)}</td>
        <td>${escapeHtml(o.customer_phone)}</td>
        <td>${escapeHtml(o.customer_city)}</td>
        <td>${o.order_items.map(it => `${escapeHtml(it.product_name_en)} x${it.quantity}`).join(', ')}</td>
        <td>৳${Number(o.total).toLocaleString()}</td>
        <td>${escapeHtml(o.payment_method)}</td>
        <td>${escapeHtml(o.order_status)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="summary">
    Total Orders: ${orders.length} | Total Revenue: ৳${orders.reduce((s, o) => s + Number(o.total), 0).toLocaleString()}
  </div>
  <div class="footer"><p>Generated by ${escapeHtml(storeName)}</p></div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
