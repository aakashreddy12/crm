import React, { useEffect } from 'react';
import { jsPDF } from 'jspdf';

interface PaymentReceiptProps {
  date: string;
  amount: number;
  receivedFrom: string;
  paymentMode: string;
  placeOfSupply: string;
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = (props) => {
  const {
    date,
    amount,
    receivedFrom,
    paymentMode,
    placeOfSupply
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

        // Set the background with black borders (left and right)
        doc.setFillColor(12, 15, 18); // Dark color for borders
        doc.rect(0, 0, 60, 297, 'F'); // Left border
        doc.rect(150, 0, 60, 297, 'F'); // Right border
        
        // Set white space in the middle
        doc.setFillColor(255, 255, 255);
        doc.rect(60, 0, 90, 297, 'F');
        
        // Set page margins
        const margin = 20;
        const contentAreaStart = 60; // where the white area starts
        const contentAreaWidth = 90; // width of the white area
        const contentCenter = contentAreaStart + contentAreaWidth / 2;
        
        // Company details on the left side of the white area
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Axiso Green Energies Private Limited', contentAreaStart + 5, 45);
        
        // Company details in lighter text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Telangana', contentAreaStart + 5, 50);
        doc.text('India', contentAreaStart + 5, 55);
        doc.text('GSTIN 36ABCA4478M1Z9', contentAreaStart + 5, 60);
        doc.text('admin@axisogreen.in', contentAreaStart + 5, 65);
        doc.text('www.axisogreen.in', contentAreaStart + 5, 70);
        
        // Add logo at right side of white area
        if (logoImg) {
          doc.addImage(logoImg, 'PNG', contentAreaStart + 45, 45, 40, 25);
        }
        
        // Add horizontal line
        doc.setLineWidth(0.1);
        doc.line(contentAreaStart + 5, 75, contentAreaStart + contentAreaWidth - 5, 75);

        // Payment Receipt title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        const titleText = 'PAYMENT RECEIPT';
        doc.text(titleText, contentCenter, 85, { align: 'center' });
        
        // Table layout for payment details
        const startY = 95;
        const rowHeight = 15; // Height of each row
        const colWidth = 40; // Width of each column
        
        // Background color for data cells - #97afc2 with 29% opacity
        const r = 151, g = 175, b = 194; // #97afc2 in RGB
        const blendWithWhite = (color: number, opacity: number) => {
          return Math.round(color * opacity + 255 * (1 - opacity));
        };
        
        // Calculate colors with 29% opacity
        const bgColorR = blendWithWhite(r, 0.29);
        const bgColorG = blendWithWhite(g, 0.29);
        const bgColorB = blendWithWhite(b, 0.29);
        
        // Create table headers and rows with styling
        const createTableRow = (label: string, value: string, y: number, isAmount: boolean = false) => {
          // Label column
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text(label, contentAreaStart + 5, y + 7);
          
          // Value cell with light blue background
          if (!isAmount) {
            doc.setFillColor(bgColorR, bgColorG, bgColorB);
            doc.rect(contentAreaStart + colWidth, y, colWidth, rowHeight, 'F');
          } else {
            // Green background for amount
            doc.setFillColor(140, 198, 63); // Light green
            doc.rect(contentAreaStart + colWidth, y, colWidth, rowHeight, 'F');
          }
          
          // Value text
          doc.setFont(isAmount ? 'helvetica-bold' : 'helvetica', isAmount ? 'bold' : 'normal');
          doc.setFontSize(isAmount ? 10 : 8);
          doc.setTextColor(isAmount ? 255 : 0, isAmount ? 255 : 0, isAmount ? 255 : 0);
          doc.text(value, contentAreaStart + colWidth + 5, y + 7);
        };
        
        // Generate a reference number
        const refNumber = 'ZBYKUQLSS';
        
        // Create table rows
        createTableRow('Payment Date', date, startY);
        createTableRow('Reference Number', refNumber, startY + rowHeight);
        createTableRow('Payment Mode', paymentMode, startY + rowHeight * 2);
        createTableRow('Place Of Supply', `${placeOfSupply} (36)`, startY + rowHeight * 3);
        createTableRow('Amount Received In Words', `Indian Rupee Ten Thousand Only`, startY + rowHeight * 4);
        
        // Amount with green background
        createTableRow('Amount Received', `Rs.${amount.toLocaleString()}`, startY + rowHeight * 0.5, true);
        
        // Received from section
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text('Received From', contentAreaStart + 5, startY + rowHeight * 6);
        
        // Received from value with background
        doc.setFillColor(bgColorR, bgColorG, bgColorB);
        doc.rect(contentAreaStart + 5, startY + rowHeight * 6 + 2, colWidth, rowHeight, 'F');
        doc.text(receivedFrom, contentAreaStart + 10, startY + rowHeight * 6 + 9);
        
        // Add signature at bottom right
        if (signatureImg) {
          doc.addImage(signatureImg, 'PNG', contentAreaStart + 50, startY + rowHeight * 6 + 5, 30, 15);
          
          // Add signature text
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text('Authorized Signature', contentAreaStart + 50, startY + rowHeight * 6 + 25);
        }
        
        // Save the PDF with a filename based on customer and date
        doc.save(`${receivedFrom}-receipt-${date}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    };

    generatePDF();
  }, [date, amount, receivedFrom, paymentMode, placeOfSupply]);

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