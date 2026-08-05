import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceItem, OrderItem } from '../types';

export interface GenerateInvoicePdfOptions {
  invoice: InvoiceItem;
  order?: OrderItem | null;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
}

export function generateInvoicePdf({
  invoice,
  order,
  companyName = 'DistroAdmin Wholesale Distribution',
  companyAddress = '1044 Market Street, Suite 500, San Francisco, CA 94102',
  companyContact = 'billing@distroadmin.com | +1 (800) 555-0199',
}: GenerateInvoicePdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 90, 'F');

  // Decorative Accent line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 86, pageWidth, 4, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName, margin, 38);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(companyAddress, margin, 54);
  doc.text(companyContact, margin, 68);

  // Document Title on top-right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth - margin, 42, { align: 'right' });

  // Invoice # under INVOICE
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(invoice.invoiceNumber, pageWidth - margin, 60, { align: 'right' });

  // Status Badge box on top right
  const isPaidOrApproved = invoice.status === 'Paid' || invoice.status === 'Processing';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const statusText = `STATUS: ${invoice.status.toUpperCase()}`;
  const statusWidth = doc.getTextWidth(statusText) + 12;
  const statusX = pageWidth - margin - statusWidth;
  const statusY = 68;
  
  if (invoice.status === 'Paid') {
    doc.setFillColor(6, 95, 70); // emerald-800
    doc.roundedRect(statusX, statusY, statusWidth, 14, 2, 2, 'F');
    doc.setTextColor(209, 250, 229); // emerald-100
  } else if (invoice.status === 'Overdue') {
    doc.setFillColor(153, 27, 27); // red-800
    doc.roundedRect(statusX, statusY, statusWidth, 14, 2, 2, 'F');
    doc.setTextColor(254, 226, 226); // red-100
  } else {
    doc.setFillColor(146, 64, 14); // amber-800
    doc.roundedRect(statusX, statusY, statusWidth, 14, 2, 2, 'F');
    doc.setTextColor(254, 243, 199); // amber-100
  }
  doc.text(statusText, statusX + 6, statusY + 10);

  // Invoice Details & Billing Information Section
  let currentY = 115;

  // Metadata Card Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.roundedRect(margin, currentY, contentWidth, 75, 4, 4, 'FD');

  const col1X = margin + 14;
  const col2X = margin + 145;
  const col3X = margin + 275;
  const col4X = margin + 400;

  // Billed To Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('BILLED TO (MEMBER / STORE)', col1X, currentY + 16);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // slate-900
  const recipientName = invoice.billedTo || invoice.customerName || order?.customerName || 'Authorized Member Account';
  doc.text(recipientName, col1X, currentY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  if (invoice.memberUsername) {
    doc.text(`Account: @${invoice.memberUsername}`, col1X, currentY + 44);
  }
  const addressLine = order?.destinationAddress || order?.businessAddress || 'Main Wholesale Terminal';
  const splitAddress = doc.splitTextToSize(addressLine, 120);
  doc.text(splitAddress, col1X, currentY + 56);

  // Order Reference Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('REFERENCE ORDER #', col2X, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(invoice.orderNumber || 'N/A', col2X, currentY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Category: ${invoice.title || 'Wholesale Order'}`, col2X, currentY + 44);
  doc.text(`Method: ${invoice.method || 'Allocated Credit Line'}`, col2X, currentY + 56);

  // Issue & Due Dates
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('ISSUE DATE', col3X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.date || new Date().toISOString().split('T')[0], col3X, currentY + 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT DUE DATE', col3X, currentY + 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.dueDate || 'Net 15 Days', col3X, currentY + 60);

  // Total Amount Box on right
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(col4X - 10, currentY + 8, contentWidth - (col4X - margin - 10) - 8, 58, 4, 4, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT DUE', col4X, currentY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(`$${invoice.amount.toFixed(2)}`, col4X, currentY + 44);

  currentY += 92;

  // Build Table Data
  let tableData: (string | number)[][] = [];

  if (order && order.items && order.items.length > 0) {
    tableData = order.items.map((item, idx) => [
      (idx + 1).toString(),
      item.name || 'Product Item',
      item.sku || 'N/A',
      `$${item.price.toFixed(2)}`,
      item.qty.toString(),
      `$${(item.price * item.qty).toFixed(2)}`,
    ]);
  } else {
    // Fallback single line description
    tableData = [
      [
        '1',
        invoice.title || 'Wholesale Order Commercial Settlement',
        invoice.orderNumber || 'GEN-ITEM',
        `$${invoice.amount.toFixed(2)}`,
        '1',
        `$${invoice.amount.toFixed(2)}`,
      ],
    ];
  }

  // Draw Items Table using autoTable
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Description / SKU', 'SKU #', 'Unit Price', 'Qty', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 70, halign: 'center' },
      3: { cellWidth: 65, halign: 'right' },
      4: { cellWidth: 40, halign: 'center' },
      5: { cellWidth: 75, halign: 'right', fontStyle: 'bold' },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Calculate final Y after table
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 120;

  // Breakdown calculation (subtotal, shipping, taxes, total)
  const subtotal = order ? (order.subtotal || order.total) : invoice.amount;
  const shippingFee = order?.shippingFee ?? 0;
  const salesTax = order?.salesTax ?? 0;
  const serviceTax = order?.serviceTax ?? 0;
  const grandTotal = invoice.amount;

  const summaryWidth = 220;
  const summaryX = pageWidth - margin - summaryWidth;
  let summaryY = finalY + 12;

  // Summary Table box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.roundedRect(summaryX, summaryY, summaryWidth, 85, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  // Subtotal
  doc.text('Subtotal:', summaryX + 12, summaryY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${subtotal.toFixed(2)}`, summaryX + summaryWidth - 12, summaryY + 16, { align: 'right' });

  // Shipping Fee
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Shipping & Handling:', summaryX + 12, summaryY + 28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${shippingFee.toFixed(2)}`, summaryX + summaryWidth - 12, summaryY + 28, { align: 'right' });

  // Sales Tax & Service Tax
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Sales Tax (State/Local):', summaryX + 12, summaryY + 40);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${salesTax.toFixed(2)}`, summaryX + summaryWidth - 12, summaryY + 40, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Service & Handling Tax:', summaryX + 12, summaryY + 52);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${serviceTax.toFixed(2)}`, summaryX + summaryWidth - 12, summaryY + 52, { align: 'right' });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 10, summaryY + 58, summaryX + summaryWidth - 10, summaryY + 58);

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Invoice Amount:', summaryX + 12, summaryY + 74);
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`$${grandTotal.toFixed(2)}`, summaryX + summaryWidth - 12, summaryY + 74, { align: 'right' });

  // Left Note / Policy info
  const noteX = margin;
  const noteY = finalY + 12;
  const noteWidth = summaryX - margin - 15;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(noteX, noteY, noteWidth, 85, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL TERMS & PAYMENT INSTRUCTIONS', noteX + 10, noteY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const termsText = [
    '• Payment terms: Net 15 days upon invoice issuance unless otherwise specified.',
    '• For ACH / Wire transfers, reference your Invoice # and Store Account ID.',
    '• Approved & processed under DistroAdmin Master Commercial Wholesale Agreement.',
    invoice.notes ? `• Admin Note: ${invoice.notes}` : '• Thank you for partnering with DistroAdmin Wholesale Distribution.',
  ];
  let currentTermY = noteY + 28;
  termsText.forEach((t) => {
    doc.text(t, noteX + 10, currentTermY);
    currentTermY += 12;
  });

  // Footer bar at the bottom
  const footerY = pageHeight - 35;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by DistroAdmin Wholesale Portal on ${new Date().toLocaleString()} | Page 1 of 1`,
    margin,
    footerY + 14
  );
  doc.text('Confidential Commercial Document', pageWidth - margin, footerY + 14, { align: 'right' });

  return doc;
}

export function downloadInvoicePdf(options: GenerateInvoicePdfOptions): void {
  const doc = generateInvoicePdf(options);
  const filename = `Invoice_${options.invoice.invoiceNumber}.pdf`;
  doc.save(filename);
}

export function printOrDownloadInvoicePdf(options: GenerateInvoicePdfOptions): void {
  const doc = generateInvoicePdf(options);
  // Auto-download PDF file
  const filename = `Invoice_${options.invoice.invoiceNumber}.pdf`;
  doc.save(filename);
  
  // Also open print window / blob if browser supports it
  try {
    const blobUrl = doc.output('bloburl');
    const printWindow = window.open(blobUrl as unknown as string, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  } catch (e) {
    console.log('PDF downloaded, print preview window bypassed:', e);
  }
}
