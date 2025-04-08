import React, { useEffect } from 'react';
import { jsPDF } from 'jspdf';

interface PaymentReceiptProps {
  date: string;
  amount: number;
  receivedFrom: string;
  paymentMode: string;
  placeOfSupply: string;
  customerAddress: string; // Customer address from database
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = (props) => {
  const {
    date,
    amount,
    receivedFrom,
    paymentMode,
    placeOfSupply,
    customerAddress
  } = props;

  useEffect(() => {
    const generatePDF = async () => {
      // Create a new PDF document with A4 size
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      try {
        // Load images first
        const [logoImg, signatureImg] = await Promise.all([
          loadImage('/images/axiso-logo.png'),
          loadImage('/images/signature.png')
        ]);

        // Set page dimensions
        const margin = 20;
        const pageWidth = doc.internal.pageSize.width;
        
        // Set white background for the whole page
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, 297, 'F');
        
        // Company details on the left
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('Axiso Green Energies Private Limited', margin, 25);
        
        // Company details in lighter text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text('Telangana', margin, 32);
        doc.text('India', margin, 39);
        doc.text('GSTIN 36ABCA4478M1Z9', margin, 46);
        doc.text('admin@axisogreen.in', margin, 53);
        doc.text('www.axisogreen.in', margin, 60);
        
        // Add logo at right side
        if (logoImg) {
          doc.addImage(logoImg, 'PNG', pageWidth - margin - 45, 25, 45, 30);
        }
        
        // Add horizontal line
        doc.setLineWidth(0.5);
        doc.line(margin, 70, pageWidth - margin, 70);

        // Payment Receipt title - centered
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(21);
        const titleText = 'PAYMENT RECEIPT';
        doc.text(titleText, pageWidth / 2, 85, { align: 'center' });
        
        // Background color for data cells - #97afc2 with 29% opacity
        const r = 151, g = 175, b = 194; // #97afc2 in RGB
        const blendWithWhite = (color: number, opacity: number) => {
          return Math.round(color * opacity + 255 * (1 - opacity));
        };
        
        // Calculate colors with 29% opacity
        const bgColorR = blendWithWhite(r, 0.29);
        const bgColorG = blendWithWhite(g, 0.29);
        const bgColorB = blendWithWhite(b, 0.29);
        
        // Set up table dimensions to match the example image
        const startY = 100;
        const rowHeight = 15;
        
        // Set up cell dimensions
        const labelColWidth = 80;
        const dataColWidth = 120;
        
        // Layout coordinates
        const labelX = margin;
        const dataX = margin + labelColWidth;
        
        // Green box dimensions - smaller as requested
        const greenBoxWidth = 55;
        const greenBoxHeight = rowHeight * 2; // Reduced height
        const greenBoxX = dataX + dataColWidth - greenBoxWidth;
        
        // Reference ID
        const refNumber = 'ZBYKUQLSS';
        
        // Draw labels - left aligned
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(15);
        doc.setTextColor(0, 0, 0);
        
        doc.text('Payment Date', labelX, startY + 7);
        doc.text('Reference Number', labelX, startY + rowHeight + 7);
        doc.text('Payment Mode', labelX, startY + rowHeight * 2 + 7);
        doc.text('Place Of Supply', labelX, startY + rowHeight * 3 + 7);
        doc.text('Amount Received In', labelX, startY + rowHeight * 4 + 7);
        doc.text('Words', labelX, startY + rowHeight * 5 + 7);
        
        // Function to draw data cells with background
        const drawDataCell = (
          x: number,
          y: number,
          width: number, 
          height: number, 
          text: string, 
          fontSize: number = 15
        ): void => {
          // Background for data
          doc.setFillColor(bgColorR, bgColorG, bgColorB);
          doc.rect(x, y, width, height, 'F');
          
          // Text for data
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(fontSize);
          
          // Position text in cell
          const textY = y + (height / 2) + (fontSize / 6);
          doc.text(text, x + 5, textY);
        };
        
        // Draw the green box first - smaller
        doc.setFillColor(140, 198, 63); // Green color
        doc.rect(greenBoxX, startY, greenBoxWidth, greenBoxHeight, 'F');
        
        // Amount Received label
        doc.setTextColor(255, 255, 255); // White text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.text('Amount', greenBoxX + 5, startY + 10);
        doc.text('Received', greenBoxX + 5, startY + 22);
        
        // Amount value - positioned to match example
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        const amountText = `Rs.${amount.toLocaleString()}`;
        doc.text(amountText, greenBoxX + 5, startY + greenBoxHeight + 12);
        
        // Draw data cells for payment details - adjusted to not overlap with green box
        const adjustedDataWidth = dataColWidth - greenBoxWidth;
        drawDataCell(dataX, startY, adjustedDataWidth, rowHeight, date);
        drawDataCell(dataX, startY + rowHeight, adjustedDataWidth, rowHeight, refNumber);
        
        // Fill all other data fields with the background color
        drawDataCell(dataX, startY + rowHeight * 2, dataColWidth, rowHeight, paymentMode);
        drawDataCell(dataX, startY + rowHeight * 3, dataColWidth, rowHeight, `${placeOfSupply} (36)`);
        
        // Amount in words - spanning two rows
        const amountInWords = 'Indian Rupee Ten Thousand Only';
        drawDataCell(dataX, startY + rowHeight * 4, dataColWidth, rowHeight * 2, amountInWords);
        
        // Received from section
        const receivedFromY = startY + rowHeight * 7;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(15);
        doc.text('Received From', labelX, receivedFromY);
        
        // Customer name with blue background
        const fullWidth = dataColWidth + labelColWidth;
        drawDataCell(labelX, receivedFromY + 5, fullWidth, rowHeight, receivedFrom);
        
        // Customer address with same blue background
        if (customerAddress) {
          drawDataCell(labelX, receivedFromY + 5 + rowHeight, fullWidth, rowHeight, customerAddress, 11);
        }
        
        // Add signature at bottom right
        if (signatureImg) {
          const signatureY = receivedFromY + 5;
          doc.addImage(signatureImg, 'PNG', greenBoxX, signatureY, 50, 20);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text('Authorized Signature', greenBoxX, signatureY + 35);
        }
        
        // Save the PDF with a filename based on customer and date
        doc.save(`${receivedFrom}-receipt-${date}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    };

    generatePDF();
  }, [date, amount, receivedFrom, paymentMode, placeOfSupply, customerAddress]);

  // The component doesn't render anything visible
  return null;
};

// Helper function to load image
const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load image: ${url}`);
      resolve(''); // Return empty string if image fails to load
    };
    img.src = url;
  });
};

export default PaymentReceipt; 