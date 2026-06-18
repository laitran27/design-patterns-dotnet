# Bài 03 – Builder Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 1 | **Thứ tự:** 3/23  
**Thời lượng ước tính:** 23 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Constructor với 10 tham số]**

> "Bạn có bao giờ nhìn vào một constructor như thế này không?"

```csharp
var report = new Report(
    "Q4 2024",        // title
    DateTime.Now,     // startDate
    DateTime.Now.AddMonths(3), // endDate
    true,             // includeCharts
    false,            // includeSummary
    null,             // footer (optional)
    "PDF",            // format
    "landscape",      // orientation
    100,              // maxRows
    true              // compress
);
```

> "Mười tham số. Và bạn thử đoán xem – tham số thứ tư `true` nghĩa là gì? `includeCharts` hay `includeSummary`?
>
> Đây gọi là *telescoping constructor anti-pattern*. Code này cực kỳ khó đọc, dễ nhầm thứ tự, và khi cần thêm tham số thứ mười một... bạn phải sửa tất cả chỗ gọi constructor.
>
> **Builder Pattern** là giải pháp. Và bạn đã dùng nó mỗi ngày mà không nhận ra: `WebApplicationBuilder`, `StringBuilder`, `EF Core ModelBuilder`."

---

## PHẦN 2 – BUILDER LÀ GÌ? CONCEPT (2:30 – 6:30)

**[Màn hình: Sơ đồ đơn giản hóa]**

> "Builder tách *quá trình xây dựng* ra khỏi *sản phẩm cuối cùng*.
>
> Thay vì một constructor khổng lồ, bạn có một chuỗi các method nhỏ – mỗi method cấu hình một phần. Cuối cùng gọi `Build()` để nhận sản phẩm hoàn chỉnh.
>
> Hai lý do chính để dùng Builder:
>
> **Một – Readability:** `QueryBuilder.From(\"orders\").Where(\"status = active\").OrderBy(\"created_at\").Take(10).Build()` – đọc như câu tiếng Anh.
>
> **Hai – Conditional building:** Builder có thể có method `WhereIf(condition, clause)` – logic điều kiện nằm trong builder, không làm bẩn client code bằng `if/else`."

---

## PHẦN 3 – CODE WALKTHROUGH (6:30 – 17:00)

### Bước 1: QueryBuilder – xây dựng SQL an toàn (6:30 – 11:00)

**[Màn hình: QueryBuilder class từng phần]**

```csharp
public class QueryBuilder
{
    private string _table = string.Empty;
    private readonly List<string> _conditions = [];
    private readonly List<string> _columns = ["*"];  // Mặc định SELECT *
    private readonly List<(string Column, bool Descending)> _orderBy = [];
    private readonly Dictionary<string, object> _parameters = [];
    private int? _skip;
    private int? _take;

    // Static factory method: QueryBuilder.From("orders") đọc tự nhiên hơn new QueryBuilder()
    public static QueryBuilder From(string table) => new QueryBuilder { _table = table };
```

> "Builder tích lũy state qua các method calls. Tất cả fields đều private – client không thể tạo SQL không hợp lệ."

```csharp
    // Mỗi method PHẢI trả về 'this' → chìa khóa của fluent interface
    public QueryBuilder Select(params string[] columns)
    {
        _columns.Clear();
        _columns.AddRange(columns);
        return this;  // ← return this cho phép chain: .Select().Where().OrderBy()
    }

    public QueryBuilder Where(string condition, object? value = null, string? paramName = null)
    {
        _conditions.Add(condition);
        if (value != null && paramName != null)
            _parameters[paramName] = value;  // Tự động parameterize → tránh SQL injection
        return this;
    }

    // WhereIf – conditional building: ĐIỂM MẠNH của Builder
    // Logic điều kiện nằm trong Builder, không làm bẩn client code
    public QueryBuilder WhereIf(bool condition, string clause, object? value = null, string? param = null)
        => condition ? Where(clause, value, param) : this;  // Nếu false: bỏ qua, trả về this
```

> "Nhìn `WhereIf`. Không có Builder, client code phải viết:"

```csharp
// ❌ Không có Builder
if (request.Status != null)
    conditions.Add($"status = '{request.Status}'");
if (request.MinAmount.HasValue)
    conditions.Add($"amount >= {request.MinAmount}");
// ... 5-6 if nữa làm rác client code

// ✅ Có Builder
var (sql, parameters) = QueryBuilder
    .From("orders")
    .WhereIf(request.Status != null, "status = @status", request.Status, "status")
    .WhereIf(request.MinAmount.HasValue, "amount >= @minAmount", request.MinAmount, "minAmount")
    .OrderBy("created_at", descending: true)
    .Take(request.PageSize)
    .Skip(request.Page * request.PageSize)
    .Build();
```

### Bước 2: Build() – tạo sản phẩm cuối (11:00 – 14:00)

```csharp
    public (string Sql, Dictionary<string, object> Parameters) Build()
    {
        // Validate trước khi build – fail-fast
        if (string.IsNullOrEmpty(_table))
            throw new InvalidOperationException("Table name is required");

        var sb = new StringBuilder("SELECT ");
        sb.Append(string.Join(", ", _columns));
        sb.Append($" FROM {_table}");

        if (_conditions.Count > 0)
            sb.Append($" WHERE {string.Join(" AND ", _conditions)}");

        if (_orderBy.Count > 0)
        {
            var orderClauses = _orderBy.Select(o =>
                o.Descending ? $"{o.Column} DESC" : o.Column);
            sb.Append($" ORDER BY {string.Join(", ", orderClauses)}");
        }

        if (_skip.HasValue || _take.HasValue)
        {
            sb.Append($" OFFSET {_skip ?? 0} ROWS");
            if (_take.HasValue)
                sb.Append($" FETCH NEXT {_take} ROWS ONLY");
        }

        return (sb.ToString(), _parameters);
    }
```

> "`Build()` chỉ được gọi một lần sau khi chain tất cả bước cấu hình. Đây là pattern quan trọng: Builder tích lũy state → `Build()` tạo sản phẩm bất biến."

### Bước 3: Builder trong .NET – WebApplicationBuilder (14:00 – 17:00)

**[Màn hình: Program.cs quen thuộc]**

> "Hãy nhìn lại đoạn code bạn viết mỗi ngày:"

```csharp
// WebApplicationBuilder – Builder pattern được Microsoft thiết kế cho bạn
var builder = WebApplication.CreateBuilder(args);

// Mỗi dòng dưới đây là một bước "building"
builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { /* ... */ });

// Build() tạo ra WebApplication – sản phẩm hoàn chỉnh
var app = builder.Build();

// Sau Build(), không thể thêm services nữa
// Đây là Immutability của Builder: sau Build() → product bất biến
```

> "`var builder = WebApplication.CreateBuilder(args)` – đây là Builder. Bạn gọi `builder.Services.Add...()` – đây là các bước xây dựng. `builder.Build()` – đây là Build().
>
> Tương tự: `var host = Host.CreateDefaultBuilder(args).ConfigureServices(...).Build()`
>
> Và `StringBuilder` – cái tên đã nói lên tất cả."

---

## PHẦN 4 – VÍ DỤ THỰC TẾ: Email Builder (17:00 – 20:00)

```csharp
// Real-world: Email builder với nhiều optional fields
public class EmailBuilder
{
    private string _to = string.Empty;
    private string _subject = string.Empty;
    private string _body = string.Empty;
    private readonly List<string> _cc = [];
    private readonly List<string> _attachments = [];
    private bool _isHtml;
    private string _replyTo = string.Empty;

    public EmailBuilder To(string email) { _to = email; return this; }
    public EmailBuilder Subject(string subject) { _subject = subject; return this; }
    public EmailBuilder Body(string body, bool isHtml = false) 
    { 
        _body = body; _isHtml = isHtml; return this; 
    }
    public EmailBuilder Cc(string email) { _cc.Add(email); return this; }
    public EmailBuilder Attachment(string path) { _attachments.Add(path); return this; }
    public EmailBuilder ReplyTo(string email) { _replyTo = email; return this; }

    public EmailMessage Build()
    {
        if (string.IsNullOrEmpty(_to)) throw new InvalidOperationException("To is required");
        if (string.IsNullOrEmpty(_subject)) throw new InvalidOperationException("Subject is required");
        return new EmailMessage(_to, _subject, _body, _isHtml, [.._cc], [.._attachments], _replyTo);
    }
}

// Sử dụng – đọc như câu tiếng Anh
var email = new EmailBuilder()
    .To("customer@example.com")
    .Subject("Your order has been confirmed")
    .Body("<h1>Thank you!</h1><p>Order #1234 is confirmed.</p>", isHtml: true)
    .Cc("support@company.com")
    .Attachment("/invoices/1234.pdf")
    .Build();
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (20:00 – 22:00)

**✅ NÊN dùng khi:**
- Constructor có từ 4-5 tham số trở lên
- Cần tạo nhiều biến thể của cùng một object (email với/không attachment, query có/không WHERE)
- Muốn immutable objects nhưng cần flexible construction
- Client code phải build object qua nhiều bước logic phức tạp

**❌ KHÔNG nên dùng khi:**
- Object đơn giản, chỉ 2-3 fields
- Không cần nhiều biến thể – dùng constructor hoặc object initializer đủ rồi
- Performance quan trọng và builder overhead không chấp nhận được

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (22:00 – 23:00)

> "Builder Pattern giải quyết telescoping constructor với fluent API.
>
> Ba điều nhớ:
> 1. Mỗi method trả về `this` → fluent chain
> 2. `Build()` chỉ gọi một lần cuối, validate và tạo immutable product
> 3. `WhereIf()` là ví dụ hay nhất của conditional building – loại bỏ if/else khỏi client code
>
> Bài tiếp theo chúng ta chuyển sang Structural Patterns với **Adapter** – cái cầu nối giữa hai interfaces không tương thích. Ví dụ thực tế: khi bạn cần dùng một third-party library nhưng nó có API hoàn toàn khác với interface bạn đang dùng."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Chạy QueryBuilder thực tế với Dapper trong console app |
| So sánh | Side-by-side: 10-param constructor vs Builder fluent chain |
| Điểm nhấn | `WhereIf` – conditional building eliminates if/else clutter |
| Thumbnail | Xây nhà từng bước: foundation → walls → roof |
