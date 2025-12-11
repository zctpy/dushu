import * as pdfjsLib from 'pdfjs-dist';

// Handle ESM/CJS interoperability issues with esm.sh
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Configure the worker.
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Add CMap configuration to fix character encoding issues (wrong characters/tofu)
    // and correctly handle CJK fonts.
    const loadingTask = pdfjs.getDocument({ 
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
      stopAtErrors: false, 
    });

    // Handle password protected files explicitly
    loadingTask.onPassword = (updatePassword: (password: string) => void, reason: string) => {
      throw new Error("PasswordException: PDF Encrypted");
    };

    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const totalPages = pdf.numPages;

    // Limit pages for performance
    const pagesToRead = Math.min(totalPages, 50);
    
    for (let i = 1; i <= pagesToRead; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];
      
      let pageText = '';
      let lastY = -9999;
      
      // Loop through items (pdf.js usually returns them in reading order)
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const str = item.str;
        
        // Skip empty items that are often just formatting artifacts
        if (!str || str.trim().length === 0) {
            continue;
        }

        // Transform [scaleX, skewY, skewX, scaleY, transX, transY]
        // transY is vertical position from bottom (0,0 is bottom-left).
        const currentY = item.transform ? item.transform[5] : 0;
        
        // Detect layout changes based on Y position
        if (lastY !== -9999) {
           const yDiff = lastY - currentY; // Positive means we moved down (next line)
           
           if (yDiff > 8) {
             // Significant vertical drop detected -> New Line
             // If gap is large (> 20 units), assume paragraph break
             if (yDiff > 24) {
               pageText += '\n\n';
             } else {
               pageText += '\n';
             }
           } else if (yDiff < -8) {
             // Moved UP significant amount (e.g. column break or superscript). 
             // Treat as a space for safety.
             pageText += ' '; 
           } else {
             // Same line (or very close). Handle inline spacing.
             if (pageText.length > 0) {
                const lastChar = pageText[pageText.length - 1];
                const currChar = str[0];
                const isCJK = (c: string) => /[\u3000-\u303f\u4e00-\u9fa5\uff00-\uffef]/.test(c);
                
                // Smart Spacing:
                // Add space ONLY if boundaries are not CJK and not already separated by space/newline
                // This prevents "Hello" + "World" -> "HelloWorld" while keeping "中" + "文" -> "中文"
                if (!isCJK(lastChar) && !isCJK(currChar) && lastChar !== ' ' && lastChar !== '\n') {
                  pageText += ' ';
                }
             }
           }
        }

        pageText += str;
        lastY = currentY;
      }
      
      fullText += `\n\n--- 第 ${i} 页 ---\n\n` + pageText;
    }

    if (totalPages > 50) {
      fullText += `\n\n[注：为保证演示性能，仅提取了前 50 页的内容...]`;
    }
    
    return fullText;
  } catch (error: any) {
    console.error("Error extracting PDF text:", error);
    
    const errorMsg = (error.message || error.name || "").toLowerCase();
    
    if (errorMsg.includes('password') || error.name === 'PasswordException') {
       throw new Error("该 PDF 文件已加密，无法直接读取。请先移除密码保护。");
    }
    
    if (error.name === 'InvalidPDFException') {
       throw new Error("PDF 文件格式无效或已损坏。");
    }

    throw new Error("PDF 解析失败: " + (error.message || "请检查文件是否完整"));
  }
};