# Bài 05 – Decorator Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 2 | **Thứ tự:** 5/23  
**Thời lượng ước tính:** 22 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Code ProductRepository đơn giản]**

> "Bạn có một `ProductRepository` hoạt động tốt. Rồi team lead nói: 'Thêm caching vào đi.' Bạn thêm caching. Rồi: 'Thêm logging để theo dõi performance.' Bạn thêm logging. Rồi: 'Thêm retry khi DB timeout.'
>
> Và cuối cùng `ProductRepository` của bạn là một con quái vật khổng lồ, làm tất cả mọi thứ và vi phạm Single Responsibility Principle tệ hại.
>
> Hoặc bạn có thể nghĩ khác đi. Thay vì *sửa* ProductRepository, hãy *bọc* nó. Decorator Pattern cho phép bạn thêm chức năng bằng cách bao bọc object, không bao giờ chạm vào code gốc.
>
> ASP.NET Core Middleware pipeline chính là Decorator in action."

---

## PHẦN 2 – DECORATOR LÀ GÌ? CONCEPT (2:30 – 6:30)

**[Màn hình: Diagram layers]**

```
Client Request
     │
     ▼
[LoggedProductRepository]      ← Decorator ngoài cùng
     │ delegate + log
     ▼
[CachedProductRepository]      ← Decorator giữa
     │ check cache, delegate nếu miss
     ▼
[ProductRepository]            ← Concrete Component (DB access)
     │
     ▼
Database
```

> "Mỗi lớp bọc lớp bên trong. Tất cả đều implement cùng một interface `IProductRepository`. Client không biết mình đang nói chuyện với LoggedProductRepository hay ProductRepository trực tiếp.
>
> Khác với Adapter: Adapter dịch interface. Decorator giữ nguyên interface và *thêm* behavior.
>
> Khác với Inheritance: Inheritance thêm behavior tại compile time, cố định. Decorator thêm tại runtime, linh hoạt – bạn có thể có Cached nhưng không cần Log, hoặc ngược lại."

---

## PHẦN 3 – CODE WALKTHROUGH (6:30 – 17:00)

### Bước 1: Interface và ConcreteComponent (6:30 – 9:00)

```csharp
// Interface chung – tất cả decorators phải implement
public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct);
    Task<Product> CreateAsync(Product product, CancellationToken ct);
    Task UpdateAsync(Product product, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}

// ProductRepository – chỉ lo DB, không biết cache/log tồn tại
public class ProductRepository(AppDbContext dbContext) : IProductRepository
{
    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
        => await dbContext.Products.FindAsync([id], ct);

    public async Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct)
        => await dbContext.Products.AsNoTracking().ToListAsync(ct);

    public async Task<Product> CreateAsync(Product product, CancellationToken ct)
    {
        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(ct);
        return product;
    }
    
    // ... UpdateAsync, DeleteAsync tương tự
}
```

> "ProductRepository thuần túy: chỉ DB access. Single Responsibility: chỉ một lý do để thay đổi – khi DB schema thay đổi. Không có một dòng cache hay log nào ở đây."

### Bước 2: Caching Decorator (9:00 – 12:30)

```csharp
public class CachedProductRepository(
    IProductRepository inner,      // ← Delegate cho đây sau khi xử lý cache
    IMemoryCache cache,
    IOptions<CacheOptions> options) : IProductRepository
{
    private static string CacheKey(Guid id) => $"product:{id}";
    private const string AllProductsKey = "products:all";

    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        // Cache hit → trả về ngay, không gọi DB
        if (cache.TryGetValue(CacheKey(id), out Product? cached))
            return cached;

        // Cache miss → delegate xuống inner (có thể là ProductRepository hoặc decorator khác)
        var product = await inner.GetByIdAsync(id, ct);
        if (product != null)
            cache.Set(CacheKey(id), product, options.Value.ProductExpiry);
        return product;
    }

    // Write operations: delegate TRƯỚC, sau đó invalidate cache
    public async Task<Product> CreateAsync(Product product, CancellationToken ct)
    {
        var created = await inner.CreateAsync(product, ct);
        // Sản phẩm mới → list cache lỗi thời, xóa để GetAll() lấy lại từ DB
        cache.Remove(AllProductsKey);
        return created;
    }

    public async Task UpdateAsync(Product product, CancellationToken ct)
    {
        await inner.UpdateAsync(product, ct);
        // Xóa cả cache theo id lẫn list cache
        cache.Remove(CacheKey(product.Id));
        cache.Remove(AllProductsKey);
    }

    // ... GetAllAsync, DeleteAsync tương tự
}
```

> "Pattern quan trọng trong CachedProductRepository:
>
> Với **read operations**: kiểm tra cache trước, nếu miss thì delegate xuống inner và set cache.
>
> Với **write operations**: delegate TRƯỚC, rồi mới invalidate cache. Thứ tự này quan trọng: nếu DB operation thất bại, cache không bị xóa oan."

### Bước 3: Logging Decorator (12:30 – 15:00)

```csharp
public class LoggedProductRepository(
    IProductRepository inner,
    ILogger<LoggedProductRepository> logger) : IProductRepository
{
    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        logger.LogDebug("Fetching product {ProductId}", id);
        var sw = Stopwatch.StartNew();
        
        var result = await inner.GetByIdAsync(id, ct);
        
        // Structured logging: ElapsedMs và Found là named properties → dễ query trong Kibana
        logger.LogDebug("Fetched product {ProductId} in {ElapsedMs}ms, Found: {Found}",
            id, sw.ElapsedMilliseconds, result != null);
        return result;
    }

    // Các methods khác: delegate trực tiếp (thêm logging nếu cần)
    public Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct) 
        => inner.GetAllAsync(ct);
    public Task<Product> CreateAsync(Product product, CancellationToken ct) 
        => inner.CreateAsync(product, ct);
    public Task UpdateAsync(Product product, CancellationToken ct) 
        => inner.UpdateAsync(product, ct);
    public Task DeleteAsync(Guid id, CancellationToken ct) 
        => inner.DeleteAsync(id, ct);
}
```

### Bước 4: DI Registration với Scrutor (15:00 – 17:00)

```csharp
// Scrutor library – tự động wrap decorators
// Install: dotnet add package Scrutor

builder.Services.AddScoped<IProductRepository, ProductRepository>(); // Base
builder.Services.Decorate<IProductRepository, CachedProductRepository>(); // Wrap ProductRepository
builder.Services.Decorate<IProductRepository, LoggedProductRepository>(); // Wrap CachedProductRepository

// Kết quả khi inject IProductRepository:
// Client → LoggedProductRepository → CachedProductRepository → ProductRepository

// Đọc: "Log" bọc ngoài cùng → logged → kiểm tra cache → nếu miss thì query DB
```

> "Với Scrutor, thứ tự `Decorate()` quyết định thứ tự gọi. Decorator cuối = lớp ngoài cùng.
>
> Không có Scrutor? Manual registration:"

```csharp
builder.Services.AddScoped<ProductRepository>();
builder.Services.AddScoped<IProductRepository>(sp =>
    new LoggedProductRepository(
        new CachedProductRepository(
            sp.GetRequiredService<ProductRepository>(),
            sp.GetRequiredService<IMemoryCache>(),
            sp.GetRequiredService<IOptions<CacheOptions>>()),
        sp.GetRequiredService<ILogger<LoggedProductRepository>>()));
```

---

## PHẦN 4 – VÍ DỤ THỰC TẾ .NET (17:00 – 20:00)

> "Decorator là pattern phổ biến nhất trong .NET:
>
> **ASP.NET Core Middleware** – mỗi `app.Use...()` là một Decorator bọc request pipeline. `UseExceptionHandler` → `UseAuthentication` → `UseAuthorization` → Controller. Thứ tự quan trọng như Decorator stack.
>
> **`Stream` classes trong .NET** – `BufferedStream(new FileStream(...))`, `CryptoStream(new GZipStream(new FileStream(...)))`. Bạn wrap stream để thêm buffering, encryption, compression. Đây là Decorator textbook.
>
> **`DelegatingHandler` trong HttpClient** – mỗi Handler là Decorator thêm behavior (logging, retry, auth header) vào HTTP call mà không sửa business logic.
>
> **`ILogger` decorators** – Serilog, NLog wrap `ILogger` để thêm sinks, enrichers."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (20:00 – 21:30)

**✅ NÊN dùng khi:**
- Thêm cross-cutting concerns (cache, log, retry, audit) mà không sửa business logic
- Muốn thêm/bớt behavior tại runtime, không cố định tại compile time
- Inheritance không thực tế vì class là `sealed` hoặc sẽ tạo class explosion

**❌ KHÔNG nên dùng khi:**
- Decorator stack quá sâu (>4-5 lớp) gây khó debug và trace
- Thứ tự decorators quan trọng nhưng khó kiểm soát trong DI
- Chỉ cần thêm một behavior đơn giản – extension method đủ rồi

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (21:30 – 22:00)

> "Decorator: thêm behavior bằng cách bọc, không bao giờ sửa code gốc.
>
> Ba điều nhớ:
> 1. Tất cả decorators implement cùng interface như component gốc
> 2. Mỗi decorator giữ reference đến inner và delegate cho nó
> 3. Scrutor library giúp đăng ký decorators trong DI một cách sạch sẽ
>
> Bài tiếp theo: **Facade** – thay vì bổ sung behavior như Decorator, Facade *đơn giản hóa* API phức tạp. Ví dụ: thay vì gọi 5 services riêng lẻ để xử lý một order, bạn gọi một method `OrderFacade.PlaceOrderAsync()`."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo trực tiếp | Scrutor registration, chạy request và xem log output |
| So sánh | Inheritance class explosion vs Decorator stack linh hoạt |
| Visual | Diagram các lớp bọc như hành tây |
| Điểm nhấn | Stream classes – Decorator đã có sẵn trong .NET từ version 1.0 |
