const PDFDocument = require('pdfkit');

/**
 * Generate a fleet report PDF buffer.
 * @param {object} data  - { title, rows, columns }
 * @returns {Buffer}
 */
const generateReportPDF = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(22)
      .fillColor('#10b981')
      .text('TransitOps', { align: 'center' });
    doc
      .fontSize(14)
      .fillColor('#1e293b')
      .text(data.title || 'Report', { align: 'center' });
    doc
      .fontSize(10)
      .fillColor('#64748b')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    // Column headers
    const colWidth = 510 / (data.columns || []).length;
    let x = 50;
    doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold');
    (data.columns || []).forEach((col) => {
      doc.text(col, x, doc.y, { width: colWidth, align: 'left' });
      x += colWidth;
    });

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#e2e8f0').stroke();

    // Rows
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    (data.rows || []).forEach((row, i) => {
      if (doc.y > 720) doc.addPage();
      x = 50;
      const y = doc.y + 5;
      if (i % 2 === 0) {
        doc.rect(50, y - 2, 510, 16).fill('#f8fafc').fillColor('#334155');
      }
      row.forEach((cell) => {
        doc.text(String(cell ?? ''), x, y, { width: colWidth, align: 'left' });
        x += colWidth;
      });
      doc.moveDown(0.8);
    });

    doc.end();
  });
};

module.exports = { generateReportPDF };
