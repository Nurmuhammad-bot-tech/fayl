
const manhwaFile = document.getElementById("manhwaFile");
const imagePreview = document.getElementById("imagePreview");
const readTextButton = document.getElementById("readTextButton");
const ocrStatus = document.getElementById("ocrStatus");

const pdfFile = document.getElementById("pdfFile");
const readPdfButton = document.getElementById("readPdfButton");
const pdfReadStatus = document.getElementById("pdfReadStatus");

const ocrResult = document.getElementById("ocrResult");
const translateButton = document.getElementById("translateButton");
const translateStatus = document.getElementById("translateStatus");
const translationResult = document.getElementById("translationResult");

const copyButton = document.getElementById("copyButton");
const downloadPdfButton = document.getElementById("downloadPdfButton");
const pdfStatus = document.getElementById("pdfStatus");

// PDF.js sozlamasi
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// Rasm tanlanganda ko'rsatish
manhwaFile.addEventListener("change", () => {
  const file = manhwaFile.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    ocrStatus.textContent = "Iltimos, rasm faylini tanlang.";
    return;
  }

  imagePreview.src = URL.createObjectURL(file);
  imagePreview.alt = "Tanlangan manhwa rasmi";
  ocrStatus.textContent = "Rasm yuklandi. Matnni o'qishingiz mumkin.";
});

// Rasmdan matn olish
readTextButton.addEventListener("click", async () => {
  const file = manhwaFile.files[0];

  if (!file) {
    ocrStatus.textContent = "Avval rasm tanlang.";
    return;
  }

  if (!window.Tesseract) {
    ocrStatus.textContent = "Tesseract kutubxonasi yuklanmadi.";
    return;
  }

  try {
    readTextButton.disabled = true;
    ocrStatus.textContent = "Rasmdagi matn o'qilmoqda...";

    const result = await Tesseract.recognize(file, "eng", {
      logger: (message) => {
        if (message.status === "recognizing text") {
          ocrStatus.textContent =
            `Matn o'qilmoqda: ${Math.round(message.progress * 100)}%`;
        }
      }
    });

    ocrResult.value = result.data.text.trim();
    ocrStatus.textContent = ocrResult.value
      ? "Matn muvaffaqiyatli o'qildi!"
      : "Rasmdan matn topilmadi.";
  } catch (error) {
    console.error(error);
    ocrStatus.textContent = "Rasmni o'qishda xatolik yuz berdi.";
  } finally {
    readTextButton.disabled = false;
  }
});

// PDF fayldan matn olish
readPdfButton.addEventListener("click", async () => {
  const file = pdfFile.files[0];

  if (!file) {
    pdfReadStatus.textContent = "Avval PDF faylini tanlang.";
    return;
  }

  if (!window.pdfjsLib) {
    pdfReadStatus.textContent = "PDF.js kutubxonasi yuklanmadi.";
    return;
  }

  try {
    readPdfButton.disabled = true;
    pdfReadStatus.textContent = "PDF o'qilmoqda...";

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer)
    }).promise;

    let allText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      pdfReadStatus.textContent =
        `${pageNumber}/${pdf.numPages}-sahifa o'qilmoqda...`;

      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) => item.str || "")
        .join(" ");

      allText += `\n\n--- ${pageNumber}-sahifa ---\n${pageText}`;
    }

    const extractedText = allText.trim();

    if (!extractedText.replace(/--- \d+-sahifa ---/g, "").trim()) {
      pdfReadStatus.textContent =
        "PDF ichidan matn topilmadi. Bu skanerlangan PDF bo'lishi mumkin. Avval matnli PDF bilan sinab ko'ring.";
    } else {
      ocrResult.value = extractedText;
      pdfReadStatus.textContent =
        "PDF matni olindi! Endi tarjima qilishingiz mumkin.";
    }
  } catch (error) {
    console.error(error);
    pdfReadStatus.textContent =
      "PDFni o'qib bo'lmadi. Fayl buzilgan yoki himoyalangan bo'lishi mumkin.";
  } finally {
    readPdfButton.disabled = false;
  }
});

// Inglizchadan o'zbekchaga tarjima
translateButton.addEventListener("click", async () => {
  const text = ocrResult.value.trim();

  if (!text) {
    translateStatus.textContent = "Avval rasm yoki PDF matnini oling.";
    return;
  }

  try {
    translateButton.disabled = true;
    translateStatus.textContent = "Tarjima qilinmoqda...";
    translationResult.value = "";

    // API uchun matnni kichik qismlarga ajratish
    const chunks = text.match(/[\s\S]{1,450}/g) || [];
    const translatedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      translateStatus.textContent =
        `Tarjima qilinmoqda: ${i + 1}/${chunks.length}`;

      const url =
        "https://api.mymemory.translated.net/get?q=" +
        encodeURIComponent(chunks[i]) +
        "&langpair=en|uz";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Tarjima xizmati javob bermadi.");
      }

      const data = await response.json();

      if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
        throw new Error("Tarjima amalga oshmadi.");
      }

      translatedChunks.push(data.responseData.translatedText);
    }

    translationResult.value = translatedChunks.join(" ");
    translateStatus.textContent =
      "Tarjima tayyor! Natijani tekshirib chiqishingiz mumkin.";
  } catch (error) {
    console.error(error);
    translateStatus.textContent =
      "Tarjima amalga oshmadi. Internetni tekshiring yoki keyinroq urinib ko'ring.";
  } finally {
    translateButton.disabled = false;
  }
});

// Tarjimani nusxalash
copyButton.addEventListener("click", async () => {
  const text = translationResult.value.trim();

  if (!text) {
    pdfStatus.textContent = "Avval tarjima qiling.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    pdfStatus.textContent = "Tarjima nusxalandi!";
  } catch (error) {
    translationResult.select();
    const copied = document.execCommand("copy");
    pdfStatus.textContent = copied
      ? "Tarjima nusxalandi!"
      : "Matnni belgilab, Ctrl+C tugmalarini bosing.";
  }
});

// Tarjimani PDF qilib yuklab olish
downloadPdfButton.addEventListener("click", () => {
  const text = translationResult.value.trim();

  if (!text) {
    pdfStatus.textContent = "Avval matnni tarjima qiling.";
    return;
  }

  if (!window.jspdf) {
    pdfStatus.textContent = "PDF kutubxonasi yuklanmadi.";
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Standart PDF shriftida apostrof muammosini kamaytirish
    const safeText = text
      .replace(/[‘’ʻʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/—/g, "-");

    const lines = doc.splitTextToSize(safeText, 180);
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 20;

    let y = 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    for (const line of lines) {
      if (y + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
      }

      doc.text(line, 15, y);
      y += lineHeight;
    }

    doc.save("MangaLingo-tarjima.pdf");
    pdfStatus.textContent = "Tarjima PDF qilib yuklab olindi!";
  } catch (error) {
    console.error(error);
    pdfStatus.textContent = "PDF yaratishda xatolik yuz berdi.";
  }
});
