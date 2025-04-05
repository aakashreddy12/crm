import React, { useEffect } from 'react';
import { jsPDF } from 'jspdf';

interface PaymentReceiptProps {
  date: string;
  amount: number;
  receivedFrom: string;
  paymentMode: string;
  placeOfSupply: string;
  customerAddress?: string; // Optional customer address
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = (props) => {
  const {
    date,
    amount,
    receivedFrom,
    paymentMode,
    placeOfSupply,
    customerAddress = "123 Main Street, City, State" // Default address if none provided
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

        // Set page margins and layout dimensions
        const margin = 20;
        const pageWidth = doc.internal.pageSize.width;
        const contentWidth = pageWidth - (margin * 2);
        
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
        
        // Table layout - improved alignment
        const startY = 100;
        const rowHeight = 15;
        
        // Column widths
        const labelColWidth = 80;
        const valueColWidth = 80;
        const amountColWidth = 65;
        
        // Calculate positions for perfect alignment
        const labelColX = margin; // Left margin
        const valueColX = margin + labelColWidth + 10; // After label column with some spacing
        const amountColX = valueColX + valueColWidth + 10; // After value column
        
        // Reference ID - fixed to match image
        const refNumber = 'ZBYKUQLSS';
        
        // Draw table labels - aligned left
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(15);
        doc.setTextColor(0, 0, 0);
        
        // Label column
        doc.text('Payment Date', labelColX, startY + 7);
        doc.text('Reference Number', labelColX, startY + rowHeight + 7);
        doc.text('Payment Mode', labelColX, startY + rowHeight * 2 + 7);
        doc.text('Place Of Supply', labelColX, startY + rowHeight * 3 + 7);
        doc.text('Amount Received In', labelColX, startY + rowHeight * 4 + 7);
        doc.text('Words', labelColX, startY + rowHeight * 5 + 7);
        
        // Received from section - aligned properly
        doc.text('Received From', labelColX, startY + rowHeight * 7 + 7);
        
        // Draw value cells with background
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
          
          // Position text in center of cell vertically
          const textY = y + (height / 2) + (fontSize / 6);
          doc.text(text, x + 5, textY);
        };
        
        // Draw cells with data
        drawDataCell(valueColX, startY, valueColWidth, rowHeight, date);
        drawDataCell(valueColX, startY + rowHeight, valueColWidth, rowHeight, refNumber);
        drawDataCell(valueColX, startY + rowHeight * 2, valueColWidth, rowHeight, 'Bank Transfer');
        drawDataCell(valueColX, startY + rowHeight * 3, valueColWidth, rowHeight, `${placeOfSupply} (36)`);
        
        // Amount in words (spanning two rows)
        drawDataCell(valueColX, startY + rowHeight * 4, valueColWidth, rowHeight * 2, 'Indian Rupee Ten Thousand Only');
        
        // Amount box with green background
        doc.setFillColor(140, 198, 63); // Green color
        doc.rect(amountColX, startY, amountColWidth, rowHeight * 2, 'F');
        
        // Amount Received label
        doc.setTextColor(255, 255, 255); // White text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(15);
        doc.text('Amount Received', amountColX + 5, startY + 10);
        
        // Amount value - centered in the box
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(23);
        const amountText = `Rs.${amount.toLocaleString()}`;
        doc.text(amountText, amountColX + 5, startY + 30);
        
        // Received from name cell
        const customerNameY = startY + rowHeight * 7 + 10;
        drawDataCell(labelColX, customerNameY, labelColWidth, rowHeight, receivedFrom);
        
        // Customer address below name with same background
        if (customerAddress) {
          const addressY = customerNameY + rowHeight;
          drawDataCell(labelColX, addressY, labelColWidth, rowHeight, customerAddress, 11);
        }
        
        // Add signature at bottom right - aligned with the right side
        if (signatureImg) {
          const signatureY = startY + rowHeight * 7 + 10;
          doc.addImage(signatureImg, 'PNG', amountColX, signatureY, 55, 25);
          
          // Add signature text
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text('Authorized Signature', amountColX + 10, signatureY + 30);
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

// Helper function to convert number to words
const convertNumberToWords = (num: number): string => {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const teens = ['Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const convertLessThanThousand = (n: number): string => {
    if (n < 11) return units[n];
    if (n < 20) return teens[n - 11];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
    return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const convertLakh = (n: number): string => {
    if (n < 1000) return convertLessThanThousand(n);
    if (n < 100000) return convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertLessThanThousand(n % 1000) : '');
    return convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convertLakh(n % 100000) : '');
  };

  return convertLakh(num);
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