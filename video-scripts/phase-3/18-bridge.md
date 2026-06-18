# Bài 18 – Bridge Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 3 – Bổ Sung | **Tuần:** 9 | **Thứ tự:** 18/23  
**Thời lượng ước tính:** 20 phút  
**Độ ưu tiên:** ⭐ Thấp-Trung

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: Class explosion với inheritance]**

> "Bạn có một notification system với hai chiều thay đổi:
> - **Kênh:** Email, SMS, Push Notification
> - **Loại thông báo:** Alert, Report, Reminder
>
> Nếu dùng inheritance: AlertEmail, AlertSMS, AlertPush, ReportEmail, ReportSMS, ReportPush, ReminderEmail... **9 classes** cho 3×3.
>
> Thêm kênh Slack: 3 classes mới. Thêm loại PromotionNotification: 4 classes mới.
>
> Với Bridge: **3 + 3 = 6 classes** thay vì 9. Thêm Slack: 1 class. Thêm PromotionNotification: 1 class.
>
> Bridge tách hai chiều thay đổi thành hai class hierarchies độc lập."

---

## PHẦN 2 – BRIDGE LÀ GÌ? CONCEPT (2:00 – 5:30)

```
KHÔNG có Bridge (inheritance):
AlertEmail, AlertSMS, AlertPush
ReportEmail, ReportSMS, ReportPush
ReminderEmail, ReminderSMS, ReminderPush
→ M×N classes

CÓ Bridge (composition):
Notification (Abstraction)
├── AlertNotification
├── ReportNotification
└── ReminderNotification
        │ has-a (bridge)
        ▼
IMessageChannel (Implementation)
├── EmailChannel
├── SmsChannel
└── PushChannel
→ M + N classes
```

> "Bridge: Abstraction HAS-A Implementation reference. Khác Adapter (giải quyết incompatibility), Bridge được thiết kế ngay từ đầu để tách hai dimensions.
>
> Key insight: **composition over inheritance** – Notification không kế thừa EmailChannel, nó *có* reference đến IMessageChannel."

---

## PHẦN 3 – CODE WALKTHROUGH (5:30 – 14:30)

### Bước 1: Implementation Hierarchy (5:30 – 8:00)

```csharp
// Implementation Interface: kênh gửi thông báo
public interface IMessageChannel
{
    Task SendAsync(string recipient, string subject, string body, CancellationToken ct);
    string ChannelName { get; }
    bool SupportsHtml { get; }
}

// Concrete Implementations
public class EmailChannel(ISmtpClient smtpClient) : IMessageChannel
{
    public string ChannelName => "Email";
    public bool SupportsHtml => true;  // Email hỗ trợ HTML
    
    public async Task SendAsync(string recipient, string subject, string body, CancellationToken ct)
        => await smtpClient.SendAsync(new MailMessage(
            "noreply@company.com", recipient, subject, body) { IsBodyHtml = SupportsHtml }, ct);
}

public class SmsChannel(ITwilioClient twilioClient) : IMessageChannel
{
    public string ChannelName => "SMS";
    public bool SupportsHtml => false;  // SMS chỉ hỗ trợ plain text
    
    public async Task SendAsync(string recipient, string subject, string body, CancellationToken ct)
    {
        // SMS: không có subject, body bị truncate nếu quá dài
        var smsBody = body.Length > 160 ? body[..157] + "..." : body;
        await twilioClient.Messages.CreateAsync(new(recipient, "...", smsBody));
    }
}

public class SlackChannel(ISlackClient slackClient) : IMessageChannel
{
    public string ChannelName => "Slack";
    public bool SupportsHtml => false;  // Slack dùng markdown, không phải HTML
    
    public async Task SendAsync(string recipient, string subject, string body, CancellationToken ct)
        => await slackClient.PostMessageAsync(recipient, $"*{subject}*\n{body}", ct);
}
```

### Bước 2: Abstraction Hierarchy (8:00 – 12:30)

```csharp
// Abstraction Base: giữ reference đến Implementation (bridge)
public abstract class Notification(IMessageChannel channel)
{
    // Bridge: Abstraction → Implementation
    protected readonly IMessageChannel Channel = channel;

    // Template method: subclasses define content, base sends via channel
    public async Task SendAsync(NotificationData data, CancellationToken ct)
    {
        var (subject, body) = FormatContent(data, Channel.SupportsHtml);
        await Channel.SendAsync(data.Recipient, subject, body, ct);
    }

    // Abstract: subclasses định nghĩa format content
    protected abstract (string Subject, string Body) FormatContent(
        NotificationData data, bool supportsHtml);
}

// Refined Abstractions: mỗi loại thông báo có format riêng
public class AlertNotification(IMessageChannel channel) : Notification(channel)
{
    protected override (string Subject, string Body) FormatContent(
        NotificationData data, bool supportsHtml)
    {
        var subject = $"🚨 ALERT: {data.Title}";
        var body = supportsHtml
            ? $"<div style='color:red'><h2>{data.Title}</h2><p>{data.Message}</p><p>Time: {DateTime.UtcNow}</p></div>"
            : $"ALERT: {data.Title}\n{data.Message}\nTime: {DateTime.UtcNow}";
        return (subject, body);
    }
}

public class ReportNotification(IMessageChannel channel) : Notification(channel)
{
    protected override (string Subject, string Body) FormatContent(
        NotificationData data, bool supportsHtml)
    {
        var subject = $"📊 Report: {data.Title}";
        var body = supportsHtml
            ? $"<h2>{data.Title}</h2><table>{data.TableContent}</table>"
            : $"REPORT: {data.Title}\n{data.TextContent}";
        return (subject, body);
    }
}

public class ReminderNotification(IMessageChannel channel) : Notification(channel)
{
    protected override (string Subject, string Body) FormatContent(
        NotificationData data, bool supportsHtml)
    {
        var subject = $"⏰ Reminder: {data.Title}";
        var body = $"Reminder: {data.Message}\nDue: {data.DueDate:dd/MM/yyyy HH:mm}";
        return (subject, body);
    }
}
```

### Bước 3: DI và kết hợp linh hoạt (12:30 – 14:30)

```csharp
// DI Registration
builder.Services.AddTransient<EmailChannel>();
builder.Services.AddTransient<SmsChannel>();
builder.Services.AddTransient<SlackChannel>();

// Kết hợp linh hoạt: Alert có thể đi qua bất kỳ channel nào
builder.Services.AddKeyedTransient<Notification, AlertNotification>("alert-email",
    (sp, _) => new AlertNotification(sp.GetRequiredService<EmailChannel>()));

builder.Services.AddKeyedTransient<Notification, AlertNotification>("alert-sms",
    (sp, _) => new AlertNotification(sp.GetRequiredService<SmsChannel>()));

// Thêm Slack channel: chỉ thêm SlackChannel + đăng ký combinations
// Không sửa AlertNotification, ReportNotification, hay ReminderNotification
builder.Services.AddKeyedTransient<Notification, AlertNotification>("alert-slack",
    (sp, _) => new AlertNotification(sp.GetRequiredService<SlackChannel>()));
```

---

## PHẦN 4 – VÍ DỤ .NET (14:30 – 17:00)

> "Bridge Pattern trong .NET:
>
> **`Stream` và `StreamWriter/StreamReader`:** `StreamWriter` (abstraction) wrap bất kỳ `Stream` nào (implementation). `new StreamWriter(new FileStream(...))`, `new StreamWriter(new NetworkStream(...))`. Abstraction và implementation thay đổi độc lập.
>
> **`ILogger<T>` và logging providers:** `ILogger<T>` là abstraction. Serilog, NLog, Application Insights là implementations. Bridge.
>
> **`DbContext` và database providers:** DbContext (abstraction) với UseSqlServer/UseNpgsql (implementations). Đây vừa là Abstract Factory vừa là Bridge."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (17:00 – 18:30)

**✅ NÊN dùng khi:**
- Muốn tránh class explosion khi có 2 independent dimensions of variation
- Cần swap implementation tại runtime
- Cả abstraction và implementation cần được extend độc lập

**❌ KHÔNG nên dùng khi:**
- Chỉ có một dimension thay đổi – dùng Strategy thay thế
- Quá ít variants – premature abstraction
- Complexity không worth it cho hệ thống đơn giản

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (18:30 – 20:00)

> "Bridge: tách abstraction khỏi implementation bằng composition. M×N → M+N classes.
>
> Ba điều nhớ:
> 1. Nhận dạng hai chiều thay đổi độc lập → đó là signal để dùng Bridge
> 2. Abstraction có reference đến Implementation interface
> 3. Stream + StreamWriter trong .NET là Bridge đã built-in
>
> Bài tiếp theo: **Iterator Pattern** – duyệt qua collection mà không cần biết internal structure. `foreach` trong C# là Iterator Pattern."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | AlertNotification.Send() với EmailChannel → chạy; với SmsChannel → chạy (khác format) |
| Visual | Ma trận Notification×Channel trước và sau Bridge |
| Điểm nhấn | Thêm SlackChannel: 1 class mới, không sửa bất kỳ Notification class nào |
