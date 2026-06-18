# Bài 01 – Singleton Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 1 | **Thứ tự:** 1/23  
**Thời lượng ước tính:** 22 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Code editor với đoạn code new ConfigurationService() xuất hiện 5 lần]**

> "Bạn đã bao giờ nhìn vào codebase của mình và thấy cùng một service được khởi tạo 5 lần khác nhau không? Lần đầu ở Startup, lần thứ hai ở Controller, lần thứ ba ở một helper nào đó... và mỗi instance lại đọc config từ environment variables một lần nữa.
>
> Đó không chỉ là vấn đề hiệu năng – đó là mầm mống của bug. Khi environment thay đổi giữa lúc app đang chạy, hai instance khác nhau có thể trả về giá trị khác nhau cho cùng một key.
>
> Hôm nay chúng ta sẽ học **Singleton Pattern** – pattern đầu tiên và cũng là pattern được hỏi nhiều nhất trong các buổi interview .NET."

**[Màn hình: Title card – SINGLETON PATTERN]**

> "Đây là Bài 1 trong series 23 Design Patterns của chúng ta. Sau bài này, bạn sẽ hiểu:
> - Singleton giải quyết vấn đề gì và KHI NÀO nên dùng
> - Ba cách implement, từ cách cũ dễ sai đến cách hiện đại với `Lazy<T>`
> - Tại sao trong ASP.NET Core, bạn **gần như không bao giờ** cần viết Singleton thủ công
> - Và cách dùng Singleton đúng trong những trường hợp hiếm gặp mà DI container không đáp ứng được"

---

## PHẦN 2 – VẤN ĐỀ CẦN GIẢI QUYẾT (2:30 – 6:00)

**[Màn hình: Code – class ConfigurationService không có Singleton]**

> "Hãy nhìn vào vấn đề cụ thể này. Chúng ta có một class `AppConfiguration` đọc các environment variables khi khởi tạo."

```csharp
public class AppConfiguration
{
    public string ConnectionString { get; }
    public string ApiBaseUrl { get; }

    public AppConfiguration()
    {
        // Đọc env vars – tốn CPU, kết quả có thể khác nhau mỗi lần
        ConnectionString = Environment.GetEnvironmentVariable("DB_CONNECTION") 
            ?? "Server=localhost;...";
        ApiBaseUrl = Environment.GetEnvironmentVariable("API_BASE_URL") 
            ?? "https://api.myapp.com";
    }
}
```

**[Màn hình: Code – gọi new AppConfiguration() nhiều nơi]**

> "Và khi code không có kiểm soát, nó được tạo ra mọi nơi:"

```csharp
// Controller A
var config = new AppConfiguration();
var url = config.ApiBaseUrl;

// Service B (khác chỗ, cùng lúc)
var config2 = new AppConfiguration();
// Nếu API_BASE_URL vừa được update → config2 có giá trị khác config!

// Helper C
var config3 = new AppConfiguration();
```

> "Ba vấn đề xảy ra:
> 
> **Một:** Tốn tài nguyên không cần thiết – mỗi lần `new AppConfiguration()` đọc lại tất cả env vars.
>
> **Hai:** Inconsistency – nếu environment thay đổi giữa chừng, các instance khác nhau có thể có giá trị khác nhau.
>
> **Ba:** Không thể kiểm soát – bạn không biết hiện tại có bao nhiêu instance đang tồn tại trong memory."

---

## PHẦN 3 – SINGLETON LÀ GÌ? CONCEPT (6:00 – 10:00)

**[Màn hình: UML diagram]**

```
┌─────────────────────────────┐
│         Singleton           │
├─────────────────────────────┤
│ - instance: Singleton       │  ← private, chỉ class này tạo được
├─────────────────────────────┤
│ - Singleton()               │  ← constructor private
│ + GetInstance(): Singleton  │  ← điểm truy cập toàn cục duy nhất
│ + BusinessOperation()       │
└─────────────────────────────┘
           │
           │ returns single instance
           ▼
    [Global Access Point]
```

> "Singleton có ba đặc điểm bắt buộc:
>
> **Một:** Constructor `private` – không ai có thể gọi `new Singleton()` từ bên ngoài.
>
> **Hai:** Instance `private static` – lưu trữ bên trong class, là field duy nhất.
>
> **Ba:** Điểm truy cập `public static` – thường là property `Instance` – đây là cách duy nhất để lấy object.
>
> Kết quả: dù bạn gọi `AppConfiguration.Instance` ở 100 nơi khác nhau, bạn luôn nhận được **cùng một object**."

---

## PHẦN 4 – CODE WALKTHROUGH (10:00 – 18:00)

### Bước 1: Cách cũ – Double-Checked Locking (10:00 – 12:30)

**[Màn hình: Code, highlight từng dòng khi giải thích]**

```csharp
// ❌ Cách cũ – dễ sai, khó đọc, dễ bỏ sót volatile
public class OldSingleton
{
    private static OldSingleton? _instance;
    private static readonly object _lock = new();

    public static OldSingleton Instance
    {
        get
        {
            if (_instance == null)          // Kiểm tra lần 1 (không lock)
            {
                lock (_lock)
                {
                    if (_instance == null)  // Kiểm tra lần 2 (trong lock)
                        _instance = new OldSingleton();
                }
            }
            return _instance;
        }
    }
}
```

> "Đây là cách implement classic bạn sẽ thấy trong các cuốn sách cũ. Double-checked locking – kiểm tra hai lần để tránh overhead của lock.
>
> Vấn đề: code này dễ sai. Bạn có thể quên `volatile` keyword, quên kiểm tra lần 2, hoặc lock sai object. C# 4.0 trở lên đã xử lý vấn đề memory model nên code này *hoạt động*, nhưng có cách tốt hơn nhiều."

### Bước 2: Cách hiện đại – `Lazy<T>` (12:30 – 15:30)

**[Màn hình: Code mới, sạch hơn]**

```csharp
// ✅ Cách hiện đại – CLR đảm bảo thread-safe, code sạch hơn nhiều
public sealed class AppConfiguration
{
    // Lazy<T> mặc định dùng LazyThreadSafetyMode.ExecutionAndPublication
    // → factory chỉ được gọi đúng MỘT LẦN dù có 100 threads cùng truy cập
    private static readonly Lazy<AppConfiguration> _lazy =
        new(() => new AppConfiguration());

    public static AppConfiguration Instance => _lazy.Value;

    public string ConnectionString { get; private set; }
    public string ApiBaseUrl { get; private set; }

    // Constructor private: không ai ngoài class này có thể tạo instance
    private AppConfiguration()
    {
        ConnectionString = Environment.GetEnvironmentVariable("DB_CONNECTION")
            ?? "Server=localhost;Database=MyApp;Trusted_Connection=true;";
        ApiBaseUrl = Environment.GetEnvironmentVariable("API_BASE_URL")
            ?? "https://api.myapp.com";
    }
}
```

> "Hai từ khóa quan trọng:
>
> `sealed` – ngăn không cho class khác kế thừa và phá vỡ Singleton thông qua subclassing.
>
> `Lazy<T>` – .NET runtime đảm bảo factory được gọi đúng một lần. Thread-safe ngay từ đầu, không cần lock thủ công.
>
> Cách dùng cực kỳ đơn giản:"

```csharp
// Mọi nơi trong app đều nhận được CÙNG một object
var config = AppConfiguration.Instance;
Console.WriteLine(config.ConnectionString);
```

### Bước 3: Best Practice trong ASP.NET Core – DI Container (15:30 – 18:00)

**[Màn hình: Program.cs]**

> "Đây là điều quan trọng nhất của bài này:
>
> **Trong ASP.NET Core, DI container là Singleton manager của bạn.**
>
> Bạn không cần viết static Singleton. Chỉ cần đăng ký service với `AddSingleton()`:"

```csharp
// Program.cs
builder.Services.AddSingleton<IAppConfigurationService, AppConfigurationService>();
// DI container TỰ ĐẢM BẢO chỉ có 1 instance trong suốt vòng đời app

builder.Services.AddScoped<IOrderService, OrderService>();
// 1 instance MỖI HTTP request – tự động dispose khi request kết thúc

builder.Services.AddTransient<IEmailService, EmailService>();
// Instance mới MỖI LẦN inject – dùng cho stateless services
```

> "Tại sao DI container tốt hơn static Singleton?
>
> **Unit testing:** Bạn có thể mock `IAppConfigurationService` trong tests. Static Singleton không mock được.
>
> **Dispose:** DI container tự gọi `Dispose()` khi app shutdown. Static singleton không có cơ chế này.
>
> **Visibility:** Bạn thấy ngay dependencies của một class qua constructor – không có hidden global state."

---

## PHẦN 5 – VÍ DỤ THỰC TẾ .NET (18:00 – 21:00)

**[Màn hình: Danh sách examples]**

> "Singleton xuất hiện khắp nơi trong .NET ecosystem. Hãy nhận diện chúng:
>
> **`IHttpClientFactory`** – Singleton được inject vào services. Nó quản lý pool các HttpClient, đảm bảo không bị socket exhaustion.
>
> **`IConfiguration`** – Singleton chứa toàn bộ app settings. Được đọc một lần khi app khởi động.
>
> **`IMemoryCache`** – Singleton cache service, shared toàn app. Đây chính là lý do bạn không cần tự viết static cache.
>
> **`ILoggerFactory`** – Singleton tạo ra các ILogger instances, đảm bảo logging config nhất quán.
>
> Tất cả đều được quản lý bởi DI container với `AddSingleton()` – bạn không thấy `static readonly Lazy<T>` ở đâu cả trong source code ASP.NET Core."

---

## PHẦN 6 – KHI NÀO DÙNG / KHÔNG DÙNG (21:00 – 23:30)

**[Màn hình: Hai cột checklist]**

**✅ NÊN dùng Singleton (qua DI container) khi:**
- Cần đúng một instance cho toàn bộ app: config, logging, cache
- Muốn kiểm soát shared resources như connection pool
- Cần lazy initialization và thread-safe access
- Thay thế global variables bằng có kiểm soát hơn

**❌ KHÔNG nên dùng static Singleton khi:**
- Unit testing là ưu tiên – static Singleton tạo global state không mock được
- Môi trường đa tenant – mỗi tenant cần state riêng
- Instance cần được garbage collected và tái tạo
- **Hầu hết trường hợp trong ASP.NET Core** – dùng DI container `AddSingleton()` thay thế

---

## PHẦN 7 – TÓM TẮT & BÀI TIẾP THEO (23:30 – 25:00)

**[Màn hình: Summary card]**

> "Ba điều cần nhớ từ bài này:
>
> **Một:** Singleton đảm bảo chỉ có một instance duy nhất. Constructor `private`, property `Instance` static.
>
> **Hai:** Dùng `Lazy<T>` thay vì double-checked locking – code ngắn hơn, thread-safe ngay từ đầu.
>
> **Ba:** Trong ASP.NET Core, hãy dùng `AddSingleton()` thay vì tự viết Singleton. Dễ test, dễ maintain hơn.
>
> Bài tiếp theo chúng ta sẽ học **Factory Method** – pattern giải quyết câu hỏi: khi bạn cần tạo object nhưng không muốn client code biết class nào đang được tạo ra, bạn làm gì?
>
> Ví dụ trong .NET: `IHttpClientFactory.CreateClient()` – bạn gọi `CreateClient("OrderService")` nhưng không biết HttpClient được cấu hình như thế nào bên trong. Đó chính là Factory Method."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Công cụ demo code | Visual Studio 2022 hoặc Rider |
| Màn hình cần ghi | Editor + terminal |
| Animation cần thiết | Mũi tên chỉ flow từ Instance → object duy nhất |
| Thumbnail | Hình ổ khóa, chữ "1 INSTANCE ONLY" |
| Hashtag | #dotnet #designpatterns #csharp #singleton |
