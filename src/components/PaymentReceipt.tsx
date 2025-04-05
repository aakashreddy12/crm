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

        // Set page margins
        const margin = 20;
        const pageWidth = doc.internal.pageSize.width;
        
        // Add logo (positioned exactly as in the image)
        if (logoImg) {
          doc.addImage(logoImg, 'PNG', margin, margin, 45, 45);
        }
        
        // Company details (right aligned with logo)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Axiso Green Energies Private Limited', 70, 25);
        
        // Company details in lighter text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text('Telangana', 70, 35);
        doc.text('India', 70, 40);
        doc.text('GSTIN 36ABCA4478M1Z9', 70, 45);
        doc.text('admin@axisogreen.in', 70, 50);
        doc.text('www.axisogreen.in', 70, 55);
        
        // Add horizontal line
        doc.setLineWidth(0.1);
        doc.line(margin, 70, pageWidth - margin, 70);

        // Payment Receipt title with underline
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        const titleText = 'PAYMENT RECEIPT';
        const titleX = pageWidth / 2;
        const titleY = 85;
        doc.text(titleText, titleX, titleY, { align: 'center' });
        
        // Add underline for the title
        const titleWidth = doc.getTextWidth(titleText);
        doc.setLineWidth(0.5);
        doc.line(titleX - titleWidth/2, titleY + 1, titleX + titleWidth/2, titleY + 1);
        
        // Table layout for payment details
        const startY = 100;
        const lineHeight = 8; // Reduced line height
        const labelColX = margin;
        const valueColX = 75; // Reduced gap between label and value
        
        // Payment details - left column labels
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        
        // Left column labels
        doc.text('Payment Date', labelColX, startY);
        doc.text('Reference Number', labelColX, startY + lineHeight * 2);
        doc.text('Payment Mode', labelColX, startY + lineHeight * 4);
        doc.text('Place Of Supply', labelColX, startY + lineHeight * 6);
        doc.text('Amount Received In', labelColX, startY + lineHeight * 8);
        doc.text('Words', labelColX, startY + lineHeight * 9);
        
        // Space between received from and other fields
        doc.text('Received From', labelColX, startY + lineHeight * 14);
        
        // Values column
        doc.text(date, valueColX, startY);
        doc.text(Math.random().toString(36).substr(2, 9).toUpperCase(), valueColX, startY + lineHeight * 2);
        doc.text('Bank Transfer', valueColX, startY + lineHeight * 4);
        doc.text(`${placeOfSupply} (36)`, valueColX, startY + lineHeight * 6);
        
        // Amount in words
        const amountInWords = `Indian Rupee ${convertNumberToWords(amount)} Only`;
        doc.text(amountInWords, valueColX, startY + lineHeight * 8);
        
        // Received from - value
        doc.text(receivedFrom, valueColX, startY + lineHeight * 14);
        
        // Green colored amount box on right
        const amountBoxX = 130;
        const amountBoxY = startY - 5;
        const amountBoxWidth = 60;
        const amountBoxHeight = 40;
        
        // Draw amount box with green background
        doc.setFillColor(128, 187, 95); // Green color for background
        doc.rect(amountBoxX, amountBoxY, amountBoxWidth, amountBoxHeight, 'F');
        
        // Amount text in white
        doc.setTextColor(255, 255, 255); // White text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12); // Increased from 10
        doc.text('Amount Received', amountBoxX + 5, amountBoxY + 10);
        
        // Format amount with commas and display in larger font
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18); // Increased from 14
        doc.text(`Rs.${amount.toLocaleString()}.00`, amountBoxX + 5, amountBoxY + 25);
        
        // Reset text color to black for rest of document
        doc.setTextColor(0);
        
        // Add signature at bottom right
        if (signatureImg) {
          doc.addImage(signatureImg, 'PNG', 140, 220, 40, 20);
          
          // Add signature line and text
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text('Authorized Signature', 140, 245);
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