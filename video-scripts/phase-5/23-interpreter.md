# Bài 23 – Interpreter Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 5 – Tổng Hợp | **Tuần:** 14 | **Thứ tự:** 23/23  
**Thời lượng ước tính:** 24 phút  
**Độ ưu tiên:** ⭐⭐ Trung Bình

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Admin panel với business rules được cấu hình]**

> "Imagine bạn build một e-commerce platform. Marketing team muốn tự cấu hình discount rules mà không cần nhờ developer:
>
> - 'Khách Platinum có đơn >= 1 triệu được giảm 20%'
> - 'Khách mới mua lần đầu hoặc có voucher CODE2024 được giảm 10%'
>
> Nếu hardcode mỗi rule: developer phải deploy mỗi lần Marketing thay đổi rule.
>
> **Interpreter Pattern** giải quyết: build một mini-language cho business rules. Rules được lưu vào database. Marketing tự cấu hình. System interpret và evaluate tại runtime.
>
> Đây là bài cuối trong series 23 patterns. Interpreter kết hợp nhiều patterns đã học: Composite (expression tree), Strategy (operator strategies), và Builder (xây dựng rule)."

---

## PHẦN 2 – INTERPRETER LÀ GÌ? CONCEPT (2:30 – 6:00)

```
Business Rule: "CustomerTier == Platinum AND Total >= 1000000"

                  [AND]                 ← Non-terminal: kết hợp expressions
                  /   \
[CustomerTier     ]   [Total           ]
[== "Platinum"    ]   [>= 1000000      ]
Terminal Expr         Terminal Expr
(Leaf node)           (Leaf node)
```

> "Interpreter xây dựng object tree để biểu diễn grammar của một ngôn ngữ đơn giản.
>
> **Terminal expressions (Leaf):** evaluate directly – `CustomerTier == Platinum`
>
> **Non-terminal expressions (Composite):** evaluate bằng cách kết hợp sub-expressions – `AND`, `OR`, `NOT`
>
> `Evaluate(context)` đệ quy qua tree để tính kết quả – giống Composite Pattern.
>
> Khác Composite: Interpreter không chỉ duyệt cây – nó *interpret* ngữ nghĩa của mỗi node."

---

## PHẦN 3 – CODE WALKTHROUGH (6:00 – 18:00)

### Bước 1: Expression Interface (6:00 – 8:00)

```csharp
// IExpression<T>: interface cho tất cả nodes trong expression tree
// Generic T: interpreter có thể evaluate trên bất kỳ domain model nào
public interface IExpression<T>
{
    // Evaluate: "thông dịch" expression trên context cụ thể
    bool Evaluate(T context);
    
    // Describe: human-readable string → hiển thị cho admin để verify rule
    string Describe();
}
```

### Bước 2: Terminal Expressions – Leaf nodes (8:00 – 11:00)

```csharp
// PropertyEqualsExpression: kiểm tra property == value
// Func<T, object?> thay vì reflection → type-safe, fast
public class PropertyEqualsExpression<T>(
    Func<T, object?> propertyGetter,
    object expectedValue,
    string propertyName) : IExpression<T>
{
    public bool Evaluate(T context)
        => Equals(propertyGetter(context), expectedValue);
    
    public string Describe() => $"{propertyName} == {expectedValue}";
}

// PropertyRangeExpression: kiểm tra min ≤ property ≤ max
public class PropertyRangeExpression<T>(
    Func<T, decimal> propertyGetter,
    decimal min, decimal max,
    string propertyName) : IExpression<T>
{
    public bool Evaluate(T context)
    {
        var value = propertyGetter(context);
        return value >= min && value <= max;
    }
    
    public string Describe() => $"{propertyName} between {min:N0} and {(max == decimal.MaxValue ? "∞" : max.ToString("N0"))}";
}

// PropertyContainsExpression: kiểm tra collection contains value
public class PropertyContainsExpression<T, TItem>(
    Func<T, IEnumerable<TItem>> collectionGetter,
    TItem targetValue,
    string propertyName) : IExpression<T>
{
    public bool Evaluate(T context)
        => collectionGetter(context).Contains(targetValue);
    
    public string Describe() => $"{propertyName} contains {targetValue}";
}
```

### Bước 3: Non-terminal Expressions – Composite nodes (11:00 – 14:00)

```csharp
// AndExpression: short-circuit evaluation
public class AndExpression<T>(IExpression<T> left, IExpression<T> right) : IExpression<T>
{
    // && short-circuits: nếu left = false → không evaluate right
    public bool Evaluate(T context) => left.Evaluate(context) && right.Evaluate(context);
    public string Describe() => $"({left.Describe()} AND {right.Describe()})";
}

public class OrExpression<T>(IExpression<T> left, IExpression<T> right) : IExpression<T>
{
    public bool Evaluate(T context) => left.Evaluate(context) || right.Evaluate(context);
    public string Describe() => $"({left.Describe()} OR {right.Describe()})";
}

public class NotExpression<T>(IExpression<T> inner) : IExpression<T>
{
    public bool Evaluate(T context) => !inner.Evaluate(context);
    public string Describe() => $"NOT ({inner.Describe()})";
}

// AnyExpression: true nếu ít nhất 1 trong N expressions là true
public class AnyExpression<T>(IEnumerable<IExpression<T>> expressions) : IExpression<T>
{
    private readonly List<IExpression<T>> _expressions = [..expressions];
    
    public bool Evaluate(T context) => _expressions.Any(e => e.Evaluate(context));
    
    public string Describe() => $"ANY({string.Join(", ", _expressions.Select(e => e.Describe()))})";
}
```

### Bước 4: Business Rules DSL (14:00 – 18:00)

```csharp
// Domain model
public record Order(
    Guid Id,
    string CustomerTier,      // "Platinum", "Gold", "Silver"
    decimal Total,
    bool IsFirstOrder,
    List<string> AppliedVouchers,
    string ShippingType);

// Rules helper – đọc như business language
public static class OrderRules
{
    // Terminal expressions
    public static IExpression<Order> PlatinumCustomer =>
        new PropertyEqualsExpression<Order>(o => o.CustomerTier, "Platinum", "CustomerTier");
    
    public static IExpression<Order> GoldCustomer =>
        new PropertyEqualsExpression<Order>(o => o.CustomerTier, "Gold", "CustomerTier");
    
    public static IExpression<Order> HighValueOrder =>
        new PropertyRangeExpression<Order>(o => o.Total, 1_000_000, decimal.MaxValue, "Total");
    
    public static IExpression<Order> MediumValueOrder =>
        new PropertyRangeExpression<Order>(o => o.Total, 500_000, 999_999, "Total");
    
    public static IExpression<Order> FirstTimeCustomer =>
        new PropertyEqualsExpression<Order>(o => o.IsFirstOrder, true, "IsFirstOrder");
    
    public static IExpression<Order> HasVoucher(string code) =>
        new PropertyContainsExpression<Order, string>(o => o.AppliedVouchers, code, "Vouchers");
    
    public static IExpression<Order> FreeShippingEligible =>
        new AndExpression<Order>(
            new PropertyRangeExpression<Order>(o => o.Total, 500_000, decimal.MaxValue, "Total"),
            new PropertyEqualsExpression<Order>(o => o.ShippingType, "standard", "ShippingType"));
    
    // Composite business rules
    public static IExpression<Order> PremiumDiscount20Percent =>
        new AndExpression<Order>(PlatinumCustomer, HighValueOrder);
    
    public static IExpression<Order> StandardDiscount10Percent =>
        new AnyExpression<Order>([
            FirstTimeCustomer,
            HasVoucher("CODE2024"),
            new AndExpression<Order>(GoldCustomer, MediumValueOrder)
        ]);
}

// Rule Engine: apply rules và tính discount
public class DiscountEngine
{
    private readonly List<(IExpression<Order> Rule, decimal DiscountPercent, string Description)> _rules = [];

    public DiscountEngine AddRule(IExpression<Order> rule, decimal discountPercent, string description)
    {
        _rules.Add((rule, discountPercent, description));
        return this; // Fluent – Builder pattern
    }

    public DiscountResult CalculateDiscount(Order order)
    {
        var appliedDiscounts = _rules
            .Where(r => r.Rule.Evaluate(order))
            .Select(r => new AppliedDiscount(r.Description, r.DiscountPercent, r.Rule.Describe()))
            .ToList();
        
        // Take maximum discount (không cộng gộp)
        var totalDiscount = appliedDiscounts.Any()
            ? appliedDiscounts.Max(d => d.Percent)
            : 0;
        
        return new DiscountResult(totalDiscount, appliedDiscounts, order.Total * (1 - totalDiscount / 100));
    }
    
    // Hiển thị tất cả rules cho admin
    public void PrintRules()
    {
        foreach (var (rule, pct, desc) in _rules)
            Console.WriteLine($"  [{pct}% off] {desc}: {rule.Describe()}");
    }
}

// Setup rule engine
var engine = new DiscountEngine()
    .AddRule(OrderRules.PremiumDiscount20Percent, 20, "Premium Platinum discount")
    .AddRule(OrderRules.StandardDiscount10Percent, 10, "Standard promotion discount")
    .AddRule(OrderRules.FreeShippingEligible, 5, "Free shipping bonus");

// Test
var order1 = new Order(Guid.NewGuid(), "Platinum", 2_000_000, false, [], "standard");
var result1 = engine.CalculateDiscount(order1);
Console.WriteLine($"Order 1: {result1.DiscountPercent}% off → {result1.FinalAmount:N0}đ");
// "Order 1: 25% off → 1,500,000đ" (20% + 5% for free shipping)

var order2 = new Order(Guid.NewGuid(), "Silver", 300_000, true, ["CODE2024"], "express");
var result2 = engine.CalculateDiscount(order2);
Console.WriteLine($"Order 2: {result2.DiscountPercent}% off → {result2.FinalAmount:N0}đ");
// "Order 2: 10% off → 270,000đ"
```

---

## PHẦN 4 – LINQ EXPRESSION TREES (18:00 – 20:30)

> "LINQ Expression Trees là Interpreter Pattern tích hợp vào .NET:

```csharp
// EF Core Interpreter: translate C# lambda → SQL
Expression<Func<Order, bool>> filter = o => 
    o.CustomerTier == "Platinum" && o.Total >= 1_000_000;

// EF Core "interprets" expression tree và tạo SQL:
// WHERE CustomerTier = 'Platinum' AND Total >= 1000000

var orders = await context.Orders.Where(filter).ToListAsync();

// Bạn có thể build expression trees động:
var parameter = Expression.Parameter(typeof(Order), "o");
var tierProperty = Expression.Property(parameter, "CustomerTier");
var tierConstant = Expression.Constant("Platinum");
var tierEquals = Expression.Equal(tierProperty, tierConstant);

var dynamicFilter = Expression.Lambda<Func<Order, bool>>(tierEquals, parameter);
var results = context.Orders.Where(dynamicFilter);
// EF Core interpret dynamic expression → SQL giống hệt hardcoded lambda
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (20:30 – 22:00)

**✅ NÊN dùng khi:**
- Cần DSL cho business rules (pricing, access control, workflow conditions)
- Grammar đơn giản và ổn định
- Cần serialize/store/load rules từ database
- Non-technical users cần cấu hình logic

**❌ KHÔNG nên dùng khi:**
- Grammar phức tạp – dùng parser generator (ANTLR, Roslyn) thay thế
- Performance critical – đệ quy evaluate có overhead
- Grammar thay đổi thường xuyên – sửa nhiều classes

---

## PHẦN 6 – TỔNG KẾT TOÀN BỘ SERIES (22:00 – 24:00)

**[Màn hình: 23 pattern cards, fade in từng nhóm]**

> "**Chúc mừng! Bạn đã hoàn thành tất cả 23 GoF Design Patterns!**
>
> Nhìn lại hành trình 16 tuần:
>
> **Phase 1 – Nền Tảng:** Singleton, Factory Method, Builder, Adapter, Decorator, Facade, Strategy, Observer, Command, Chain of Responsibility. Đây là 10 patterns bạn sẽ dùng mỗi tuần.
>
> **Phase 2 – Mở Rộng:** Abstract Factory, Composite, Proxy, Mediator, State, Template Method. Patterns cho enterprise applications phức tạp.
>
> **Phase 3 – Bổ Sung:** Prototype, Bridge, Iterator. Ít dùng hơn nhưng essential khi gặp đúng vấn đề.
>
> **Phase 4 – Nâng Cao:** Flyweight (memory optimization), Memento (undo/redo), Visitor (operations trên hierarchy).
>
> **Phase 5 – Tổng Hợp:** Interpreter – điểm gặp gỡ của nhiều patterns.
>
> Điều quan trọng nhất không phải là nhớ tên patterns, mà là nhận ra VẤN ĐỀ mà mỗi pattern giải quyết. Khi thấy switch statement phình to → Strategy. Khi controller quá nhiều dependencies → Facade/Mediator. Khi cần undo → Command hoặc Memento.
>
> Design patterns là ngôn ngữ chung. Khi bạn nói 'tôi dùng Observer ở đây', team member hiểu ngay – loose coupling, event-driven, subject-observer. Không cần giải thích dài dòng.
>
> Cảm ơn bạn đã theo dõi series này. Hãy apply những gì học được vào dự án thực tế!"

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Rule engine chạy với 3-4 test cases, hiển thị Describe() |
| Demo | Dynamic LINQ expression tree |
| Đặc biệt | Bài tổng kết: overview 23 patterns, recap từng giai đoạn |
| Thumbnail | "23/23 COMPLETE" với tất cả pattern names |
