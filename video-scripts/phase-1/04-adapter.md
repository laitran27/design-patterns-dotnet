# Bài 04 – Adapter Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 2 | **Thứ tự:** 4/23  
**Thời lượng ước tính:** 20 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: Ổ cắm điện Việt Nam 220V và thiết bị Mỹ 110V]**

> "Bạn mang laptop từ Mỹ về Việt Nam. Ổ cắm Mỹ hai chân dẹt, ổ cắm Việt Nam hai chân tròn. Bạn cần một bộ chuyển đổi – adapter.
>
> Trong software, vấn đề tương tự xảy ra mỗi ngày: bạn có một interface mà hệ thống của bạn đang dùng, và bạn muốn tích hợp một third-party library có API hoàn toàn khác. Bạn không thể sửa library, không thể sửa interface của mình.
>
> **Adapter Pattern** là giải pháp – tạo ra một lớp trung gian dịch từ interface này sang interface kia."

---

## PHẦN 2 – ADAPTER LÀ GÌ? CONCEPT (2:00 – 6:00)

**[Màn hình: UML diagram]**

```
Client ──▶ [ITarget Interface] ──▶ [Adapter] ──▶ [Adaptee (Third-party)]
                                       │
                             dịch từ ITarget
                             sang Adaptee API
```

> "Ba thành phần:
>
> **Target Interface** – Interface mà client code của bạn đang mong đợi. Ví dụ: `IPaymentGateway` với method `ChargeAsync()`.
>
> **Adaptee** – Class/library bên ngoài với API khác. Ví dụ: `StripeClient` với `CreatePaymentIntentAsync()`.
>
> **Adapter** – Lớp trung gian implement `IPaymentGateway` nhưng bên trong gọi `StripeClient`. Client không biết sự tồn tại của Stripe.
>
> Kết quả: hệ thống của bạn hoàn toàn không biết đang dùng Stripe, VNPay hay MoMo. Muốn đổi sang provider khác – chỉ viết Adapter mới."

---

## PHẦN 3 – CODE WALKTHROUGH (6:00 – 15:00)

### Bước 1: Vấn đề thực tế (6:00 – 8:00)

```csharp
// Interface hệ thống của bạn đang dùng
public interface IPaymentGateway
{
    Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct);
    Task<RefundResult> RefundAsync(string transactionId, decimal amount, CancellationToken ct);
}

// Stripe SDK có API hoàn toàn khác – bạn KHÔNG thể sửa code này
public class StripeClient
{
    public async Task<PaymentIntent> CreatePaymentIntentAsync(long amountInCents, 
        string currency, string paymentMethodId) { /* ... */ }
    public async Task<Refund> CreateRefundAsync(string paymentIntentId, long amountInCents) 
        { /* ... */ }
}
```

> "Hai interfaces không tương thích: `IPaymentGateway.ChargeAsync(PaymentRequest)` vs `StripeClient.CreatePaymentIntentAsync(long, string, string)`. Adapter dịch giữa chúng."

### Bước 2: Stripe Adapter (8:00 – 12:00)

```csharp
// Adapter: implement IPaymentGateway, bên trong dùng StripeClient
public class StripePaymentAdapter(StripeClient stripeClient) : IPaymentGateway
{
    public async Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct)
    {
        // Dịch từ domain model sang Stripe model:
        // 1. Chuyển decimal VND sang long cents (Stripe dùng cents, không dùng VND trực tiếp)
        var amountInCents = (long)(request.Amount * 100);
        
        // 2. Map currency code
        var currency = request.Currency.ToLower(); // "VND" → "vnd"
        
        // 3. Gọi Stripe API với signature khác hoàn toàn
        var paymentIntent = await stripeClient.CreatePaymentIntentAsync(
            amountInCents, currency, request.PaymentMethodToken);
        
        // 4. Dịch kết quả Stripe về domain model
        return new PaymentResult(
            TransactionId: paymentIntent.Id,
            Success: paymentIntent.Status == "succeeded",
            ErrorMessage: paymentIntent.Status != "succeeded" ? paymentIntent.LastPaymentError?.Message : null
        );
    }

    public async Task<RefundResult> RefundAsync(string transactionId, decimal amount, CancellationToken ct)
    {
        var amountInCents = (long)(amount * 100);
        var refund = await stripeClient.CreateRefundAsync(transactionId, amountInCents);
        
        return new RefundResult(
            RefundId: refund.Id,
            Success: refund.Status == "succeeded"
        );
    }
}
```

> "Adapter làm ba việc:
> 1. **Dịch kiểu dữ liệu:** `decimal amount` → `long amountInCents`
> 2. **Dịch method signature:** `ChargeAsync(PaymentRequest)` → `CreatePaymentIntentAsync(long, string, string)`
> 3. **Dịch kết quả:** `PaymentIntent` → `PaymentResult`
>
> Client code không biết gì về Stripe. Nó chỉ biết `IPaymentGateway`."

### Bước 3: Thêm VNPay Adapter (12:00 – 15:00)

```csharp
// VNPay SDK với API hoàn toàn khác Stripe
public class VnPayPaymentAdapter(VnPayGateway vnPay, VnPayConfig config) : IPaymentGateway
{
    public async Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct)
    {
        // VNPay dùng form-encoded parameters, không phải JSON như Stripe
        var vnPayRequest = new Dictionary<string, string>
        {
            ["vnp_Amount"] = ((long)(request.Amount * 100)).ToString(),
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = request.OrderId.ToString(),
            ["vnp_OrderInfo"] = request.Description,
            ["vnp_Locale"] = "vn",
            // ... nhiều fields khác
        };
        
        var result = await vnPay.CreatePaymentUrlAsync(vnPayRequest, config.HashSecret);
        return new PaymentResult(result.TransactionId, result.IsSuccess);
    }

    public async Task<RefundResult> RefundAsync(string transactionId, decimal amount, CancellationToken ct)
    {
        var result = await vnPay.RefundTransactionAsync(transactionId, (long)(amount * 100));
        return new RefundResult(result.RefundId, result.Success);
    }
}

// DI Registration – chọn provider theo config
builder.Services.AddSingleton<IPaymentGateway>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return config["PaymentProvider"] switch
    {
        "Stripe" => new StripePaymentAdapter(sp.GetRequiredService<StripeClient>()),
        "VnPay"  => new VnPayPaymentAdapter(sp.GetRequiredService<VnPayGateway>(), vnPayConfig),
        _ => throw new InvalidOperationException("Unknown payment provider")
    };
});
```

> "Đổi từ Stripe sang VNPay: chỉ thay một dòng trong config `appsettings.json`. Toàn bộ OrderService, PaymentController không thay đổi gì. Đây là sức mạnh của Adapter + DI."

---

## PHẦN 4 – VÍ DỤ THỰC TẾ .NET (15:00 – 18:00)

> "Adapter xuất hiện khắp .NET ecosystem:
>
> **`ILogger<T>` adapters** – `NLog.Extensions.Logging`, `Serilog.Extensions.Logging` – chúng adapt logging framework bên ngoài vào `ILogger<T>` của ASP.NET Core. Code của bạn dùng `ILogger<T>`, không cần biết Serilog hay NLog bên dưới.
>
> **`DbDataAdapter` trong ADO.NET** – Tên đã nói lên tất cả. Nó adapt data source (SQL Server, Oracle...) vào `DataSet` interface.
>
> **`HttpMessageHandler` adapters** – Custom handlers trong `HttpClient` pipeline adapt HTTP calls để thêm logging, retry, authentication. `DelegatingHandler` chính là Adapter/Decorator hybrid.
>
> **Repository pattern** – EF Core's `DbContext` là adapter cho database access qua LINQ-to-Entities."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (18:00 – 20:00)

**✅ NÊN dùng khi:**
- Tích hợp third-party library với interface không tương thích
- Muốn dùng lại legacy code với interface mới
- Cần swap provider mà không ảnh hưởng client code
- Muốn isolate dependency vào một nơi duy nhất (dễ mock, dễ test)

**❌ KHÔNG nên dùng khi:**
- Có thể dùng trực tiếp interface của library (không cần dịch)
- Adapter chứa quá nhiều business logic – nên tách ra service riêng
- Chỉ cần wrap một method đơn giản – extension method đủ rồi

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (20:00 – 20:30)

> "Adapter là cầu nối giữa hai interfaces không tương thích. Bạn viết một lần, và toàn bộ hệ thống có thể dùng mọi provider thông qua interface thống nhất.
>
> Bài tiếp theo: **Decorator Pattern** – khác Adapter ở chỗ Decorator *bổ sung chức năng* cho object, trong khi Adapter *dịch interface*. Ví dụ: thêm caching và logging vào repository mà không sửa repository gốc."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo trực tiếp | Đổi PaymentProvider trong appsettings từ Stripe sang VNPay, code không đổi |
| Visual | Sơ đồ phích cắm/ổ điện để minh họa "adapter" |
| Điểm nhấn | Tất cả business logic chỉ dùng IPaymentGateway – không bao giờ biết Stripe/VNPay |
