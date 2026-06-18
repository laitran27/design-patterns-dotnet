# Bài 07 – Strategy Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 3 | **Thứ tự:** 7/23  
**Thời lượng ước tính:** 21 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Switch statement lớn cho shipping calculation]**

> "Đây là code tính phí vận chuyển mà tôi thấy trong rất nhiều dự án thực tế:"

```csharp
public decimal CalculateShipping(Order order, string shippingType)
{
    switch (shippingType)
    {
        case "standard":
            return order.Weight * 5000 + (order.Total > 500000 ? 0 : 30000);
        case "express":
            return order.Weight * 12000 + 50000;
        case "overnight":
            return order.Weight * 20000 + 100000 + (order.IsFragile ? 20000 : 0);
        case "free":
            return order.Total >= 1000000 ? 0 : throw new InvalidOperationException();
        default:
            throw new ArgumentException($"Unknown shipping type: {shippingType}");
    }
}
```

> "Khi thêm loại vận chuyển mới – GHN Express, GHTK, J&T – bạn phải mở method này lên, thêm case, và test lại tất cả. Và method này ngày càng phình to.
>
> **Strategy Pattern** giải quyết bằng cách đóng gói mỗi algorithm trong một class riêng biệt. Switch statement biến mất."

---

## PHẦN 2 – STRATEGY LÀ GÌ? CONCEPT (2:30 – 6:30)

**[Màn hình: UML diagram]**

```
┌──────────────────┐     uses      ┌───────────────────┐
│     Context      │──────────────▶│  <<interface>>    │
│ (ShippingService)│               │  IShippingStrategy│
└──────────────────┘               ├───────────────────┤
         │                         │+Calculate(order)  │
         │ inject strategy          └───────────────────┘
         │                                    ▲
         │                          ┌─────────┼──────────┐
         │                    ┌─────────┐ ┌─────────┐ ┌──────────┐
         │                    │Standard │ │Express  │ │Overnight │
         │                    │Strategy │ │Strategy │ │Strategy  │
         │                    └─────────┘ └─────────┘ └──────────┘
```

> "Ba thành phần:
>
> **Strategy Interface** – Hợp đồng chung. Ví dụ: `IShippingStrategy` với method `Calculate(Order)`.
>
> **Concrete Strategies** – Mỗi algorithm trong class riêng: `StandardShippingStrategy`, `ExpressShippingStrategy`.
>
> **Context** – Class sử dụng strategy. Không biết algorithm cụ thể, chỉ biết interface.
>
> **Điểm mấu chốt:** Strategy được inject vào Context – có thể thay đổi tại runtime. Thêm GHN? Viết class mới, không sửa code cũ."

---

## PHẦN 3 – CODE WALKTHROUGH (6:30 – 16:00)

### Bước 1: Strategy Interface (6:30 – 8:00)

```csharp
// IShippingStrategy: hợp đồng chung cho tất cả chiến lược vận chuyển
public interface IShippingStrategy
{
    decimal Calculate(Order order);
    bool IsEligible(Order order);  // Kiểm tra order có đủ điều kiện không
    string Name { get; }           // Tên hiển thị (UI, logging)
}
```

### Bước 2: Concrete Strategies (8:00 – 12:00)

```csharp
// Mỗi strategy là một class độc lập – Single Responsibility
public class StandardShippingStrategy : IShippingStrategy
{
    public string Name => "Tiêu chuẩn (3-5 ngày)";
    
    public bool IsEligible(Order order) => true; // Luôn có thể dùng

    public decimal Calculate(Order order)
    {
        var base_ = order.Weight * 5000;
        var discount = order.Total > 500_000 ? 0 : 30_000;
        return base_ + discount;
    }
}

public class ExpressShippingStrategy : IShippingStrategy
{
    public string Name => "Nhanh (1-2 ngày)";
    
    public bool IsEligible(Order order) => order.DeliveryAddress.IsUrbanArea;

    public decimal Calculate(Order order)
    {
        var base_ = order.Weight * 12_000 + 50_000;
        var peakSurcharge = IsPeakHour() ? 15_000 : 0; // Giờ cao điểm
        return base_ + peakSurcharge;
    }
    
    private static bool IsPeakHour() => 
        DateTime.Now.Hour is >= 17 and <= 20;
}

public class FreeShippingStrategy : IShippingStrategy
{
    public string Name => "Miễn phí vận chuyển";
    
    // Chỉ eligible khi đơn >= 1 triệu
    public bool IsEligible(Order order) => order.Total >= 1_000_000;

    public decimal Calculate(Order order) => 0;
}

public class GhnExpressStrategy(GhnApiClient ghnClient) : IShippingStrategy
{
    public string Name => "GHN Express";
    
    public bool IsEligible(Order order) => true;

    public decimal Calculate(Order order)
    {
        // Tích hợp với GHN API để tính phí thực tế
        // Trong thực tế: gọi API đồng bộ hoặc cache kết quả
        return ghnClient.CalculateFeeSync(
            order.Weight, order.DeliveryAddress.District, order.DeliveryAddress.Province);
    }
}
```

> "Nhìn `GhnExpressStrategy` – nó inject `GhnApiClient`. Strategy có thể có dependencies riêng của nó. Thêm GHTK? Thêm class `GhtkStrategy`, không chạm vào code cũ."

### Bước 3: Context sử dụng Strategy (12:00 – 16:00)

```csharp
// ShippingService là Context – dùng strategy qua interface
public class ShippingService(IEnumerable<IShippingStrategy> strategies)
{
    // Lấy các strategies eligible cho order này
    public IEnumerable<ShippingOption> GetAvailableOptions(Order order)
    {
        return strategies
            .Where(s => s.IsEligible(order))
            .Select(s => new ShippingOption(s.Name, s.Calculate(order)))
            .OrderBy(o => o.Price);
    }

    // Tính phí cho strategy cụ thể theo tên
    public decimal CalculateFor(Order order, string strategyName)
    {
        var strategy = strategies.FirstOrDefault(s => s.Name == strategyName)
            ?? throw new ArgumentException($"Unknown shipping strategy: {strategyName}");
        return strategy.Calculate(order);
    }
}

// DI Registration – đăng ký tất cả strategies
builder.Services.AddTransient<IShippingStrategy, StandardShippingStrategy>();
builder.Services.AddTransient<IShippingStrategy, ExpressShippingStrategy>();
builder.Services.AddTransient<IShippingStrategy, FreeShippingStrategy>();
builder.Services.AddTransient<IShippingStrategy, GhnExpressStrategy>(); // Mới thêm – không sửa code cũ
builder.Services.AddScoped<ShippingService>();

// Controller dùng ShippingService
public class CheckoutController(ShippingService shippingService) : ControllerBase
{
    [HttpGet("shipping-options")]
    public IActionResult GetShippingOptions([FromQuery] Guid orderId)
    {
        var order = /* load order */;
        var options = shippingService.GetAvailableOptions(order);
        return Ok(options);
    }
}
```

---

## PHẦN 4 – STRATEGY VỚI KEYED SERVICES (.NET 8) (16:00 – 18:30)

```csharp
// .NET 8: Keyed Services cho Strategy pattern sạch hơn
builder.Services.AddKeyedTransient<IShippingStrategy, StandardShippingStrategy>("standard");
builder.Services.AddKeyedTransient<IShippingStrategy, ExpressShippingStrategy>("express");
builder.Services.AddKeyedTransient<IShippingStrategy, GhnExpressStrategy>("ghn");

// Inject theo key
public class ShippingService(IServiceProvider sp)
{
    public decimal Calculate(Order order, string type)
    {
        var strategy = sp.GetKeyedService<IShippingStrategy>(type)
            ?? throw new ArgumentException($"Unknown strategy: {type}");
        return strategy.Calculate(order);
    }
}

// Pricing strategy – ví dụ thực tế khác
public interface IPricingStrategy
{
    decimal ApplyDiscount(decimal price, Customer customer);
}

public class PlatinumPricingStrategy : IPricingStrategy
{
    public decimal ApplyDiscount(decimal price, Customer customer)
        => customer.Tier == "Platinum" ? price * 0.8m : price; // 20% discount
}

public class VolumePricingStrategy : IPricingStrategy
{
    public decimal ApplyDiscount(decimal price, Customer customer)
    {
        var quantity = customer.CartQuantity;
        return quantity switch
        {
            >= 10 => price * 0.9m,   // 10% off
            >= 5  => price * 0.95m,  // 5% off
            _     => price
        };
    }
}
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (18:30 – 20:30)

**✅ NÊN dùng khi:**
- Có nhiều variants của cùng algorithm (pricing, sorting, shipping, validation)
- Cần swap algorithm tại runtime theo config hoặc user input
- Muốn test mỗi algorithm độc lập không phụ thuộc nhau
- Switch/if-else cho algorithm ngày càng phình to

**❌ KHÔNG nên dùng khi:**
- Chỉ có 2 variants đơn giản – if/else đủ rồi, tránh over-engineering
- Algorithms không có điểm chung nào để tạo interface
- Client cần biết chi tiết nội bộ của algorithm để dùng đúng

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (20:30 – 21:00)

> "Strategy Pattern: mỗi algorithm là một class. Switch statement biến mất.
>
> Ba điều nhớ:
> 1. Define interface chung, mỗi strategy implement interface đó
> 2. Context inject `IEnumerable<IStrategy>` để có thể chọn strategy tại runtime
> 3. Thêm strategy mới = thêm class + DI registration, không sửa gì cả
>
> Bài tiếp theo: **Observer Pattern** – khi một event xảy ra, nhiều thứ cần biết về nó. Thay vì gọi trực tiếp, Observer cho phép loose coupling hoàn toàn. Ví dụ: khi đặt hàng xong, hệ thống cần gửi email, cộng điểm, update inventory – tất cả độc lập với nhau."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Thêm GhnExpressStrategy, chạy GetAvailableOptions và thấy nó xuất hiện |
| So sánh | Switch statement 50 dòng → 4 strategy classes 10 dòng mỗi cái |
| Điểm nhấn | `IEnumerable<IShippingStrategy>` – DI tự inject tất cả implementations |
| Thumbnail | Nhiều đường đến cùng một đích |
