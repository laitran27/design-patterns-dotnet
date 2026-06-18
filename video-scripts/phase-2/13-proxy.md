# Bài 13 – Proxy Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 2 – Mở Rộng | **Tuần:** 5 | **Thứ tự:** 13/23  
**Thời lượng ước tính:** 21 phút  
**Độ ưu tiên:** ⭐⭐ Trung Bình

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Load ảnh nặng và câu hỏi tại sao không lazy load]**

> "Ba loại Proxy bạn sẽ gặp trong .NET hàng ngày:
>
> **Virtual Proxy:** EF Core lazy loading – `order.Customer` chỉ được load từ DB khi bạn thực sự truy cập property, không phải khi load order.
>
> **Protection Proxy:** API gateway kiểm tra authentication/authorization trước khi cho phép truy cập service.
>
> **Remote Proxy:** gRPC client – bạn gọi method như local object nhưng thực ra gọi qua network đến remote server.
>
> Tất cả đều có điểm chung: một object đứng trước object thực, kiểm soát và có thể thay đổi cách truy cập."

---

## PHẦN 2 – PROXY VS DECORATOR (2:30 – 5:00)

> "Proxy và Decorator đều implement cùng interface như object gốc. Nhưng mục đích khác nhau:
>
> **Decorator:** *thêm behavior* – caching decorator thêm cache cho một repository
>
> **Proxy:** *kiểm soát access* – authentication proxy từ chối access nếu user chưa authenticate
>
> Proxy thường tự tạo real subject bên trong, Decorator nhận real subject qua injection."

---

## PHẦN 3 – CODE WALKTHROUGH (5:00 – 16:00)

### Loại 1: Protection Proxy (5:00 – 9:00)

```csharp
public interface IReportService
{
    Task<Report> GenerateAsync(ReportRequest request, CancellationToken ct);
    Task<byte[]> ExportToPdfAsync(Guid reportId, CancellationToken ct);
    Task DeleteAsync(Guid reportId, CancellationToken ct);
}

// Real subject – business logic thuần túy, không biết về auth
public class ReportService(IReportRepository repo, IPdfGenerator pdfGen) : IReportService
{
    public async Task<Report> GenerateAsync(ReportRequest request, CancellationToken ct)
        => await repo.GenerateAsync(request, ct);
    public async Task<byte[]> ExportToPdfAsync(Guid reportId, CancellationToken ct)
        => await pdfGen.GenerateAsync(reportId, ct);
    public async Task DeleteAsync(Guid reportId, CancellationToken ct)
        => await repo.DeleteAsync(reportId, ct);
}

// Protection Proxy – kiểm tra quyền trước khi delegate
public class SecureReportProxy(
    IReportService inner,
    IHttpContextAccessor httpContextAccessor) : IReportService
{
    private ClaimsPrincipal User => httpContextAccessor.HttpContext!.User;

    public Task<Report> GenerateAsync(ReportRequest request, CancellationToken ct)
    {
        // Chỉ cần authenticated để tạo report
        if (!User.Identity?.IsAuthenticated ?? true)
            throw new UnauthorizedException("Must be logged in to generate reports");
        
        return inner.GenerateAsync(request, ct);
    }

    public Task<byte[]> ExportToPdfAsync(Guid reportId, CancellationToken ct)
    {
        // Export cần quyền Premium
        if (!User.HasClaim("subscription", "premium"))
            throw new ForbiddenException("PDF export requires Premium subscription");
        
        return inner.ExportToPdfAsync(reportId, ct);
    }

    public Task DeleteAsync(Guid reportId, CancellationToken ct)
    {
        // Chỉ Admin mới được xóa
        if (!User.IsInRole("Admin"))
            throw new ForbiddenException("Only admins can delete reports");
        
        return inner.DeleteAsync(reportId, ct);
    }
}

// DI – Proxy bọc Real Subject
builder.Services.AddScoped<ReportService>(); // Real subject
builder.Services.AddScoped<IReportService>(sp =>
    new SecureReportProxy(
        sp.GetRequiredService<ReportService>(),
        sp.GetRequiredService<IHttpContextAccessor>()));
```

### Loại 2: Virtual Proxy – Lazy Loading (9:00 – 13:00)

```csharp
// Virtual Proxy: defer expensive initialization đến khi thực sự cần
public interface IHeavyReport
{
    string Title { get; }
    byte[] GetFullData();  // Expensive: load hàng MB từ disk/DB
    IEnumerable<ReportSection> GetSections(); // Cũng expensive
}

// Virtual Proxy: chỉ load khi cần
public class LazyHeavyReport(Guid reportId, IReportStorage storage) : IHeavyReport
{
    // Lazy<T>: chỉ tạo khi lần đầu truy cập .Value
    private readonly Lazy<IHeavyReport> _inner = new(() => storage.LoadFull(reportId));
    
    // Title: load từ index, không cần full report
    public string Title => storage.GetTitle(reportId);

    // GetFullData: trigger lazy load – chỉ khi method này được gọi mới load hết data
    public byte[] GetFullData() => _inner.Value.GetFullData();
    
    public IEnumerable<ReportSection> GetSections() => _inner.Value.GetSections();
}

// EF Core Lazy Loading Proxy (built-in):
// Khi install Microsoft.EntityFrameworkCore.Proxies và enable lazy loading,
// EF Core tạo proxy class cho entity, override virtual navigation properties
// để load related entities khi được truy cập lần đầu

// Ví dụ thực tế với EF Core:
public class Order
{
    public Guid Id { get; set; }
    // virtual → EF Core có thể tạo proxy để lazy load Customer
    public virtual Customer Customer { get; set; } = null!;
    public virtual ICollection<OrderItem> Items { get; set; } = [];
}

// Trong Program.cs:
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(connectionString)
       .UseLazyLoadingProxies()); // ← Bật Virtual Proxy cho tất cả entities

// Sử dụng:
var order = await context.Orders.FindAsync(orderId); // Chỉ load Order table
var name = order.Customer.Name; // Đây: lazy load Customer từ DB – triggered bởi Proxy
```

### Loại 3: Caching Proxy (13:00 – 16:00)

```csharp
// Caching Proxy: khác Caching Decorator ở chỗ Proxy tự quản lý real subject
public class CachingProductProxy(IMemoryCache cache) : IProductService
{
    // Proxy TỰ TẠO real subject, không nhận từ bên ngoài
    private readonly IProductService _realService = new ProductService(/* ... */);
    
    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var cacheKey = $"product:{id}";
        if (cache.TryGetValue(cacheKey, out Product? cached))
            return cached;
        
        // Chỉ gọi real service khi cache miss
        var product = await _realService.GetByIdAsync(id, ct);
        if (product != null)
            cache.Set(cacheKey, product, TimeSpan.FromMinutes(5));
        return product;
    }
    
    // Write operations: invalidate cache
    public async Task UpdateAsync(Product product, CancellationToken ct)
    {
        await _realService.UpdateAsync(product, ct);
        cache.Remove($"product:{product.Id}");
    }
}
```

---

## PHẦN 4 – VÍ DỤ THỰC TẾ .NET (16:00 – 19:00)

> "Proxy pattern trong .NET ecosystem:
>
> **HttpClient với DelegatingHandler** – mỗi DelegatingHandler là một proxy: logging handler → retry handler → auth handler → real HTTP call.
>
> **gRPC Generated Client** – client code được generate từ .proto file là Remote Proxy. Bạn gọi `orderService.CreateOrder()` nhưng thực ra nó serialize và gửi qua network.
>
> **Castle DynamicProxy / DispatchProxy** – .NET có thể tạo proxy class tại runtime. Được dùng bởi Moq (mocking library) và các AOP frameworks.
>
> **EF Core Lazy Loading Proxies** – như đã demo ở trên."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (19:00 – 20:30)

**✅ NÊN dùng khi:**
- Protection Proxy: kiểm soát access theo user/role
- Virtual Proxy: lazy initialization của objects tốn kém
- Remote Proxy: hide network call sau local interface
- Smart Proxy: reference counting, access logging

**❌ KHÔNG nên dùng khi:**
- Cần thêm behavior (dùng Decorator thay thế)
- Proxy layer không có giá trị thực sự (pass-through không làm gì)
- Performance overhead không chấp nhận được

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (20:30 – 21:00)

> "Proxy: một object đứng trước object thực, kiểm soát truy cập.
>
> Ba loại phổ biến: Protection (auth/authz), Virtual (lazy loading), Remote (gRPC client).
>
> Bài tiếp theo: **Mediator** – thay vì objects giao tiếp trực tiếp, tất cả đi qua một trung gian. Giảm coupling từ O(n²) xuống O(n). MediatR trong ASP.NET Core là Mediator."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | SecureReportProxy – test với user không có quyền, thấy exception |
| Demo | EF Core lazy loading – bật SQL logging, thấy query bị hoãn |
| So sánh | Proxy vs Decorator: mục đích và cách tạo real subject |
