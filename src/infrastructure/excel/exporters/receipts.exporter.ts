import ExcelJS from 'exceljs';

export class ReceiptsExporter {
  async export(receipts: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sổ thu chi');

    worksheet.columns = [
      { header: 'Mã phiếu', key: 'receiptCode', width: 15 },
      { header: 'Ngày lập', key: 'createdAt', width: 20 },
      { header: 'Loại', key: 'type', width: 15 },
      { header: 'Người nộp/nhận', key: 'payerName', width: 25 },
      { header: 'Số tiền', key: 'amount', width: 20 },
      { header: 'Hình thức', key: 'paymentMethod', width: 15 },
      { header: 'Mã tham chiếu', key: 'referenceCode', width: 20 },
      { header: 'Ghi chú', key: 'note', width: 30 },
      { header: 'Người lập', key: 'createdByName', width: 20 },
    ];

    let totalAmount = 0;

    for (const r of receipts) {
      // Assuming IN is positive, OUT is negative
      const amountVal = r.type === 'OUT' ? -Number(r.amount) : Number(r.amount);
      totalAmount += amountVal;

      worksheet.addRow({
        receiptCode: r.receiptCode,
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '',
        type: r.type === 'IN' ? 'Thu' : 'Chi',
        payerName: r.payerName,
        amount: amountVal,
        paymentMethod: r.paymentMethod,
        referenceCode: r.referenceCode,
        note: r.note,
        createdByName: r.createdByName,
      });
    }

    worksheet.getRow(1).font = { bold: true };
    
    // Add total row
    const totalRow = worksheet.addRow({
      payerName: 'TỔNG CỘNG',
      amount: totalAmount,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
