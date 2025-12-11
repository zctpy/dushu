import JSZip from 'jszip';

// Helper to clean HTML text
const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

// EPUB Parser
export const extractTextFromEpub = async (file: File): Promise<string> => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Find META-INF/container.xml to locate the .opf file
    const container = await zip.file("META-INF/container.xml")?.async("string");
    if (!container) throw new Error("Invalid EPUB: Missing container.xml");
    
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(container, "application/xml");
    const rootfile = containerDoc.querySelector("rootfile");
    const opfPath = rootfile?.getAttribute("full-path");
    
    if (!opfPath) throw new Error("Invalid EPUB: Cannot find OPF path");

    // 2. Read the OPF file (content manifest and spine)
    const opfContent = await zip.file(opfPath)?.async("string");
    if (!opfContent) throw new Error("Invalid EPUB: Missing OPF file");
    
    const opfDoc = parser.parseFromString(opfContent, "application/xml");
    const manifest = opfDoc.getElementsByTagName("manifest")[0];
    const spine = opfDoc.getElementsByTagName("spine")[0];
    
    // 3. Resolve base path for relative file lookups
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

    // 4. Iterate over spine items to get reading order
    const itemrefs = Array.from(spine.getElementsByTagName("itemref"));
    let fullText = "";

    for (const itemref of itemrefs) {
      const idref = itemref.getAttribute("idref");
      if (!idref) continue;
      
      // Find the corresponding item in manifest
      const item = Array.from(manifest.getElementsByTagName("item")).find(
        (i) => i.getAttribute("id") === idref
      );
      
      const href = item?.getAttribute("href");
      if (href) {
        // Construct full path inside zip
        // Handle potential URL decoding if paths contain %20 etc.
        const fileKey = decodeURIComponent(opfDir + href);
        const fileContent = await zip.file(fileKey)?.async("string");
        
        if (fileContent) {
           // Parse HTML/XHTML and extract text
           // Add double newline for paragraph separation
           fullText += stripHtml(fileContent) + "\n\n";
        }
      }
    }

    if (!fullText.trim()) throw new Error("EPUB content appears empty");
    return fullText;

  } catch (e: any) {
    console.error("EPUB parsing failed:", e);
    throw new Error("EPUB 解析失败: " + e.message);
  }
};

// MOBI (PDB/PalmDOC) Text Extractor
// Since reliable binary parsing of MOBI in browser is heavy/complex without wasm/heavy libs,
// we use a "Strings" extraction method. This extracts visible text from the binary.
// It is "Lossy" (loses bold/italic) but "Safe" (works on almost all files).
export const extractTextFromMobi = async (file: File): Promise<string> => {
    try {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = decoder.decode(buffer);

        // Regex to find substantial text blocks and filter out binary garbage.
        // This looks for sequences of readable characters (Chinese, English, punctuation)
        // Min length 10 to avoid random short noise.
        // \u4e00-\u9fa5 covers common CJK.
        const regex = /[\w\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef,.?!:;"'()<>\[\]\n\r-]{10,}/g;
        
        const matches = rawText.match(regex);
        
        if (!matches || matches.length === 0) {
            // Fallback: try simpler ASCII extraction if UTF-8 failed
             const asciiText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, '');
             if (asciiText.length > 100) return asciiText;
             throw new Error("Cannot extract text from this MOBI file.");
        }

        // Join matches and try to clean up HTML tags if any (MOBI often wraps text in simple HTML)
        let extracted = matches.join('\n');
        
        // Remove common binary artifacts or html tags that survived
        extracted = extracted.replace(/<[^>]*>/g, ''); 
        
        return "【注意：MOBI 格式使用纯文本提取模式，可能会丢失部分排版格式。建议使用 EPUB 格式获得最佳体验。】\n\n" + extracted;

    } catch (e: any) {
        console.error("MOBI parsing failed", e);
        throw new Error("MOBI 解析失败，请尝试转换为 EPUB 格式上传。");
    }
};