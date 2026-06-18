# Bài 12 – Composite Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 2 – Mở Rộng | **Tuần:** 5 | **Thứ tự:** 12/23  
**Thời lượng ước tính:** 20 phút  
**Độ ưu tiên:** ⭐⭐ Trung Bình

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: File system tree structure]**

> "Folder chứa files và folders khác. Sub-folder cũng chứa files và folders. Khi bạn muốn tính tổng dung lượng của một folder, bạn phải đệ quy qua tất cả con của nó.
>
> Nếu xử lý File và Folder bằng code khác nhau, bạn sẽ có vô số `if (item is Folder)` rải rác.
>
> **Composite Pattern** giải quyết: File và Folder đều implement cùng một interface. Client xử lý chúng giống hệt nhau – không cần biết đang làm việc với leaf hay container."

---

## PHẦN 2 – COMPOSITE LÀ GÌ? CONCEPT (2:00 – 5:30)

```
IFileSystemItem
       ▲
  ┌────┴────┐
File       Folder
           ├── File
           ├── File
           └── Folder
                └── File
```

> "Ba thành phần:
>
> **Component interface** – `IFileSystemItem` với `GetSize()`, `Display()`. Cả File lẫn Folder đều implement.
>
> **Leaf** – `File`: không có children, trả về size trực tiếp.
>
> **Composite** – `Folder`: chứa danh sách children `IFileSystemItem`, delegate `GetSize()` xuống từng child và cộng lại.
>
> Client code dùng `IFileSystemItem` – không biết đang làm việc với leaf hay composite."

---

## PHẦN 3 – CODE WALKTHROUGH (5:30 – 15:00)

### Bước 1: Component Interface (5:30 – 7:00)

```csharp
// Component: interface chung cho cả File và Folder
public interface IFileSystemItem
{
    string Name { get; }
    long GetSize();
    void Display(int depth = 0);  // depth: indent level khi hiển thị
    IFileSystemItem? Parent { get; set; }
}
```

### Bước 2: Leaf – File (7:00 – 9:00)

```csharp
// Leaf: không có children, biết size của chính mình
public class FileItem(string name, long sizeInBytes) : IFileSystemItem
{
    public string Name { get; } = name;
    public IFileSystemItem? Parent { get; set; }
    
    // Leaf: trả về size trực tiếp, không đệ quy
    public long GetSize() => sizeInBytes;
    
    public void Display(int depth = 0)
        => Console.WriteLine($"{new string(' ', depth * 2)}📄 {Name} ({sizeInBytes:N0} bytes)");
}
```

### Bước 3: Composite – Folder (9:00 – 13:00)

```csharp
// Composite: chứa danh sách IFileSystemItem (có thể là File hoặc Folder khác)
public class FolderItem(string name) : IFileSystemItem
{
    public string Name { get; } = name;
    public IFileSystemItem? Parent { get; set; }
    
    // Children: mix của Files và sub-Folders
    private readonly List<IFileSystemItem> _children = [];

    public void Add(IFileSystemItem item)
    {
        item.Parent = this;
        _children.Add(item);
    }

    public void Remove(IFileSystemItem item)
    {
        item.Parent = null;
        _children.Remove(item);
    }

    // GetSize(): đệ quy qua tất cả children, cộng sizes lại
    // File trả về sizeInBytes, Folder gọi GetSize() đệ quy → tự nhiên, không cần if/else
    public long GetSize() => _children.Sum(child => child.GetSize());

    public void Display(int depth = 0)
    {
        Console.WriteLine($"{new string(' ', depth * 2)}📁 {Name} ({GetSize():N0} bytes)");
        // Đệ quy: mỗi child tự Display với depth+1
        foreach (var child in _children)
            child.Display(depth + 1);
    }
}

// Sử dụng:
var root = new FolderItem("Documents");
var photos = new FolderItem("Photos");
photos.Add(new FileItem("vacation.jpg", 3_500_000));
photos.Add(new FileItem("birthday.png", 2_100_000));

var docs = new FolderItem("Work");
docs.Add(new FileItem("report.docx", 250_000));
docs.Add(new FileItem("presentation.pptx", 8_000_000));

root.Add(photos);
root.Add(docs);
root.Add(new FileItem("notes.txt", 15_000));

root.Display();
// Output:
// 📁 Documents (13,865,000 bytes)
//   📁 Photos (5,600,000 bytes)
//     📄 vacation.jpg (3,500,000 bytes)
//     📄 birthday.png (2,100,000 bytes)
//   📁 Work (8,250,000 bytes)
//     📄 report.docx (250,000 bytes)
//     📄 presentation.pptx (8,000,000 bytes)
//   📄 notes.txt (15,000 bytes)
```

### Bước 4: Menu System thực tế (13:00 – 15:00)

```csharp
// Composite cho navigation menu – use case rất phổ biến
public interface IMenuItem
{
    string Title { get; }
    string? Url { get; }
    bool IsEnabled(string userRole);
    IEnumerable<IMenuItem> GetChildren();
}

public class MenuItem(string title, string url, string[] allowedRoles) : IMenuItem
{
    public string Title => title;
    public string? Url => url;
    public bool IsEnabled(string userRole) => allowedRoles.Contains(userRole);
    public IEnumerable<IMenuItem> GetChildren() => [];  // Leaf: không có children
}

public class MenuGroup(string title, string[] allowedRoles) : IMenuItem
{
    private readonly List<IMenuItem> _items = [];
    public string Title => title;
    public string? Url => null;  // Group không có URL
    
    public bool IsEnabled(string userRole) 
        => allowedRoles.Contains(userRole) && _items.Any(i => i.IsEnabled(userRole));
    
    public IEnumerable<IMenuItem> GetChildren() => _items;
    public void Add(IMenuItem item) => _items.Add(item);
}
```

---

## PHẦN 4 – VÍ DỤ .NET: EXPRESSION TREES (15:00 – 17:30)

> "LINQ Expression Trees trong .NET là Composite Pattern:
>
> - `BinaryExpression`: Composite – chứa Left và Right expressions
> - `ConstantExpression`, `ParameterExpression`: Leaf nodes
>
> Khi EF Core translate `Where(x => x.Price > 100 && x.InStock)` sang SQL, nó walk qua Expression Tree đệ quy – Composite pattern."

```csharp
// Expression tree thủ công (minh họa pattern):
// x => x.Price > 100 && x.InStock

var parameter = Expression.Parameter(typeof(Product), "x");

// Leaf: x.Price và 100
var priceProperty = Expression.Property(parameter, "Price");
var priceConstant = Expression.Constant(100m);

// Composite: x.Price > 100
var priceGreaterThan = Expression.GreaterThan(priceProperty, priceConstant);

// Leaf: x.InStock
var inStockProperty = Expression.Property(parameter, "InStock");

// Composite bao Composite: (x.Price > 100) && (x.InStock)
var combined = Expression.AndAlso(priceGreaterThan, inStockProperty);

var lambda = Expression.Lambda<Func<Product, bool>>(combined, parameter);
// EF Core nhận lambda này và đệ quy qua tree để tạo SQL
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (17:30 – 19:00)

**✅ NÊN dùng khi:**
- Cấu trúc cây: file system, menu, category tree, org chart
- Cần xử lý item đơn lẻ và nhóm items theo cùng một cách
- Client không cần biết đang làm việc với leaf hay container

**❌ KHÔNG nên dùng khi:**
- Cấu trúc phẳng, không có hierarchy
- Leaf và Composite có quá ít điểm chung để tạo interface
- Performance critical – đệ quy trên cây lớn có thể tốn kém

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (19:00 – 20:00)

> "Composite: Leaf và Container implement cùng interface. Container đệ quy qua children.
>
> Ba điều nhớ:
> 1. Component interface: cả Leaf lẫn Composite phải implement
> 2. Composite.GetSize() = sum của children.GetSize() – đệ quy tự nhiên
> 3. Expression Trees trong LINQ là Composite – đã built-in vào .NET
>
> Bài tiếp theo: **Proxy Pattern** – một object đứng trước object thực và kiểm soát truy cập. Khác Decorator ở mục đích: Decorator thêm behavior, Proxy kiểm soát access (authentication, lazy loading, remote proxy)."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Console app file system tree, gọi Display() và GetSize() |
| Visual | Tree diagram với Leaf và Composite nodes |
| Điểm nhấn | Không có `if (item is Folder)` trong client code |
