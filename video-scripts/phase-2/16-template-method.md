# Bài 16 – Template Method Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 2 – Mở Rộng | **Tuần:** 7 | **Thứ tự:** 16/23  
**Thời lượng ước tính:** 19 phút  
**Độ ưu tiên:** ⭐⭐ Trung Bình

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: Hai export classes giống nhau 80%]**

> "Bạn có `PdfExporter` và `ExcelExporter`. Cả hai đều:
> 1. Load data từ database
> 2. Validate data
> 3. Format data
> 4. Generate file
> 5. Send qua email
>
> Chỉ khác nhau ở bước 3 (format) và 4 (generate). Bước 1, 2, 5 là giống hệt nhau. Nhưng bạn viết chúng hai lần.
>
> **Template Method** định nghĩa skeleton của algorithm trong base class. Các bước cố định đặt trong base. Các bước thay đổi để subclasses override. Không bao giờ duplicate code nữa."

---

## PHẦN 2 – TEMPLATE METHOD LÀ GÌ? CONCEPT (2:00 – 5:00)

```
ReportExporter (Abstract Base)
├── ExportAsync()           ← Template Method: algorithm skeleton
│   ├── LoadDataAsync()     ← 1. Cố định trong base
│   ├── ValidateAsync()     ← 2. Cố định trong base (có thể override)
│   ├── FormatDataAsync()   ← 3. ABSTRACT – subclass phải implement
│   ├── GenerateFileAsync() ← 4. ABSTRACT – subclass phải implement
│   └── SendEmailAsync()    ← 5. Cố định trong base
│
├── PdfReportExporter
│   ├── FormatDataAsync()   ← PDF-specific formatting
│   └── GenerateFileAsync() ← PDF generation với iTextSharp
│
└── ExcelReportExporter
    ├── FormatDataAsync()   ← Excel-specific formatting
    └── GenerateFileAsync() ← Excel generation với ClosedXML
```

> "Template Method dùng inheritance: base class control flow, subclass customize steps.
>
> Khác Strategy: Strategy dùng composition (inject strategy), Template Method dùng inheritance (extend base class). Template Method phù hợp khi skeleton cố định và chỉ cần customize một vài bước."

---

## PHẦN 3 – CODE WALKTHROUGH (5:00 – 14:00)

### Bước 1: Abstract Base – Template Method (5:00 – 8:30)

```csharp
// ReportExporter: base class với algorithm skeleton
public abstract class ReportExporter
{
    // Template Method: final, không ai override được skeleton
    // Đây là "algorithm" cố định
    public async Task<ExportResult> ExportAsync(
        ExportRequest request, CancellationToken ct)
    {
        // Bước 1: Load data – cố định trong base
        var data = await LoadDataAsync(request, ct);
        
        // Bước 2: Validate – có thể override nếu subclass cần validate thêm
        var validationResult = await ValidateAsync(data, ct);
        if (!validationResult.IsValid)
            return ExportResult.Failed(validationResult.Errors);
        
        // Bước 3: Format – ABSTRACT, mỗi format có cách riêng
        var formattedData = await FormatDataAsync(data, request, ct);
        
        // Bước 4: Generate file – ABSTRACT, mỗi format tạo file khác nhau
        var fileBytes = await GenerateFileAsync(formattedData, request, ct);
        
        // Bước 5: Send email – cố định trong base
        if (request.SendEmail)
            await SendEmailAsync(request.RecipientEmail, fileBytes, GetFileExtension(), ct);
        
        return ExportResult.Success(fileBytes, GetFileExtension());
    }

    // Steps cố định – base class implement
    private async Task<ReportData> LoadDataAsync(ExportRequest request, CancellationToken ct)
    {
        // Load từ DB – giống nhau cho tất cả exporters
        return new ReportData(/* query... */);
    }

    // Hook: có default implementation nhưng subclass có thể override
    protected virtual Task<ValidationResult> ValidateAsync(ReportData data, CancellationToken ct)
        => Task.FromResult(data.Rows.Any() 
            ? ValidationResult.Success() 
            : ValidationResult.Failure("No data to export"));

    // Abstract: PHẢI override, vì không có common implementation
    protected abstract Task<FormattedData> FormatDataAsync(
        ReportData data, ExportRequest request, CancellationToken ct);
    
    protected abstract Task<byte[]> GenerateFileAsync(
        FormattedData data, ExportRequest request, CancellationToken ct);
    
    protected abstract string GetFileExtension();

    private async Task SendEmailAsync(string email, byte[] file, string ext, CancellationToken ct)
    {
        // Send email với attachment – giống nhau cho tất cả exporters
    }
}
```

### Bước 2: Concrete Subclasses (8:30 – 12:00)

```csharp
// PdfReportExporter: chỉ cần implement các bước khác nhau
public class PdfReportExporter(IPdfGenerator pdfGenerator) : ReportExporter
{
    protected override string GetFileExtension() => "pdf";

    protected override Task<FormattedData> FormatDataAsync(
        ReportData data, ExportRequest request, CancellationToken ct)
    {
        // PDF-specific: page breaks, headers, footers
        var formatted = new FormattedData();
        formatted.AddHeader(request.Title, DateTime.Now);
        
        foreach (var row in data.Rows)
            formatted.AddRow(row.Fields.Select(f => f.ToString()).ToArray());
        
        formatted.AddFooter($"Total: {data.Rows.Count} records");
        return Task.FromResult(formatted);
    }

    protected override async Task<byte[]> GenerateFileAsync(
        FormattedData data, ExportRequest request, CancellationToken ct)
    {
        // Dùng iTextSharp hoặc QuestPDF để tạo PDF
        return await pdfGenerator.GenerateAsync(data, ct);
    }
}

// ExcelReportExporter: implement các bước theo cách riêng của Excel
public class ExcelReportExporter : ReportExporter
{
    protected override string GetFileExtension() => "xlsx";

    protected override Task<FormattedData> FormatDataAsync(
        ReportData data, ExportRequest request, CancellationToken ct)
    {
        // Excel-specific: column widths, cell formatting, formulas
        var formatted = new FormattedData();
        formatted.SetColumnWidths(data.Columns.Select(c => c.EstimatedWidth).ToArray());
        formatted.AddFreezeRow(1); // Freeze header row
        
        foreach (var row in data.Rows)
            formatted.AddRow(row.Fields.Select(f => f.ExcelValue).ToArray());
        
        return Task.FromResult(formatted);
    }

    protected override Task<byte[]> GenerateFileAsync(
        FormattedData data, ExportRequest request, CancellationToken ct)
    {
        // Dùng ClosedXML hoặc EPPlus
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Report");
        
        for (int row = 0; row < data.Rows.Count; row++)
            for (int col = 0; col < data.Columns.Count; col++)
                ws.Cell(row + 1, col + 1).Value = data.GetCell(row, col);
        
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return Task.FromResult(stream.ToArray());
    }
}

// CsvReportExporter: override ValidateAsync vì CSV cần validate encoding
public class CsvReportExporter : ReportExporter
{
    protected override string GetFileExtension() => "csv";

    // Override hook – thêm encoding validation
    protected override async Task<ValidationResult> ValidateAsync(ReportData data, CancellationToken ct)
    {
        var baseResult = await base.ValidateAsync(data, ct); // Gọi base validation trước
        if (!baseResult.IsValid) return baseResult;
        
        // CSV-specific: check for characters that break CSV format
        var hasProblematicChars = data.Rows.Any(r => 
            r.Fields.Any(f => f.ToString()?.Contains('"') == true));
        
        return hasProblematicChars
            ? ValidationResult.Warning("Some fields contain quotes – they will be escaped")
            : ValidationResult.Success();
    }

    protected override Task<FormattedData> FormatDataAsync(
        ReportData data, ExportRequest request, CancellationToken ct)
    {
        var formatted = new FormattedData();
        formatted.AddCsvHeader(data.Columns.Select(c => c.Name).ToArray());
        foreach (var row in data.Rows)
            formatted.AddCsvRow(row.Fields.Select(f => EscapeCsv(f.ToString()!)).ToArray());
        return Task.FromResult(formatted);
    }

    protected override Task<byte[]> GenerateFileAsync(FormattedData data, ExportRequest request, CancellationToken ct)
        => Task.FromResult(Encoding.UTF8.GetBytes(data.ToCsvString()));
    
    private static string EscapeCsv(string value) 
        => value.Contains(',') || value.Contains('"') || value.Contains('\n')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
```

### Bước 3: DI và sử dụng (12:00 – 14:00)

```csharp
// Registration
builder.Services.AddScoped<PdfReportExporter>();
builder.Services.AddScoped<ExcelReportExporter>();
builder.Services.AddScoped<CsvReportExporter>();

// Factory để chọn exporter theo format
builder.Services.AddScoped<Func<string, ReportExporter>>(sp => format => format switch
{
    "pdf" => sp.GetRequiredService<PdfReportExporter>(),
    "xlsx" => sp.GetRequiredService<ExcelReportExporter>(),
    "csv" => sp.GetRequiredService<CsvReportExporter>(),
    _ => throw new ArgumentException($"Unknown format: {format}")
});

// Sử dụng
public class ReportController(Func<string, ReportExporter> exporterFactory) : ControllerBase
{
    [HttpPost("export")]
    public async Task<IActionResult> Export([FromBody] ExportRequest request, CancellationToken ct)
    {
        var exporter = exporterFactory(request.Format.ToLower());
        var result = await exporter.ExportAsync(request, ct);
        
        if (!result.Success) return BadRequest(result.Errors);
        
        return File(result.FileBytes, 
            GetContentType(result.Extension), 
            $"report.{result.Extension}");
    }
}
```

---

## PHẦN 4 – VÍ DỤ .NET (14:00 – 16:30)

> "Template Method xuất hiện nhiều trong ASP.NET Core:
>
> **`BackgroundService`** – bạn override `ExecuteAsync()` để implement background job. Base class quản lý lifecycle, cancellation, errors.
>
> **`ControllerBase`** và **`Controller`** – `OnActionExecuting()`, `OnActionExecuted()` là hooks trong Template Method của action invocation pipeline.
>
> **`DbContext`** trong EF Core – override `OnModelCreating()` là Template Method hook. EF gọi method này khi building model.
>
> **`MiddlewareBase`** – middleware template với `InvokeAsync()` là abstract method."

```csharp
// BackgroundService = Template Method
public class DataSyncService(ILogger<DataSyncService> logger) : BackgroundService
{
    // Chỉ cần implement ExecuteAsync – lifecycle managed bởi BackgroundService
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation("Syncing data...");
            await SyncDataAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
    
    private async Task SyncDataAsync(CancellationToken ct) { /* ... */ }
}
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (16:30 – 18:00)

**✅ NÊN dùng khi:**
- Algorithm có skeleton cố định nhưng các bước cụ thể thay đổi theo subclass
- Muốn tránh code duplication giữa nhiều variants
- Cần hook points để subclass mở rộng mà không thay đổi flow

**❌ KHÔNG nên dùng khi:**
- Quá nhiều abstract steps → subclass phải implement quá nhiều (dùng Strategy thay thế)
- Liskov Substitution Principle bị vi phạm – subclass thay đổi algorithm không đúng nghĩa
- Chỉ có một variant – base class đủ rồi, không cần inheritance

---

## PHẦN 6 – TÓM TẮT PHASE 2 & PREVIEW PHASE 3 (18:00 – 19:00)

> "Template Method: base class define algorithm skeleton. Subclass customize steps.
>
> Ba điều nhớ:
> 1. Template Method là `final` hoặc không override – chỉ abstract steps và hooks được override
> 2. Hooks: virtual methods với default implementation – subclass có thể nhưng không bắt buộc override
> 3. `BackgroundService`, `DbContext.OnModelCreating()` – Template Method đã sẵn trong .NET
>
> **Chúc mừng Phase 2 hoàn thành!** Bạn đã học 16/23 patterns.
>
> Phase 3 (Tuần 8-10) bắt đầu với **Prototype** – clone objects mà không cần biết class cụ thể của chúng. Hữu ích khi khởi tạo object tốn kém và bạn cần nhiều bản sao tương tự."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Chạy cùng ExportRequest với format PDF và Excel – khác kết quả |
| Visual | Sơ đồ skeleton algorithm với bước abstract vs cố định |
| Điểm nhấn | BackgroundService – Template Method có sẵn trong .NET |
