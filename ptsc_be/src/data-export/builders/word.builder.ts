import { Injectable } from '@nestjs/common';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { IExportFileResult } from '../interfaces/data-export.interface';

@Injectable()
export class WordBuilder {
  /**
   * Build a real .docx document from text content using the 'docx' library.
   * 
   * @param content Nội dung văn bản
   * @param filename Tên file (không bao gồm phần mở rộng)
   */
  async buildFromText(content: string, filename: string): Promise<IExportFileResult> {
    // 1. Tách các dòng để tạo các đoạn văn bản (Paragraph) tương ứng
    const lines = (content || '').split('\n');
    
    const paragraphs = lines.map(line => {
      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: 'Times New Roman',
            size: 24, // 24 half-points = 12pt
          }),
        ],
        spacing: {
          line: 360, // 1.5 line spacing (240 * 1.5)
          before: 0,
          after: 0,
        },
      });
    });

    // 2. Tạo định dạng tài liệu docx
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    // 3. Xuất ra Buffer
    const buffer = await Packer.toBuffer(doc);

    return {
      buffer,
      filename: `${filename}.docx`,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }
}
