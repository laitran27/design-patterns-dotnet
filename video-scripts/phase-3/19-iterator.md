# Bài 19 – Iterator Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 3 – Bổ Sung | **Tuần:** 10 | **Thứ tự:** 19/23  
**Thời lượng ước tính:** 18 phút  
**Độ ưu tiên:** ⭐ Thấp-Trung

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: foreach loop và câu hỏi nó hoạt động thế nào]**

> "Câu hỏi: tại sao `foreach` hoạt động được với List, Array, Dictionary, Stack, Queue, DbSet, Channel... tất cả đều khác nhau về internal structure?
>
> Câu trả lời: **Iterator Pattern**. Tất cả chúng implement `IEnumerable<T>`, trả về `IEnumerator<T>` – Iterator.
>
> Iterator cung cấp một cách duyệt qua collection mà không cần biết internal structure. Client code dùng `foreach` – không quan tâm đến array index, linked list pointer, hay B-tree traversal.
>
> Đây là pattern đã built-in hoàn toàn vào C# từ version 1.0."

---

## PHẦN 2 – ITERATOR LÀ GÌ? CONCEPT (2:00 – 5:00)

```
IEnumerable<T>          IEnumerator<T>
└── GetEnumerator()  →  ├── Current: T
                        ├── MoveNext(): bool
                        └── Reset()

foreach (var item in collection)
// C# compiler translates to:
var enumerator = collection.GetEnumerator();
while (enumerator.MoveNext())
{
    var item = enumerator.Current;
    // ... loop body
}
```

> "Iterator tách *duyệt* khỏi *collection*. Collection biết cách lưu trữ. Iterator biết cách duyệt.
>
> C# `yield return` là cú pháp cho phép viết Iterator như regular method – compiler tự tạo state machine."

---

## PHẦN 3 – CODE WALKTHROUGH (5:00 – 13:00)

### Bước 1: Custom Iterator – Paginated DB Query (5:00 – 8:30)

```csharp
// Scenario: Duyệt qua hàng triệu records từ DB theo từng page
// Không load tất cả vào memory – Stream data

public class PaginatedDbIterator<T>(
    Func<int, int, CancellationToken, Task<IEnumerable<T>>> pageLoader,
    int pageSize = 100) : IAsyncEnumerable<T>
{
    // GetAsyncEnumerator: trả về async enumerator
    public async IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken ct = default)
    {
        var page = 1;
        bool hasMore;
        
        do
        {
            var items = await pageLoader(page, pageSize, ct);
            var itemList = items.ToList();
            hasMore = itemList.Count == pageSize;
            
            // yield return: trả từng item – không load trang tiếp theo cho đến khi cần
            foreach (var item in itemList)
                yield return item;  // ← Iterator magic: trả item, dừng lại, tiếp tục khi được gọi MoveNextAsync
            
            page++;
        } while (hasMore && !ct.IsCancellationRequested);
    }
}

// Sử dụng – duyệt qua 1 triệu records mà không cần 1GB RAM
var iterator = new PaginatedDbIterator<Order>(
    (page, size, ct) => orderRepo.GetPageAsync(page, size, ct),
    pageSize: 500);

await foreach (var order in iterator)
{
    await ProcessOrderAsync(order); // Xử lý từng order, chỉ 500 orders trong memory tại một thời điểm
}
```

### Bước 2: yield return – Iterator State Machine (8:30 – 11:00)

```csharp
// C# compiler tạo state machine từ yield return
// Mỗi yield return = một điểm dừng của iterator

// Custom Fibonacci Iterator
public static IEnumerable<long> FibonacciSequence(int count)
{
    long a = 0, b = 1;
    for (int i = 0; i < count; i++)
    {
        yield return a;      // ← Trả giá trị, STATE được lưu lại
        (a, b) = (b, a + b); // Tiếp tục từ đây khi MoveNext() được gọi
    }
}

// Tree traversal Iterator
public static IEnumerable<T> TraverseInOrder<T>(TreeNode<T>? node) where T : IComparable<T>
{
    if (node == null) yield break;          // ← yield break: kết thúc iteration
    
    foreach (var left in TraverseInOrder(node.Left))
        yield return left;                  // ← Yield từng node trái
    
    yield return node.Value;               // ← Yield node hiện tại
    
    foreach (var right in TraverseInOrder(node.Right))
        yield return right;                // ← Yield từng node phải
}

// Lazy evaluation: chỉ compute khi cần
var fibs = FibonacciSequence(1_000_000);   // Chưa compute gì!
var first10 = fibs.Take(10).ToList();      // Chỉ compute 10 numbers đầu tiên
```

### Bước 3: IAsyncEnumerable – Streaming từ HTTP/DB (11:00 – 13:00)

```csharp
// IAsyncEnumerable<T>: stream data bất đồng bộ – .NET Core 3.0+
// Thay vì trả List<T> (load hết), stream từng item khi có

[HttpGet("large-export")]
public async IAsyncEnumerable<OrderDto> ExportOrders(
    [FromQuery] DateTime from, 
    [FromQuery] DateTime to,
    [EnumeratorCancellation] CancellationToken ct)
{
    // Không load tất cả orders vào memory – stream từ DB
    await foreach (var order in orderRepo.GetByDateRangeAsync(from, to, ct))
    {
        yield return new OrderDto(order.Id, order.Total, order.Status);
        // HTTP response: mỗi item được gửi ngay khi có – không chờ tất cả xong
    }
}

// Repository với IAsyncEnumerable
public async IAsyncEnumerable<Order> GetByDateRangeAsync(
    DateTime from, DateTime to,
    [EnumeratorCancellation] CancellationToken ct)
{
    // EF Core 3+ hỗ trợ streaming với AsAsyncEnumerable()
    await foreach (var order in context.Orders
        .Where(o => o.CreatedAt >= from && o.CreatedAt <= to)
        .AsAsyncEnumerable()
        .WithCancellation(ct))
    {
        yield return order;
    }
}
```

---

## PHẦN 4 – LINQ LÀ ITERATOR (13:00 – 15:30)

> "LINQ là Iterator Pattern ở mọi nơi.

```csharp
var orders = context.Orders              // IQueryable<Order>
    .Where(o => o.Total > 100_000)        // IQueryable<Order> – chưa execute query!
    .OrderByDescending(o => o.CreatedAt) // IQueryable<Order> – vẫn chưa execute
    .Select(o => new OrderDto(o.Id, o.Total)); // IQueryable<OrderDto> – vẫn chưa!

// Iterator được "reset" mỗi lần foreach – deferred execution
foreach (var dto in orders)  // ← ĐÂY mới thực sự execute SQL query
    Console.WriteLine(dto.Total);

// ToList(): materialize iterator ngay lập tức
var list = orders.ToList(); // Chạy SQL và load tất cả vào List<OrderDto>
```

> "Deferred execution là superpower của Iterator trong LINQ: bạn build query plan mà không execute. Execute chỉ khi iterate. Điều này cho phép EF Core translate LINQ → SQL một lần, không execute nhiều queries."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (15:30 – 17:00)

**✅ NÊN dùng khi:**
- Duyệt large dataset không cần load tất cả vào memory (`yield return`, `IAsyncEnumerable`)
- Cần abstract cách duyệt khỏi internal structure của collection
- Lazy evaluation: chỉ compute khi cần

**❌ KHÔNG nên dùng khi:**
- Collection nhỏ, đơn giản – dùng `List<T>` và `foreach` thông thường
- Cần random access (index-based) – Iterator chỉ hỗ trợ sequential access
- Cần duyệt nhiều lần đồng thời (Iterator không thread-safe mặc định)

---

## PHẦN 6 – TÓM TẮT PHASE 3 & PREVIEW PHASE 4 (17:00 – 18:00)

> "Iterator: duyệt collection mà không cần biết internal structure.
>
> Ba điều nhớ:
> 1. `foreach` là Iterator Pattern – C# compiler tạo code `GetEnumerator()`, `MoveNext()`, `Current`
> 2. `yield return` = lazy iterator – không compute cho đến khi iterate
> 3. `IAsyncEnumerable<T>` = streaming async – hàng triệu records, không 1GB RAM
>
> **Phase 3 hoàn thành!** Chuyển sang Phase 4 – Nâng cao với **Flyweight**: khi bạn có hàng nghìn objects similar nhau, Flyweight chia sẻ shared state để tiết kiệm memory."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | PaginatedDbIterator với SQL logging – thấy query được gọi từng page |
| Demo | IAsyncEnumerable streaming trong Swagger – response stream realtime |
| Điểm nhấn | LINQ deferred execution: build query vs execute query |
