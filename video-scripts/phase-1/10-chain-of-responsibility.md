# Bài 10 – Chain of Responsibility Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 4 | **Thứ tự:** 10/23  
**Thời lượng ước tính:** 21 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: ASP.NET Core Program.cs với middleware pipeline]**

> "Nhìn vào đoạn code này – bạn viết nó mỗi ngày:"

```csharp
app.UseExceptionHandler();    // Handler 1
app.UseHttpsRedirection();    // Handler 2
app.UseAuthentication();      // Handler 3
app.UseAuthorization();       // Handler 4
app.UseRateLimiter();         // Handler 5
app.MapControllers();         // Handler cuối
```

> "Mỗi request HTTP đi qua từng Handler này theo thứ tự. Mỗi Handler có thể:
> - Xử lý request và trả response (dừng chain)
> - Hoặc chuyển request cho Handler tiếp theo
>
> Đây chính là **Chain of Responsibility Pattern** – và nó đã được built vào ASP.NET Core ngay từ đầu.
>
> Hôm nay chúng ta sẽ hiểu pattern này từ gốc, rồi áp dụng vào các scenarios phổ biến như approval workflow và validation pipeline."

---

## PHẦN 2 – CHAIN OF RESPONSIBILITY LÀ GÌ? CONCEPT (2:30 – 6:00)

**[Màn hình: Sơ đồ chain]**

```
Request ──▶ [Handler1] ──▶ [Handler2] ──▶ [Handler3] ──▶ null
                │               │               │
             Handle          Pass On          Handle
             or pass         to next        (final stop)
```

> "Chain of Responsibility tạo ra một chuỗi handlers. Request đi qua từng handler:
>
> **Handler xử lý:** Nếu handler có thể xử lý request, nó làm vậy và có thể dừng chain.
>
> **Handler chuyển tiếp:** Nếu không thể xử lý, nó gọi `next.Handle(request)` để chuyển cho handler sau.
>
> **Lợi ích:**
> - Thêm/bớt handler không ảnh hưởng handler khác
> - Thứ tự chain có thể thay đổi theo config
> - Mỗi handler một trách nhiệm
>
> **Khác Observer:** Observer broadcast đến TẤT CẢ. Chain of Responsibility: request đi qua từng handler, có thể dừng lại."

---

## PHẦN 3 – CODE WALKTHROUGH (6:00 – 16:00)

### Bước 1: Discount Approval Chain (6:00 – 10:00)

**[Tình huống: Phê duyệt discount theo cấp bậc]**

```
Discount ≤ 5%   → Manager có thể phê duyệt
Discount ≤ 15%  → Director phải phê duyệT
Discount ≤ 30%  → VP phải phê duyệt
Discount > 30%  → CEO phải phê duyệt
```

```csharp
// Request chứa discount request cần được phê duyệt
public record DiscountRequest(
    Guid OrderId, 
    decimal DiscountPercentage, 
    string RequestedBy,
    string Reason);

// Base handler – abstract, chứa "link" đến next handler
public abstract class DiscountApprovalHandler
{
    // next: handler tiếp theo trong chain
    private DiscountApprovalHandler? _next;

    // SetNext: fluent API để build chain
    public DiscountApprovalHandler SetNext(DiscountApprovalHandler next)
    {
        _next = next;
        return next; // Return next để có thể chain: handler1.SetNext(handler2).SetNext(handler3)
    }

    // Template method: concrete classes override CanApprove và ApproverName
    public virtual Task<ApprovalResult> HandleAsync(
        DiscountRequest request, CancellationToken ct)
    {
        // Nếu handler này có thể phê duyệt → xử lý
        if (CanApprove(request.DiscountPercentage))
            return ApproveAsync(request, ct);
        
        // Không thể phê duyệt → chuyển tiếp cho next handler
        if (_next != null)
            return _next.HandleAsync(request, ct);
        
        // Không ai trong chain có thể xử lý
        return Task.FromResult(new ApprovalResult(false, "Exceeds all approval limits"));
    }

    protected abstract bool CanApprove(decimal discountPercentage);
    protected abstract string ApproverName { get; }
    
    private Task<ApprovalResult> ApproveAsync(DiscountRequest request, CancellationToken ct)
    {
        // Log và approve
        Console.WriteLine($"{ApproverName} approved {request.DiscountPercentage}% discount for order {request.OrderId}");
        return Task.FromResult(new ApprovalResult(true, $"Approved by {ApproverName}"));
    }
}

// Concrete Handlers – mỗi handler biết ngưỡng của mình
public class ManagerApprovalHandler : DiscountApprovalHandler
{
    protected override bool CanApprove(decimal pct) => pct <= 5;
    protected override string ApproverName => "Manager";
}

public class DirectorApprovalHandler : DiscountApprovalHandler
{
    protected override bool CanApprove(decimal pct) => pct <= 15;
    protected override string ApproverName => "Director";
}

public class VPApprovalHandler : DiscountApprovalHandler
{
    protected override bool CanApprove(decimal pct) => pct <= 30;
    protected override string ApproverName => "VP of Sales";
}

public class CEOApprovalHandler : DiscountApprovalHandler
{
    protected override bool CanApprove(decimal pct) => pct <= 100;
    protected override string ApproverName => "CEO";
}
```

### Bước 2: Build Chain và sử dụng (10:00 – 13:00)

```csharp
// Build chain bằng DI
builder.Services.AddScoped<DiscountApprovalHandler>(sp =>
{
    var manager = new ManagerApprovalHandler();
    var director = new DirectorApprovalHandler();
    var vp = new VPApprovalHandler();
    var ceo = new CEOApprovalHandler();
    
    // SetNext trả về next → chain tiếp: manager → director → vp → ceo
    manager.SetNext(director).SetNext(vp).SetNext(ceo);
    
    return manager; // Trả về handler đầu tiên trong chain
});

// Service dùng chain
public class DiscountService(DiscountApprovalHandler approvalChain)
{
    public async Task<ApprovalResult> RequestDiscountAsync(
        DiscountRequest request, CancellationToken ct)
    {
        // Gửi request vào đầu chain – chain tự quyết định ai xử lý
        return await approvalChain.HandleAsync(request, ct);
    }
}

// Test:
// 3% → Manager phê duyệt ngay
// 10% → Manager không thể → Director phê duyệt
// 25% → Manager, Director không thể → VP phê duyệt
// 50% → Manager, Director, VP không thể → CEO phê duyệt
```

### Bước 3: Validation Pipeline (13:00 – 16:00)

```csharp
// Chain of Responsibility cho validation – validate từng bước, dừng khi gặp lỗi đầu tiên
public abstract class OrderValidationHandler
{
    private OrderValidationHandler? _next;
    
    public OrderValidationHandler SetNext(OrderValidationHandler next)
    {
        _next = next;
        return next;
    }

    public async Task<ValidationResult> ValidateAsync(Order order, CancellationToken ct)
    {
        var result = await ValidateStepAsync(order, ct);
        if (!result.IsValid) return result; // Dừng chain khi gặp lỗi
        
        return _next != null 
            ? await _next.ValidateAsync(order, ct)
            : ValidationResult.Success();
    }

    protected abstract Task<ValidationResult> ValidateStepAsync(Order order, CancellationToken ct);
}

public class CustomerExistsValidator(ICustomerRepository customerRepo) : OrderValidationHandler
{
    protected override async Task<ValidationResult> ValidateStepAsync(Order order, CancellationToken ct)
    {
        var exists = await customerRepo.ExistsAsync(order.CustomerId, ct);
        return exists 
            ? ValidationResult.Success() 
            : ValidationResult.Failure("Customer not found");
    }
}

public class InventoryAvailableValidator(IInventoryService inventory) : OrderValidationHandler
{
    protected override async Task<ValidationResult> ValidateStepAsync(Order order, CancellationToken ct)
    {
        var available = await inventory.CheckAvailabilityAsync(order.Items, ct);
        return available
            ? ValidationResult.Success()
            : ValidationResult.Failure("Some items are out of stock");
    }
}

public class PaymentMethodValidator : OrderValidationHandler
{
    protected override Task<ValidationResult> ValidateStepAsync(Order order, CancellationToken ct)
    {
        var valid = !string.IsNullOrEmpty(order.PaymentToken) && order.Total > 0;
        return Task.FromResult(valid 
            ? ValidationResult.Success() 
            : ValidationResult.Failure("Invalid payment information"));
    }
}
```

---

## PHẦN 4 – ASP.NET CORE MIDDLEWARE (16:00 – 19:00)

**[Màn hình: Middleware pipeline quen thuộc]**

> "Và đây là Chain of Responsibility mà bạn dùng mỗi ngày. Thứ tự CỰC KỲ quan trọng:"

```csharp
app.UseExceptionHandler();  // Handler đầu: bắt mọi exception từ các handlers sau
app.UseHttpsRedirection();  // Handler 2: redirect HTTP → HTTPS trước khi auth
app.UseAuthentication();    // Handler 3: parse JWT → set User principal
// PHẢI TRƯỚC UseAuthorization: Authorization cần User principal đã được set
app.UseAuthorization();     // Handler 4: kiểm tra quyền dựa vào User principal
app.UseRateLimiter();       // Handler 5: sau auth để biết user nào giới hạn
app.MapControllers();       // Handler cuối: xử lý request thực sự
```

> "Mỗi `app.Use*()` thêm một middleware (handler) vào chain. Thứ tự không đúng là bug – ví dụ nếu `UseAuthorization` đặt trước `UseAuthentication`, authorization không có User principal để check.
>
> Viết custom middleware:"

```csharp
// Custom middleware = một handler trong chain
public class RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        
        // Code trước khi gọi next handler
        await next(context);  // Gọi handler tiếp theo trong chain
        
        // Code sau khi handler tiếp theo hoàn thành
        logger.LogInformation("{Method} {Path} took {ElapsedMs}ms",
            context.Request.Method, context.Request.Path, sw.ElapsedMilliseconds);
    }
}

// Đăng ký vào chain
app.UseMiddleware<RequestTimingMiddleware>();
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (19:00 – 20:30)

**✅ NÊN dùng khi:**
- Nhiều handlers có thể xử lý request, không biết trước ai sẽ handle
- Muốn thêm/bớt handlers động mà không ảnh hưởng nhau
- Approval workflows với nhiều cấp độ phê duyệt
- Validation pipeline (dừng khi gặp lỗi đầu tiên)
- Cross-cutting concerns theo thứ tự (logging → auth → rate limit → business logic)

**❌ KHÔNG nên dùng khi:**
- Chain quá dài (>10 handlers) gây khó debug và trace
- Chỉ có 1-2 handlers cố định – if/else đơn giản hơn
- Thứ tự xử lý không quan trọng – dùng Observer thay thế

---

## PHẦN 6 – TÓM TẮT PHASE 1 & PREVIEW PHASE 2 (20:30 – 21:00)

> "Chain of Responsibility: request đi qua chuỗi handlers, mỗi handler quyết định xử lý hay chuyển tiếp.
>
> Ba điều nhớ:
> 1. Base handler có `SetNext()` và gọi `next?.Handle(request)` nếu không xử lý được
> 2. ASP.NET Core Middleware là Chain of Responsibility – thứ tự `app.Use*()` quan trọng
> 3. Dừng chain bằng cách không gọi `next` – middleware auth làm điều này khi unauthorized
>
> **Chúc mừng! Bạn đã hoàn thành Phase 1 – 10 patterns cơ bản nhất.**
>
> Phase 2 sắp tới: Abstract Factory, Composite, Proxy, Mediator, State, Template Method. Bắt đầu với **Abstract Factory** – khi bạn cần tạo cả *họ* objects tương thích nhau, không chỉ một object."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo 1 | Discount approval: test với 3%, 10%, 25%, 50% |
| Demo 2 | Custom middleware timing |
| Visual | Diagram chain với request flow và điểm dừng |
| Đặc biệt | Bài tổng kết Phase 1: nhắc lại 10 patterns đã học |
