# Bài 17 – Prototype Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 3 – Bổ Sung | **Tuần:** 8 | **Thứ tự:** 17/23  
**Thời lượng ước tính:** 19 phút  
**Độ ưu tiên:** ⭐ Thấp-Trung

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: Object phức tạp với constructor tốn kém]**

> "Bạn có một object `ReportTemplate` tốn 500ms để khởi tạo vì phải đọc config, kết nối database, và parse XML template. Và bạn cần tạo 100 instances của nó với các giá trị được customize nhẹ.
>
> Giải pháp ngây thơ: gọi constructor 100 lần → 50 giây.
>
> Giải pháp đúng: tạo một instance, clone nó 100 lần, customize từng clone. Clone rẻ hơn construct từ đầu.
>
> **Prototype Pattern** cho phép clone objects mà không cần biết class cụ thể của chúng."

---

## PHẦN 2 – PROTOTYPE LÀ GÌ? CONCEPT (2:00 – 5:00)

```
IPrototype<T>
    └── Clone(): T

┌──────────────────┐
│   ReportTemplate │
├──────────────────┤
│ + Clone()        │ → tạo bản sao của chính mình
│ + Customize(...)  │ → chỉnh sửa bản sao
└──────────────────┘
```

> "Hai loại clone:
>
> **Shallow Clone:** Copy các fields trực tiếp. Reference types (List, object) được SHARE – cả original và clone trỏ đến cùng object. `MemberwiseClone()` trong C#.
>
> **Deep Clone:** Copy mọi thứ đệ quy. Clone có instance riêng của mọi nested object. Tốn kém hơn nhưng hoàn toàn độc lập.
>
> Biết khi nào cần shallow vs deep clone là key takeaway của bài này."

---

## PHẦN 3 – CODE WALKTHROUGH (5:00 – 14:00)

### Bước 1: Shallow Clone với MemberwiseClone (5:00 – 8:00)

```csharp
// ICloneable (built-in .NET) – khá cơ bản
// Prototype interface tự define thường tốt hơn vì type-safe
public interface IDeepCloneable<T>
{
    T Clone();
}

public class Address
{
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class Employee : IDeepCloneable<Employee>
{
    public string Name { get; set; } = string.Empty;
    public decimal Salary { get; set; }
    public Address Address { get; set; } = new();
    public List<string> Skills { get; set; } = [];

    // SHALLOW Clone: Address và Skills được SHARE (nguy hiểm!)
    public Employee ShallowClone() => (Employee)MemberwiseClone();

    // DEEP Clone: tất cả nested objects được copy độc lập
    public Employee Clone()
    {
        return new Employee
        {
            Name = Name,
            Salary = Salary,
            // Clone Address mới hoàn toàn – thay đổi clone không ảnh hưởng original
            Address = new Address 
            { 
                Street = Address.Street, 
                City = Address.City, 
                Country = Address.Country 
            },
            // Clone List mới với cùng elements (strings là immutable → ok)
            Skills = [..Skills]  // Collection expression copy
        };
    }
}

// Demo tại sao Shallow Clone nguy hiểm:
var original = new Employee 
{ 
    Name = "Alice", 
    Salary = 50_000, 
    Address = new Address { City = "Hà Nội" },
    Skills = ["C#", "SQL"]
};

var shallow = original.ShallowClone();
shallow.Name = "Bob";         // OK – string là immutable
shallow.Address.City = "TP HCM"; // NGUY HIỂM! Sửa shared Address
// original.Address.City bây giờ cũng là "TP HCM"!

var deep = original.Clone();
deep.Address.City = "Đà Nẵng"; // Safe – Address là instance riêng
// original.Address.City vẫn là "Hà Nội"
```

### Bước 2: JSON Serialization Clone – cách dễ nhất (8:00 – 10:30)

```csharp
// Cách hiện đại: serialize rồi deserialize = deep clone hoàn hảo
public static class CloneExtensions
{
    public static T DeepClone<T>(this T source) where T : notnull
    {
        // System.Text.Json – không cần thư viện bên ngoài
        var json = JsonSerializer.Serialize(source);
        return JsonSerializer.Deserialize<T>(json)!;
    }
}

// Sử dụng
var original = new ReportTemplate { /* ... complex setup */ };
var clone = original.DeepClone();
clone.Title = "Copy of " + original.Title;

// Lưu ý: các fields không serialize được sẽ bị mất trong clone
// Phù hợp nhất cho DTOs và data objects
```

### Bước 3: Prototype Registry – Template System (10:30 – 14:00)

```csharp
// Prototype Registry: lưu trữ các "nguyên mẫu" và clone theo yêu cầu
public class ReportTemplate
{
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<ReportColumn> Columns { get; set; } = [];
    public ReportStyling Styling { get; set; } = new();
    public Dictionary<string, string> Parameters { get; set; } = [];

    // Clone với customization
    public ReportTemplate CloneWithTitle(string newTitle)
    {
        var clone = this.DeepClone();
        clone.Title = newTitle;
        return clone;
    }

    public ReportTemplate CloneWithColumns(IEnumerable<ReportColumn> columns)
    {
        var clone = this.DeepClone();
        clone.Columns = [..columns];
        return clone;
    }
}

// Registry: lưu các template prototypes
public class ReportTemplateRegistry
{
    private readonly Dictionary<string, ReportTemplate> _prototypes = new();

    public void Register(string key, ReportTemplate prototype)
        => _prototypes[key] = prototype;

    // Clone và trả về – không trả original
    public ReportTemplate Get(string key)
    {
        if (!_prototypes.TryGetValue(key, out var prototype))
            throw new KeyNotFoundException($"Template '{key}' not found");
        return prototype.DeepClone(); // Luôn clone – không bao giờ trả original
    }
}

// Setup
var registry = new ReportTemplateRegistry();

// Tạo prototypes tốn kém MỘT LẦN
var salesTemplate = new ReportTemplate
{
    Name = "SalesReport",
    Title = "Sales Report",
    Columns = [new("Date"), new("Product"), new("Amount"), new("Region")],
    Styling = new ReportStyling { PrimaryColor = "#003366", Font = "Arial" },
    Parameters = { ["currency"] = "VND", ["dateFormat"] = "dd/MM/yyyy" }
};
registry.Register("sales", salesTemplate);

// Sử dụng: clone nhanh, customize
var q1Report = registry.Get("sales")
    .CloneWithTitle("Q1 2024 Sales Report");

var q2Report = registry.Get("sales")
    .CloneWithTitle("Q2 2024 Sales Report");
// Cả hai xuất phát từ cùng prototype, hoàn toàn độc lập
```

---

## PHẦN 4 – VÍ DỤ .NET: RECORD COPY (14:00 – 16:30)

```csharp
// C# record: 'with' expression = shallow clone + override
public record ProductDto(
    Guid Id, 
    string Name, 
    decimal Price, 
    bool InStock, 
    string Category);

var original = new ProductDto(
    Guid.NewGuid(), "Laptop", 25_000_000, true, "Electronics");

// 'with' expression: clone với một vài thay đổi – Prototype Pattern built-in!
var discounted = original with { Price = 22_000_000 };
var outOfStock = original with { InStock = false };
var renamed = original with { Name = "Gaming Laptop", Price = 30_000_000 };

// 'with' chỉ làm shallow clone
// Với records chứa reference types, vẫn cần cẩn thận
public record OrderDto(Guid Id, List<OrderItemDto> Items);
var order1 = new OrderDto(Guid.NewGuid(), new List<OrderItemDto> { new("Laptop", 1) });
var order2 = order1 with { Id = Guid.NewGuid() };
// DANGER: order2.Items là CÙNG LIST với order1.Items!
order2.Items.Add(new("Mouse", 1)); // order1.Items cũng bị thêm!
```

> "`with` expression trong C# records là Prototype Pattern ngắn gọn nhất. Nhưng phải nhớ: nó là shallow clone. Với reference types bên trong record, cần clone thủ công."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (16:30 – 18:00)

**✅ NÊN dùng khi:**
- Khởi tạo object tốn kém và cần nhiều bản sao tương tự
- Cần copy object mà không biết class cụ thể (polymorphism)
- Nhiều objects chỉ khác nhau nhẹ ở một vài fields

**❌ KHÔNG nên dùng khi:**
- Objects đơn giản và constructor nhanh
- Circular references – deep clone sẽ tạo infinite recursion
- Cần track số lượng instances (Singleton)

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (18:00 – 19:00)

> "Prototype: clone thay vì construct từ đầu.
>
> Ba điều nhớ:
> 1. Shallow clone (MemberwiseClone) chia sẻ reference types – nguy hiểm nếu clone được sửa
> 2. Deep clone an toàn nhất = JSON serialize/deserialize, hoặc manual copy
> 3. C# `record with {}` là Prototype Pattern built-in – shallow clone
>
> Bài tiếp theo: **Bridge Pattern** – tách abstraction khỏi implementation. Cả hai có thể thay đổi độc lập. Ví dụ: UI controls (abstraction) và rendering engine (implementation) có thể swap độc lập."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Shallow vs Deep clone – minh họa bằng Address shared reference |
| Demo | C# record 'with' expression – prototype pattern built-in |
| Điểm nhấn | JSON clone trick – production-ready, không cần implement thủ công |
