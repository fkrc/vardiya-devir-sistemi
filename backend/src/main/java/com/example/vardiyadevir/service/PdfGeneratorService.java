package com.example.vardiyadevir.service;

import com.example.vardiyadevir.config.FormSchemaProvider;
import com.example.vardiyadevir.entity.FormAttachment;
import com.example.vardiyadevir.entity.ShiftForm;
import com.example.vardiyadevir.repository.FormAttachmentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.openpdf.text.*;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

// Onaylanmış (COMPLETED) vardiya formlarını arşivlik bir PDF'e dönüştürür:
// form meta bilgileri, şema alan/etiket eşleşmesiyle doldurulan yanıtlar ve
// (varsa) ek görseller sayfaya gömülü olarak eklenir.
@Service
@RequiredArgsConstructor
public class PdfGeneratorService {

    private final FormSchemaProvider schemaProvider;
    private final FormAttachmentRepository formAttachmentRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm", Locale.of("tr", "TR"));
    private static final Color BRAND_BLUE = new Color(0x19, 0x76, 0xd2);
    private static final Color DARK_SLATE = new Color(0x2c, 0x3e, 0x50);
    private static final Color LIGHT_BORDER = new Color(0xec, 0xf0, 0xf1);

    public byte[] generate(ShiftForm form) throws Exception {
        Document document = new Document(PageSize.A4, 40, 40, 50, 50);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);
        document.open();

        Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD, BRAND_BLUE);
        Font metaLabelFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.GRAY);
        Font metaValueFont = new Font(Font.HELVETICA, 11, Font.NORMAL, Color.BLACK);
        Font sectionFont = new Font(Font.HELVETICA, 13, Font.BOLD, DARK_SLATE);
        Font fieldLabelFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.GRAY);
        Font fieldValueFont = new Font(Font.HELVETICA, 11, Font.NORMAL, Color.BLACK);

        document.add(new Paragraph(form.getFormDefinition().getTitle(), titleFont));
        document.add(new Paragraph(" "));

        PdfPTable metaTable = new PdfPTable(2);
        metaTable.setWidthPercentage(100);
        metaTable.setWidths(new float[]{1f, 2f});
        addMetaRow(metaTable, "Form No", "#" + form.getId(), metaLabelFont, metaValueFont);
        addMetaRow(metaTable, "Birim", form.getUnit() != null ? form.getUnit().getName() : "-", metaLabelFont, metaValueFont);
        addMetaRow(metaTable, "Oluşturan", form.getTransferorUser() != null ? form.getTransferorUser().getFullName() : "-", metaLabelFont, metaValueFont);
        addMetaRow(metaTable, "Tarih", form.getRecordDate() != null ? form.getRecordDate().format(DATE_FMT) : "-", metaLabelFont, metaValueFont);
        addMetaRow(metaTable, "Durum", "Onaylandı", metaLabelFont, metaValueFont);
        document.add(metaTable);
        document.add(new Paragraph(" "));

        JsonNode formDataNode = objectMapper.readTree(form.getFormData());
        String schemaJson = schemaProvider.getSchemaForForm(form.getFormDefinition().getMenuKey());
        JsonNode schemaNode = objectMapper.readTree(schemaJson);
        JsonNode sections = schemaNode.get("sections");

        if (sections != null && sections.isArray()) {
            for (JsonNode section : sections) {
                document.add(new Paragraph(section.get("title").asText(), sectionFont));
                document.add(new Paragraph(" "));

                PdfPTable fieldsTable = new PdfPTable(1);
                fieldsTable.setWidthPercentage(100);

                for (JsonNode field : section.get("fields")) {
                    String key = field.get("key").asText();
                    String label = field.has("label") ? field.get("label").asText() : key;
                    JsonNode valueNode = formDataNode.get(key);
                    String value = (valueNode == null || valueNode.isNull() || valueNode.asText().isBlank())
                            ? "Boş bırakılmış" : valueNode.asText();

                    PdfPCell cell = new PdfPCell();
                    cell.setBorderColor(LIGHT_BORDER);
                    cell.setPadding(8);
                    Paragraph p = new Paragraph();
                    p.add(new Chunk(label + "\n", fieldLabelFont));
                    p.add(new Chunk(value, fieldValueFont));
                    cell.addElement(p);
                    fieldsTable.addCell(cell);
                }
                document.add(fieldsTable);
                document.add(new Paragraph(" "));
            }
        }

        // Ekler: görseller sayfaya gömülür, diğer dosya türleri isim olarak listelenir
        // (indirilebilirlikleri uygulama içindeki form detay ekranından sağlanır).
        List<FormAttachment> attachments = formAttachmentRepository.findByShiftForm_IdOrderByUploadedAtAsc(form.getId());
        if (!attachments.isEmpty()) {
            document.newPage();
            document.add(new Paragraph("Ekler", sectionFont));
            document.add(new Paragraph(" "));

            for (FormAttachment att : attachments) {
                boolean isImage = att.getContentType() != null && att.getContentType().startsWith("image/");
                if (isImage) {
                    try {
                        Image img = Image.getInstance(att.getFileData());
                        float maxWidth = document.getPageSize().getWidth() - document.leftMargin() - document.rightMargin();
                        img.scaleToFit(maxWidth, 320f);
                        document.add(new Paragraph(att.getFileName(), fieldLabelFont));
                        document.add(img);
                        document.add(new Paragraph(" "));
                    } catch (Exception e) {
                        document.add(new Paragraph("• " + att.getFileName() + " (önizlenemedi)", fieldValueFont));
                    }
                } else {
                    document.add(new Paragraph("• " + att.getFileName(), fieldValueFont));
                }
            }
        }

        document.close();
        return out.toByteArray();
    }

    private void addMetaRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPaddingBottom(4);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPaddingBottom(4);
        table.addCell(valueCell);
    }
}
