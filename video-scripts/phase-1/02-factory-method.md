# Bài 02 – Factory Method Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 1 | **Thứ tự:** 2/23  
**Thời lượng ước tính:** 24 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Code với switch/if-else dài tạo object]**

> "Hãy nhìn đoạn code này. Chúng ta có một service cần gửi thông báo – email, SMS, hoặc push notification tùy theo cấu hình.
>
> Và đây là cách viết *không* dùng Factory Method:"

```csharp
// ❌ Không dùng Factory Method
public async Task SendNotificationAsync(string type, string recipient, string message)
{
    if (type == "email")
    {
        var sender = new SmtpEmailSender(smtpConfig);  // hardcode concrete class
        await sender.SendAsync(recipient, message);
    }
    else if (type == "sms")
    {
        var sender = new TwilioSmsSender(twilioConfig); // hardcode concrete class
        await sender.SendAsync(recipient, message);
    }
    else if (type == "push")
    {
        // Thêm channel mới → phải SỬA method này
        var sender = new FirebasePushSender(firebaseConfig);
        await sender.SendAsync(recipient, message);
    }
}
```

> "Bạn thấy vấn đề chưa? Mỗi lần thêm kênh thông báo mới, bạn phải mở method này lên và sửa. Vi phạm Open/Closed Principle.
>
> Hôm nay chúng ta học cách dùng **Factory Method** để giải quyết vấn đề này – và nhận ra pattern này đã tồn tại khắp .NET từ lâu."

---

## PHẦN 2 – FACTORY METHOD LÀ GÌ? CONCEPT (2:30 – 7:00)

**[Màn hình: UML diagram]**

```
┌──────────────────┐         ┌──────────────────┐
│    Creator       │         │    Product       │
├──────────────────┤         ├──────────────────┤
│+FactoryMethod()  │────────▶│  <<interface>>   │
│+AnOperation()    │         └──────────────────┘
└──────────────────┘                  ▲
         ▲                            │
         │                    ┌───────────────┐
┌─────────────────┐           │ConcreteProduct│
│ConcreteCreator  │           └───────────────┘
├─────────────────┤
│+FactoryMethod() │──creates──▶ ConcreteProduct
└─────────────────┘
```

> "Factory Method có bốn thành phần:
>
> **Product interface** – Hợp đồng chung mà tất cả objects được tạo ra phải tuân theo. Ví dụ: `INotificationSender`.
>
> **Concrete Products** – Các implementation cụ thể: `SmtpEmailSender`, `TwilioSmsSender`.
>
> **Abstract Creator** – Class cha chứa factory method trừu tượng. Nó dùng Product nhưng không biết loại cụ thể nào.
>
> **Concrete Creators** – Override factory method để tạo ra loại Product cụ thể.
>
> **Điểm mấu chốt:** Client code làm việc hoàn toàn qua interface. Nó không bao giờ gọi `new SmtpEmailSender()` trực tiếp."

---

## PHẦN 3 – CODE WALKTHROUGH (7:00 – 18:00)

### Bước 1: Product Interface (7:00 – 9:00)

**[Màn hình: Code, tập trung vào interface]**

```csharp
// INotificationSender là "sản phẩm" mà factory sẽ tạo ra
// Client chỉ làm việc qua interface này
public interface INotificationSender
{
    Task SendAsync(string recipient, string subject, string body, CancellationToken ct);
}
```

> "Đây là hợp đồng. Tất cả senders – dù là Email, SMS, hay Zalo – đều phải implement interface này. Client code chỉ biết `INotificationSender`, không biết class cụ thể nào đằng sau."

### Bước 2: Abstract Creator (9:00 – 11:30)

```csharp
// NotificationFactory: class cha – biết CÁCH xử lý nhưng không biết TẠO gì
public abstract class NotificationFactory
{
    // ← ĐÂY là Factory Method: abstract, buộc subclass phải implement
    public abstract INotificationSender CreateSender();

    // Template method: dùng factory method để lấy sender rồi gửi
    // NotifyAsync KHÔNG biết đang dùng Email hay SMS
    public async Task NotifyAsync(
        string recipient, string subject, string body, CancellationToken ct)
    {
        var sender = CreateSender();  // Gọi factory method → subclass quyết định
        await sender.SendAsync(recipient, subject, body, ct);
    }
}
```

> "Nhìn vào `NotifyAsync`. Method này hoàn toàn không biết đang gửi Email hay SMS. Nó chỉ gọi `CreateSender()` – một factory method trừu tượng – và dùng kết quả qua interface.
>
> Đây là tách biệt hoàn toàn giữa *việc tạo object* và *việc sử dụng object*."

### Bước 3: Concrete Creators (11:30 – 14:00)

```csharp
// EmailNotificationFactory "biết" rằng nó tạo SmtpEmailSender
// Nhưng client chỉ tương tác với NotificationFactory
public class EmailNotificationFactory(IOptions<EmailSettings> settings)
    : NotificationFactory
{
    public override INotificationSender CreateSender()
        => new SmtpEmailSender(settings.Value);
}

// SmsNotificationFactory tạo ra loại sender khác
// Thêm kênh mới (Zalo, Slack)? Thêm class mới, KHÔNG sửa code cũ
public class SmsNotificationFactory(IOptions<TwilioSettings> settings)
    : NotificationFactory
{
    public override INotificationSender CreateSender()
        => new TwilioSmsSender(settings.Value);
}
```

> "Hai Concrete Creators, mỗi cái override `CreateSender()` theo cách riêng. Thêm kênh Zalo? Tạo `ZaloNotificationFactory` kế thừa `NotificationFactory`, override `CreateSender()` trả về `ZaloSender`. Không chạm vào code cũ."

### Bước 4: DI Registration và cách dùng (14:00 – 18:00)

```csharp
// Program.cs – đăng ký các factories với keyed services (.NET 8)
builder.Services.AddKeyedSingleton<NotificationFactory, EmailNotificationFactory>("email");
builder.Services.AddKeyedSingleton<NotificationFactory, SmsNotificationFactory>("sms");

// Service dùng factory qua DI
public class AlertService(
    [FromKeyedServices("sms")] NotificationFactory factory)
{
    public async Task SendAlertAsync(string phone, string message, CancellationToken ct)
    {
        // AlertService không biết TwilioSmsSender tồn tại
        await factory.NotifyAsync(phone, "Alert", message, ct);
    }
}
```

> "Với Keyed Services trong .NET 8, bạn có thể đăng ký nhiều implementation của cùng interface và inject theo tên. `AlertService` yêu cầu factory có key `sms` – nó nhận `SmsNotificationFactory` nhưng không biết điều đó."

---

## PHẦN 4 – VÍ DỤ THỰC TẾ: IHttpClientFactory (18:00 – 21:00)

**[Màn hình: ASP.NET Core code]**

> "Factory Method đã được build vào .NET. `IHttpClientFactory` là ví dụ hoàn hảo."

```csharp
// Program.cs – "đăng ký factory products"
builder.Services.AddHttpClient("OrderService", client =>
{
    client.BaseAddress = new Uri("https://orders.api.com");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddHttpClient("InventoryService", client =>
{
    client.BaseAddress = new Uri("https://inventory.api.com");
    client.Timeout = TimeSpan.FromSeconds(10);
});

// Client code dùng factory
public class OrderApiClient(IHttpClientFactory httpClientFactory)
{
    // CreateClient("OrderService") là factory method call
    // Framework quyết định tạo/reuse HttpClient như thế nào
    private readonly HttpClient _client = httpClientFactory.CreateClient("OrderService");
}
```

> "Bạn không tự `new HttpClient()`. Bạn gọi `httpClientFactory.CreateClient(\"OrderService\")` – đây chính là factory method. Framework quản lý lifecycle, connection pooling, retry policies – bạn chỉ cần dùng kết quả qua interface `HttpClient`.
>
> Tương tự: `ILoggerFactory.CreateLogger<T>()`, `DbProviderFactory.CreateConnection()`, `StreamReader` và `StreamWriter` factories – tất cả là Factory Method."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (21:00 – 23:00)

**✅ NÊN dùng khi:**
- Không biết trước loại object cần tạo – quyết định tại runtime theo config hoặc input
- Muốn cung cấp extension points cho library – cho phép người dùng inject custom implementations
- Constructor quá phức tạp và cần encapsulate creation logic
- Muốn reuse existing objects thay vì luôn tạo mới (như `IHttpClientFactory` pooling)

**❌ KHÔNG nên dùng khi:**
- Chỉ có một concrete implementation duy nhất – over-engineering
- Creation logic đơn giản và không bao giờ thay đổi
- Performance-critical path và overhead của virtual method dispatch là vấn đề

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (23:00 – 24:00)

> "Factory Method giải quyết câu hỏi: ai chịu trách nhiệm tạo object?
>
> Câu trả lời: không phải client – mà là một Creator chuyên biệt. Client chỉ làm việc với interface.
>
> Ba điều nhớ:
> 1. Factory Method là abstract method trả về interface, subclass override để tạo concrete class
> 2. Client code không bao giờ biết class cụ thể được tạo ra
> 3. `IHttpClientFactory`, `ILoggerFactory` – Factory Method đã có sẵn, hãy dùng chúng
>
> Bài tiếp theo: **Builder Pattern** – khi object của bạn cần 10 parameters trong constructor, đó là dấu hiệu cần Builder. `WebApplicationBuilder`, `StringBuilder`, `EF Core ModelBuilder` – tất cả là Builder."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo trực tiếp | Thêm ZaloNotificationFactory mà không sửa code cũ |
| Animation | Mũi tên từ ConcreteCreator → tạo ra ConcreteProduct → Client nhận Interface |
| Điểm nhấn | So sánh before/after: if-else chain vs Factory Method |
| Thumbnail | Hình nhà máy với nhiều loại sản phẩm ra cùng một băng chuyền |
