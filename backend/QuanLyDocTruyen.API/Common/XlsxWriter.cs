using System.Globalization;
using System.IO.Compression;
using System.Security;
using System.Text;

namespace QuanLyDocTruyen.API.Common;

/// <summary>
/// PB54: tạo file Excel (.xlsx) theo chuẩn Office Open XML mà không cần thư viện ngoài.
/// File .xlsx thực chất là tệp zip chứa các tệp XML mô tả workbook, sheet và định dạng.
/// </summary>
public class XlsxWriter
{
    private readonly List<(string Name, string Xml)> _sheets = [];

    // Chỉ số định dạng trong styles.xml
    private const int StyleTitle = 1, StyleHeader = 2, StyleNumber = 3, StyleDecimal = 4;

    public XlsxWriter AddSheet(string name, string? title, IReadOnlyList<string> headers, IEnumerable<object?[]> rows, IReadOnlyList<double>? widths = null)
    {
        var sb = new StringBuilder();
        sb.Append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">""");

        // Cố định dòng tiêu đề cột khi cuộn
        var headerRow = title is null ? 1 : 3;
        sb.Append($"""<sheetViews><sheetView workbookViewId="0"><pane ySplit="{headerRow}" topLeftCell="A{headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>""");

        sb.Append("<cols>");
        for (var i = 0; i < headers.Count; i++)
        {
            var w = widths is not null && i < widths.Count ? widths[i] : Math.Max(12, headers[i].Length + 4);
            sb.Append($"""<col min="{i + 1}" max="{i + 1}" width="{w.ToString(CultureInfo.InvariantCulture)}" customWidth="1"/>""");
        }
        sb.Append("</cols><sheetData>");

        var r = 1;
        if (title is not null)
        {
            sb.Append($"""<row r="{r}">""");
            AppendCell(sb, 0, r, title, StyleTitle);
            sb.Append("</row>");
            r += 2;
        }

        sb.Append($"""<row r="{r}">""");
        for (var i = 0; i < headers.Count; i++) AppendCell(sb, i, r, headers[i], StyleHeader);
        sb.Append("</row>");

        foreach (var row in rows)
        {
            r++;
            sb.Append($"""<row r="{r}">""");
            for (var i = 0; i < row.Length; i++) AppendCell(sb, i, r, row[i], null);
            sb.Append("</row>");
        }

        sb.Append("</sheetData>");
        if (title is not null && headers.Count > 1)
            sb.Append($"""<mergeCells count="1"><mergeCell ref="A1:{Column(headers.Count - 1)}1"/></mergeCells>""");
        sb.Append("</worksheet>");

        _sheets.Add((SafeName(name), sb.ToString()));
        return this;
    }

    public byte[] ToBytes()
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            Write(zip, "[Content_Types].xml", ContentTypes());
            Write(zip, "_rels/.rels",
                """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>""");
            Write(zip, "xl/workbook.xml", Workbook());
            Write(zip, "xl/_rels/workbook.xml.rels", WorkbookRels());
            Write(zip, "xl/styles.xml", Styles);
            for (var i = 0; i < _sheets.Count; i++)
                Write(zip, $"xl/worksheets/sheet{i + 1}.xml", _sheets[i].Xml);
        }
        return ms.ToArray();
    }

    private static void AppendCell(StringBuilder sb, int col, int row, object? value, int? style)
    {
        var reference = $"{Column(col)}{row}";
        switch (value)
        {
            case null:
                return;
            case int or long or short:
                sb.Append($"""<c r="{reference}" s="{style ?? StyleNumber}"><v>{Convert.ToString(value, CultureInfo.InvariantCulture)}</v></c>""");
                return;
            case decimal d:
                sb.Append($"""<c r="{reference}" s="{style ?? (d == Math.Truncate(d) ? StyleNumber : StyleDecimal)}"><v>{d.ToString(CultureInfo.InvariantCulture)}</v></c>""");
                return;
            case double or float:
                sb.Append($"""<c r="{reference}" s="{style ?? StyleDecimal}"><v>{Convert.ToDouble(value).ToString("0.##", CultureInfo.InvariantCulture)}</v></c>""");
                return;
            case DateOnly date:
                value = date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
                break;
            case DateTime dt:
                value = dt.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
                break;
        }
        var text = SecurityElement.Escape(Convert.ToString(value, CultureInfo.InvariantCulture)) ?? "";
        var s = style is int st ? $" s=\"{st}\"" : "";
        sb.Append($"""<c r="{reference}" t="inlineStr"{s}><is><t xml:space="preserve">{text}</t></is></c>""");
    }

    private static string Column(int index)
    {
        var name = "";
        for (var n = index + 1; n > 0; n = (n - 1) / 26)
            name = (char)('A' + (n - 1) % 26) + name;
        return name;
    }

    private static string SafeName(string name)
    {
        foreach (var ch in "[]:*?/\\") name = name.Replace(ch, ' ');
        return name.Length > 31 ? name[..31] : name;
    }

    private string ContentTypes()
    {
        var sb = new StringBuilder("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>""");
        for (var i = 1; i <= _sheets.Count; i++)
            sb.Append($"""<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>""");
        return sb.Append("</Types>").ToString();
    }

    private string Workbook()
    {
        var sb = new StringBuilder("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>""");
        for (var i = 0; i < _sheets.Count; i++)
            sb.Append($"""<sheet name="{SecurityElement.Escape(_sheets[i].Name)}" sheetId="{i + 1}" r:id="rId{i + 1}"/>""");
        return sb.Append("</sheets></workbook>").ToString();
    }

    private string WorkbookRels()
    {
        var sb = new StringBuilder("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">""");
        for (var i = 0; i < _sheets.Count; i++)
            sb.Append($"""<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>""");
        sb.Append($"""<Relationship Id="rId{_sheets.Count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>""");
        return sb.Append("</Relationships>").ToString();
    }

    private static void Write(ZipArchive zip, string path, string content)
    {
        using var writer = new StreamWriter(zip.CreateEntry(path, CompressionLevel.Optimal).Open(), new UTF8Encoding(false));
        writer.Write(content);
    }

    // 0: mặc định, 1: tiêu đề lớn, 2: tiêu đề cột (đậm, nền xám), 3: số nguyên có dấu phân cách, 4: số thập phân
    private const string Styles = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>""";
}
