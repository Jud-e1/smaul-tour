import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import { Payment } from './interfaces/payment.interfaces';

@Injectable()
export class ReceiptService {
  generateReceiptPdf(payment: Payment): Buffer {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Header
    doc.fontSize(20).text('AI Tourism Marketplace', { align: 'center' });
    doc.fontSize(14).text('Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Transaction details
    doc.fontSize(12);
    doc.text(`Transaction ID:    ${payment.id}`);
    doc.text(`Booking Reference: ${payment.bookingId}`);
    doc.text(`Amount:            ${payment.amount.amount} ${payment.amount.currency}`);
    doc.text(`Status:            ${payment.status}`);
    doc.text(`Payment Date:      ${payment.createdAt.toISOString()}`);

    doc.end();

    return Buffer.concat(chunks);
  }
}
