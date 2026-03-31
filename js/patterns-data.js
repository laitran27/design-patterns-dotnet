/**
 * patterns-data.js
 * Dữ liệu đầy đủ cho tất cả 23 GoF Design Patterns
 * Dành cho lập trình viên .NET 8+ với 8 năm kinh nghiệm
 */

const PATTERNS_DATA = [
  // ============================================================
  // CREATIONAL PATTERNS (5)
  // ============================================================
  {
    id: "singleton",
    name: "Singleton",
    nameVi: "Singleton - Thể Hiện Duy Nhất",
    category: "creational",
    categoryVi: "Khởi Tạo",
    priority: "high",
    readingTime: 12,
    phase: 1,
    description: "Đảm bảo một lớp chỉ có một thể hiện duy nhất trong toàn bộ ứng dụng và cung cấp một điểm truy cập toàn cục đến thể hiện đó.",
    intent: "Giới hạn việc khởi tạo một lớp xuống còn một đối tượng duy nhất. Hữu ích khi cần điều phối hành động xuyên suốt toàn bộ hệ thống, như quản lý kết nối database, logging, hoặc cấu hình ứng dụng.",
    dotnetExample: "IServiceCollection với AddSingleton(), ConfigurationManager, HttpClient được quản lý qua IHttpClientFactory, DbContext với scoped lifetime trong ASP.NET Core.",
    whenToUse: [
      "Khi cần đúng một instance cho toàn bộ ứng dụng (configuration, logging, cache)",
      "Khi muốn kiểm soát chặt chẽ shared resources như connection pool",
      "Khi cần lazy initialization và thread-safe access",
      "Thay thế global variables bằng một pattern có kiểm soát hơn"
    ],
    whenNotToUse: [
      "Khi unit testing là ưu tiên – Singleton tạo ra global state khó mock",
      "Trong môi trường đa tenant nơi mỗi tenant cần state riêng",
      "Khi instance cần được garbage collected và tái tạo",
      "Hầu hết trường hợp trong ASP.NET Core – dùng DI container thay thế"
    ],
    codeExample: `// LUỒNG XỬ LÝ: App khởi động → Lazy<T> khởi tạo 1 lần → mọi nơi dùng chung Instance
// ════════════════════════════════════════════════════════════════

// === BƯỚC 1: Hiểu VẤN ĐỀ mà Singleton giải quyết ===
// Nếu không dùng Singleton: mỗi lần new AppConfiguration() sẽ đọc lại env vars,
// tốn CPU và có thể trả về giá trị khác nhau nếu env thay đổi giữa chừng.
// Singleton đảm bảo: chỉ có MỘT instance tồn tại suốt vòng đời ứng dụng.

// ❌ Cách cũ - Double-checked locking: dễ sai, khó đọc, dễ bỏ sót volatile
public class OldSingleton
{
    private static OldSingleton? _instance;
    // _lock dùng để serializ hóa truy cập, tránh race condition khi multi-thread
    private static readonly object _lock = new();

    public static OldSingleton Instance
    {
        get
        {
            // Kiểm tra lần 1 (không lock) để tránh overhead lock mỗi lần gọi
            if (_instance == null)
            {
                // Chỉ lock khi thực sự cần tạo instance
                lock (_lock)
                {
                    // Kiểm tra lần 2 (trong lock): thread thứ 2 vào đây có thể
                    // thấy _instance đã được thread 1 tạo xong rồi → không tạo lại
                    if (_instance == null)
                        _instance = new OldSingleton();
                }
            }
            return _instance;
        }
    }
}

// === BƯỚC 2: Cách hiện đại với Lazy<T> – CLR đảm bảo thread-safe ===
// sealed: ngăn subclass phá vỡ Singleton bằng cách kế thừa
public sealed class AppConfiguration
{
    // Lazy<T> mặc định dùng LazyThreadSafetyMode.ExecutionAndPublication
    // → chỉ factory được gọi đúng một lần, dù có 100 threads cùng truy cập
    private static readonly Lazy<AppConfiguration> _lazy =
        new(() => new AppConfiguration());

    // Property tĩnh này là "global access point" – toàn app dùng AppConfiguration.Instance
    public static AppConfiguration Instance => _lazy.Value;

    // Properties là read-only sau khi khởi tạo → thread-safe khi đọc, không cần lock
    public string ConnectionString { get; private set; } = string.Empty;
    public string ApiBaseUrl { get; private set; } = string.Empty;

    // Constructor private: không ai có thể gọi new AppConfiguration() từ bên ngoài
    // Đây là chìa khóa của Singleton – kiểm soát hoàn toàn việc khởi tạo
    private AppConfiguration()
    {
        // Đọc config một lần duy nhất khi app khởi động
        // Null-coalescing (??) cung cấp default value nếu env var chưa được set
        ConnectionString = Environment.GetEnvironmentVariable("DB_CONNECTION")
            ?? "Server=localhost;Database=MyApp;Trusted_Connection=true;";
        ApiBaseUrl = Environment.GetEnvironmentVariable("API_BASE_URL")
            ?? "https://api.myapp.com";
    }
}

// === BƯỚC 3: Best Practice trong ASP.NET Core – DI Container làm Singleton ===
// ⚠️ Trong ASP.NET Core, KHÔNG nên dùng static Singleton như trên.
// DI container quản lý lifetime tốt hơn: dễ unit test, dễ mock, dễ swap
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// AddSingleton: DI container tạo 1 instance duy nhất → inject vào mọi nơi cần
// Phù hợp cho: config, cache, HttpClient factory, connection pool
builder.Services.AddSingleton<IAppConfigurationService, AppConfigurationService>();

// AddScoped: tạo mới MỖI HTTP request → dispose khi request kết thúc
// Phù hợp cho: DbContext, unit of work, per-request state
builder.Services.AddScoped<IOrderService, OrderService>();

// AddTransient: tạo mới MỖI LẦN INJECT → stateless services
// Phù hợp cho: email sender, validators, lightweight services
builder.Services.AddTransient<IEmailService, EmailService>();

// === BƯỚC 4: Real-world Singleton với thread-safe cache ===
// Đây là pattern thực tế khi bạn BUỘC phải dùng static Singleton (không có DI)
public sealed class InMemoryCacheService : IDisposable
{
    // Lazy<T> đảm bảo: factory chỉ chạy 1 lần, dù app có 1000 threads
    private static readonly Lazy<InMemoryCacheService> _instance =
        new(() => new InMemoryCacheService());

    public static InMemoryCacheService Instance => _instance.Value;

    // MemoryCache của .NET là thread-safe cho đọc, nhưng GetOrSet không atomic
    private readonly MemoryCache _cache;

    // SemaphoreSlim(1,1) thay cho lock: hỗ trợ async/await, tránh deadlock
    // initialCount=1 nghĩa là chỉ 1 thread được vào critical section tại một thời điểm
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private bool _disposed;

    private InMemoryCacheService()
    {
        _cache = new MemoryCache(new MemoryCacheOptions
        {
            // SizeLimit giới hạn tổng số entries → tránh cache ăn hết RAM
            SizeLimit = 1024,
            // Khi đầy, compact 25% entries cũ nhất → tự động dọn dẹp
            CompactionPercentage = 0.25
        });
    }

    // GetOrSet atomic: kiểm tra cache → nếu miss thì gọi factory → set cache
    // Tại sao cần SemaphoreSlim? Tránh "thundering herd": 100 requests cùng miss cache
    // cùng gọi factory (DB query) → chỉ 1 query thực sự được thực thi
    public async Task<T?> GetOrSetAsync<T>(
        string key,
        Func<Task<T>> factory,
        TimeSpan? expiry = null)
    {
        // Kiểm tra nhanh trước khi lock → tối ưu 99% requests (cache hit)
        if (_cache.TryGetValue(key, out T? cached))
            return cached;

        // Chỉ khi cache miss mới cần acquire semaphore
        await _semaphore.WaitAsync();
        try
        {
            // Double-check sau khi có lock: thread thứ 2 vào đây, thread 1 đã set cache
            if (_cache.TryGetValue(key, out cached))
                return cached;

            // Gọi factory (thường là DB query hoặc API call)
            var value = await factory();
            var options = new MemoryCacheEntryOptions
            {
                // TTL tuyệt đối: sau khoảng thời gian này, entry bị xóa bất kể
                AbsoluteExpirationRelativeToNow = expiry ?? TimeSpan.FromMinutes(5),
                // Mỗi entry "nặng" 1 unit → SizeLimit = 1024 entries tối đa
                Size = 1
            };
            _cache.Set(key, value, options);
            return value;
        }
        finally
        {
            // finally đảm bảo semaphore LUÔN được release, kể cả khi có exception
            _semaphore.Release();
        }
    }

    // Implement IDisposable để giải phóng unmanaged resources đúng cách
    public void Dispose()
    {
        if (!_disposed)
        {
            _cache.Dispose();    // Giải phóng MemoryCache
            _semaphore.Dispose(); // Giải phóng SemaphoreSlim
            _disposed = true;
        }
    }
}`,
    umlDiagram: `┌─────────────────────────────┐
│         Singleton           │
├─────────────────────────────┤
│ - instance: Singleton       │
├─────────────────────────────┤
│ - Singleton()               │
│ + GetInstance(): Singleton  │
│ + BusinessOperation()       │
└─────────────────────────────┘
           │
           │ returns single instance
           ▼
    [Global Access Point]`
  },
  {
    id: "factory-method",
    name: "Factory Method",
    nameVi: "Factory Method - Phương Thức Nhà Máy",
    category: "creational",
    categoryVi: "Khởi Tạo",
    priority: "high",
    readingTime: 15,
    phase: 1,
    description: "Định nghĩa interface để tạo một đối tượng, nhưng để các lớp con quyết định lớp nào sẽ được khởi tạo. Factory Method cho phép một lớp trì hoãn việc khởi tạo đến các lớp con.",
    intent: "Tách biệt việc tạo đối tượng khỏi logic sử dụng. Client code làm việc với interface, không cần biết concrete class nào đang được tạo ra.",
    dotnetExample: "IHttpClientFactory.CreateClient(), DbProviderFactory.CreateConnection(), LoggerFactory.CreateLogger<T>(), StreamReader và StreamWriter factories.",
    whenToUse: [
      "Khi không biết trước loại đối tượng cần tạo",
      "Khi muốn cung cấp extension points cho library/framework",
      "Khi muốn reuse existing objects thay vì tạo mới",
      "Khi constructor quá phức tạp và cần encapsulate creation logic"
    ],
    whenNotToUse: [
      "Khi chỉ có một concrete implementation – over-engineering",
      "Khi creation logic đơn giản và không thay đổi",
      "Khi performance-critical và overhead của virtual dispatch là vấn đề"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Client → gọi ConcreteCreator.CreateSender() → nhận INotificationSender → gọi SendAsync()
// ════════════════════════════════════════════════════════════════
// Điểm mấu chốt: Client code (NotifyAsync) KHÔNG bao giờ gọi new SmtpEmailSender()
// Việc quyết định tạo class nào được ĐẨY xuống subclass (ConcreteCreator)

// === BƯỚC 1: Định nghĩa Product interface ===
// INotificationSender là "sản phẩm" mà factory sẽ tạo ra.
// Client chỉ làm việc qua interface này → hoàn toàn không biết SmtpEmailSender hay TwilioSmsSender
public interface INotificationSender
{
    // Hợp đồng chung: gửi thông báo. Mỗi implementation sẽ gửi qua kênh khác nhau
    Task SendAsync(string recipient, string subject, string body, CancellationToken ct);
}

// === BƯỚC 2: Abstract Creator – chứa factory method trừu tượng ===
// NotificationFactory định nghĩa "khung" xử lý (NotifyAsync)
// nhưng KHÔNG biết cụ thể sẽ dùng loại sender nào → để subclass quyết định
public abstract class NotificationFactory
{
    // ← ĐÂY là Factory Method: abstract, buộc subclass phải implement
    // Trả về INotificationSender thay vì concrete class → loose coupling
    public abstract INotificationSender CreateSender();

    // Template method: dùng factory method để lấy sender rồi gửi
    // NotifyAsync KHÔNG biết đang dùng Email hay SMS → đây là sức mạnh của pattern
    public async Task NotifyAsync(
        string recipient, string subject, string body, CancellationToken ct)
    {
        // Gọi factory method → subclass sẽ quyết định tạo loại sender nào
        var sender = CreateSender();
        // Dùng sender qua interface → không phụ thuộc concrete implementation
        await sender.SendAsync(recipient, subject, body, ct);
    }
}

// === BƯỚC 3: Concrete Creators – override factory method để tạo product cụ thể ===
// EmailNotificationFactory "biết" rằng nó tạo SmtpEmailSender
// Nhưng client code chỉ tương tác với NotificationFactory → không biết điều này
public class EmailNotificationFactory(IOptions<EmailSettings> settings)
    : NotificationFactory
{
    // Override factory method: tạo SmtpEmailSender với config SMTP
    // settings được inject qua DI → Factory Method kết hợp tốt với DI
    public override INotificationSender CreateSender()
        => new SmtpEmailSender(settings.Value);
}

// SmsNotificationFactory tạo ra loại sender khác – TwilioSmsSender
// Thêm kênh mới (Zalo, Slack)? Chỉ cần thêm Factory subclass, KHÔNG sửa code cũ
public class SmsNotificationFactory(IOptions<TwilioSettings> settings)
    : NotificationFactory
{
    // Override factory method: tạo TwilioSmsSender với Twilio credentials
    public override INotificationSender CreateSender()
        => new TwilioSmsSender(settings.Value);
}

// === BƯỚC 4: IHttpClientFactory – Factory Method có sẵn trong .NET ===
// .NET đã áp dụng pattern này: IHttpClientFactory là abstract creator,
// các named clients là concrete products được cấu hình sẵn
// Program.cs – đây là "đăng ký factory" với DI container
builder.Services.AddHttpClient("OrderService", client =>
{
    // Cấu hình cho client "OrderService" – đây là intrinsic configuration
    client.BaseAddress = new Uri("https://orders.api.com");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddHttpClient("InventoryService", client =>
{
    // Client khác, config khác – cùng interface HttpClient
    client.BaseAddress = new Uri("https://inventory.api.com");
    client.Timeout = TimeSpan.FromSeconds(10);
});

// OrderApiClient không new HttpClient() trực tiếp → tránh socket exhaustion
// IHttpClientFactory.CreateClient() là factory method: trả về HttpClient được cấu hình đúng
public class OrderApiClient(IHttpClientFactory httpClientFactory)
{
    // httpClientFactory.CreateClient("OrderService") = factory method call
    // Framework quyết định tạo/reuse HttpClient như thế nào → client không cần biết
    private readonly HttpClient _client = httpClientFactory.CreateClient("OrderService");

    public async Task<OrderDto?> GetOrderAsync(Guid orderId, CancellationToken ct)
    {
        var response = await _client.GetAsync($"/orders/{orderId}", ct);
        response.EnsureSuccessStatusCode();
        // ReadFromJsonAsync deserialize JSON → OrderDto tự động
        return await response.Content.ReadFromJsonAsync<OrderDto>(ct);
    }
}

// === BƯỚC 5: DI Registration – chọn factory theo config ===
// AddKeyedSingleton cho phép đăng ký nhiều implementation cùng interface
// Client inject [FromKeyedServices("email")] NotificationFactory để lấy đúng factory
builder.Services.AddKeyedSingleton<NotificationFactory, EmailNotificationFactory>("email");
builder.Services.AddKeyedSingleton<NotificationFactory, SmsNotificationFactory>("sms");

// Ví dụ dùng trong service:
// public class AlertService([FromKeyedServices("sms")] NotificationFactory factory) { ... }
// → AlertService không biết TwilioSmsSender tồn tại → Factory Method đã che giấu hoàn toàn`,
    umlDiagram: `┌──────────────────┐         ┌──────────────────┐
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
└─────────────────┘`
  },
  {
    id: "abstract-factory",
    name: "Abstract Factory",
    nameVi: "Abstract Factory - Nhà Máy Trừu Tượng",
    category: "creational",
    categoryVi: "Khởi Tạo",
    priority: "medium",
    readingTime: 18,
    phase: 2,
    description: "Cung cấp interface để tạo ra các họ đối tượng liên quan hoặc phụ thuộc lẫn nhau mà không cần chỉ định các lớp cụ thể.",
    intent: "Tạo ra các 'gia đình' đối tượng tương thích với nhau. Đảm bảo rằng các đối tượng từ cùng một họ luôn được sử dụng cùng nhau.",
    dotnetExample: "DbProviderFactories trong ADO.NET, UI theme factories trong WPF/MAUI, EF Core provider factories (UseSqlServer, UseNpgsql, UseSqlite).",
    whenToUse: [
      "Khi hệ thống cần hoạt động với nhiều họ sản phẩm",
      "Khi muốn đảm bảo tính nhất quán giữa các sản phẩm liên quan",
      "Khi muốn swap toàn bộ họ implementation (e.g., từ SQL Server sang PostgreSQL)",
      "Khi cần isolate concrete classes khỏi client code"
    ],
    whenNotToUse: [
      "Khi chỉ có một loại product – dùng Factory Method thay thế",
      "Khi thêm product type mới vào family thường xuyên – vi phạm OCP",
      "Khi ứng dụng nhỏ và không cần nhiều provider"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Config → chọn IDatabaseFactory → Repository dùng factory → tạo Connection + Command đúng DB
// ════════════════════════════════════════════════════════════════
// Khác với Factory Method (1 product): Abstract Factory tạo ra CẢ HỌ products tương thích nhau.
// Ở đây: SqlServerFactory luôn tạo SqlConnection + SqlCommand đi kèm → không bao giờ trộn lẫn

// === BƯỚC 1: Định nghĩa Abstract Products – "họ" sản phẩm ===
// IDbConnection và IDbCommand là hai members của cùng một "họ" database objects.
// Mỗi factory sẽ tạo ra implementation tương thích với nhau (không trộn SQL Server với Postgres)
public interface IDbConnection : IAsyncDisposable
{
    Task OpenAsync(CancellationToken ct = default);
    // CreateCommand đi kèm với Connection → đảm bảo tính nhất quán trong cùng họ
    IDbCommand CreateCommand();
}

public interface IDbCommand : IAsyncDisposable
{
    string CommandText { get; set; }
    Task<int> ExecuteNonQueryAsync(CancellationToken ct = default);
    Task<object?> ExecuteScalarAsync(CancellationToken ct = default);
    Task<IDataReader> ExecuteReaderAsync(CancellationToken ct = default);
    IDbParameter CreateParameter();
}

// === BƯỚC 2: Abstract Factory interface – "nhà máy trừu tượng" ===
// IDatabaseFactory định nghĩa TẤT CẢ products mà một database family cần tạo.
// Thêm database mới (MySQL, SQLite)? Chỉ thêm class implement IDatabaseFactory, KHÔNG sửa Repository
public interface IDatabaseFactory
{
    // Tạo connection – product 1 trong họ
    IDbConnection CreateConnection(string connectionString);
    // Tạo command gắn với connection – product 2, phải tương thích với product 1
    IDbCommand CreateCommand(string sql, IDbConnection connection);
    // Metadata về DB-specific syntax: SQL Server dùng "@", PostgreSQL dùng "$1", "$2"...
    string GetParameterPrefix();
    // Paging syntax khác nhau giữa các DB – đây là điểm Abstract Factory shine
    string BuildPagingQuery(string baseQuery, int skip, int take);
}

// === BƯỚC 3: Concrete Factory cho SQL Server ===
// SqlServerFactory TẠO và LIÊN KẾT các SQL Server objects với nhau.
// Đảm bảo SqlConnection luôn đi với SqlCommand – không bao giờ nhầm lẫn
public class SqlServerFactory : IDatabaseFactory
{
    // Bọc SqlConnection (ADO.NET) trong adapter IDbConnection của chúng ta
    public IDbConnection CreateConnection(string connectionString)
        => new SqlServerDbConnection(new SqlConnection(connectionString));

    // SqlCommand phải dùng SqlConnection – cùng family → type-safe
    public IDbCommand CreateCommand(string sql, IDbConnection connection)
        => new SqlServerDbCommand(new SqlCommand(sql));

    // SQL Server dùng named parameters với prefix "@" (ví dụ: @userId)
    public string GetParameterPrefix() => "@";

    // SQL Server paging: OFFSET/FETCH NEXT – chuẩn SQL:2008
    public string BuildPagingQuery(string baseQuery, int skip, int take)
        => $"{baseQuery} ORDER BY (SELECT NULL) OFFSET {skip} ROWS FETCH NEXT {take} ROWS ONLY";
}

// === BƯỚC 4: Concrete Factory cho PostgreSQL ===
// PostgreSqlFactory tạo ra CÙNG interface nhưng implementation khác hoàn toàn.
// Swap từ SQL Server sang PostgreSQL: chỉ đổi một dòng trong DI registration
public class PostgreSqlFactory : IDatabaseFactory
{
    // NpgsqlConnection thay vì SqlConnection – khác hoàn toàn về driver
    public IDbConnection CreateConnection(string connectionString)
        => new PostgreSqlDbConnection(new NpgsqlConnection(connectionString));

    // NpgsqlCommand đi với NpgsqlConnection – cùng Npgsql family
    public IDbCommand CreateCommand(string sql, IDbConnection connection)
        => new PostgreSqlDbCommand(new NpgsqlCommand(sql));

    // PostgreSQL dùng positional parameters: $1, $2, $3
    public string GetParameterPrefix() => "$";

    // PostgreSQL paging: LIMIT/OFFSET – cú pháp khác SQL Server
    public string BuildPagingQuery(string baseQuery, int skip, int take)
        => $"{baseQuery} LIMIT {take} OFFSET {skip}";
}

// === BƯỚC 5: Repository – client code chỉ biết IDatabaseFactory ===
// UserRepository hoàn toàn KHÔNG biết đang chạy với SQL Server hay PostgreSQL.
// Đây là mục tiêu của Abstract Factory: cô lập client khỏi concrete implementations
public class UserRepository(IDatabaseFactory dbFactory, string connectionString)
{
    public async Task<IEnumerable<User>> GetPagedAsync(
        int page, int pageSize, CancellationToken ct)
    {
        // Lấy prefix từ factory – "@" hoặc "$" tùy database engine
        var prefix = dbFactory.GetParameterPrefix();
        // BuildPagingQuery trả về SQL đúng cú pháp cho từng DB
        var sql = dbFactory.BuildPagingQuery(
            "SELECT id, name, email FROM users WHERE active = true",
            (page - 1) * pageSize, pageSize);

        // await using: IAsyncDisposable → đảm bảo connection được đóng đúng cách
        await using var conn = dbFactory.CreateConnection(connectionString);
        await conn.OpenAsync(ct); // Mở connection – bất đồng bộ, không block thread pool
        await using var cmd = dbFactory.CreateCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        var users = new List<User>();
        // Đọc từng row – reader stream data, không load hết vào memory
        while (await reader.ReadAsync(ct))
            users.Add(MapUser(reader));
        return users;
    }

    // Hàm mapping tách biệt khỏi query logic → dễ test, dễ đọc
    private static User MapUser(IDataReader reader) => new()
    {
        Id = reader.GetGuid(0),
        Name = reader.GetString(1),
        Email = reader.GetString(2)
    };
}

// === BƯỚC 6: DI Registration – điểm duy nhất quyết định database engine ===
// Toàn bộ codebase không đổi. Chỉ thay một dòng config → swap database engine
builder.Services.AddSingleton<IDatabaseFactory>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    // Switch expression C# 8+: sạch hơn if/else
    return config["DatabaseProvider"] switch
    {
        "SqlServer"  => new SqlServerFactory(),   // → tất cả SQL Server objects
        "PostgreSQL" => new PostgreSqlFactory(),   // → tất cả PostgreSQL objects
        // Fail-fast: throw ngay khi config sai thay vì lỗi ở runtime
        _ => throw new InvalidOperationException("Unknown database provider")
    };
});`,
    umlDiagram: `┌──────────────────────┐
│   AbstractFactory    │
├──────────────────────┤
│+CreateProductA()     │
│+CreateProductB()     │
└──────────────────────┘
           ▲
    ┌──────┴──────┐
    │             │
┌───────┐   ┌───────┐
│Factory│   │Factory│
│   1   │   │   2   │
└───────┘   └───────┘
    │             │
creates A1   creates A2
creates B1   creates B2`
  },
  {
    id: "builder",
    name: "Builder",
    nameVi: "Builder - Người Xây Dựng",
    category: "creational",
    categoryVi: "Khởi Tạo",
    priority: "high",
    readingTime: 14,
    phase: 1,
    description: "Tách biệt quá trình xây dựng một đối tượng phức tạp khỏi biểu diễn của nó, cho phép cùng một quy trình xây dựng tạo ra các biểu diễn khác nhau.",
    intent: "Xây dựng đối tượng phức tạp từng bước một. Cho phép sử dụng cùng một builder code để tạo ra các biểu diễn khác nhau của một đối tượng.",
    dotnetExample: "WebApplicationBuilder trong ASP.NET Core, StringBuilder, IHostBuilder, EF Core's ModelBuilder trong OnModelCreating, Fluent API configurations.",
    whenToUse: [
      "Khi constructor có quá nhiều parameters (> 4-5)",
      "Khi cần tạo nhiều biến thể của cùng một đối tượng",
      "Khi quá trình khởi tạo cần nhiều bước phức tạp",
      "Khi muốn immutable objects nhưng cần flexible construction"
    ],
    whenNotToUse: [
      "Khi đối tượng có ít thuộc tính và constructor đơn giản",
      "Khi không cần nhiều biến thể của đối tượng",
      "Khi performance quan trọng và builder overhead không chấp nhận được"
    ],
    codeExample: `// LUỒNG XỬ LÝ: QueryBuilder.From() → các bước .Select/.Where/.OrderBy → .Build() → SQL + Parameters
// ════════════════════════════════════════════════════════════════
// Builder tách "cách xây dựng" khỏi "sản phẩm cuối cùng".
// Mỗi method trả về 'this' (fluent interface) → cho phép chain nhiều bước mà không cần Director riêng

// === BƯỚC 1: Định nghĩa Builder với internal state ===
// Tất cả fields là private → client KHÔNG thể tạo SQL không hợp lệ
// Builder tích lũy state qua các method calls, chỉ Build() mới tạo ra product cuối
public class QueryBuilder
{
    private string _table = string.Empty;
    // Collection thay vì string concatenation → dễ thêm điều kiện có/không có điều kiện
    private readonly List<string> _conditions = [];
    // Mặc định là "*" (SELECT *) → override bằng .Select()
    private readonly List<string> _columns = ["*"];
    // Tuple để giữ cả column name và hướng sort → không cần class riêng
    private readonly List<(string Column, bool Descending)> _orderBy = [];
    // Dictionary parameters → truyền vào Dapper/ADO.NET để tránh SQL injection
    private readonly Dictionary<string, object> _parameters = [];
    private int? _skip;  // null = không có OFFSET
    private int? _take;  // null = không có FETCH NEXT
    private bool _distinct;

    // Static factory method thay cho constructor → đọc như câu văn: QueryBuilder.From("orders")
    public static QueryBuilder From(string table) => new QueryBuilder { _table = table };

    // Mỗi method trả về 'this' → fluent interface, cho phép chain
    public QueryBuilder Select(params string[] columns)
    {
        // Clear ["*"] mặc định trước khi thêm columns cụ thể
        _columns.Clear();
        _columns.AddRange(columns);
        return this; // ← chìa khóa của fluent builder: trả về chính mình
    }

    // Where nhận cả value và paramName để builder tự quản lý parameters
    // → tránh SQL injection mà không cần client lo về parameterization
    public QueryBuilder Where(string condition, object? value = null, string? paramName = null)
    {
        _conditions.Add(condition);
        // Chỉ thêm parameter nếu có cả value và paramName
        if (value != null && paramName != null)
            _parameters[paramName] = value;
        return this;
    }

    // WhereIf là "conditional building" – điểm mạnh của Builder pattern:
    // logic điều kiện nằm trong builder, KHÔNG làm bẩn client code bằng if/else
    public QueryBuilder WhereIf(bool condition, string clause, object? value = null, string? param = null)
        => condition ? Where(clause, value, param) : this; // Nếu false: bỏ qua, trả về this

    public QueryBuilder OrderBy(string column, bool descending = false)
    {
        // Tuple literal C# → compact hơn new OrderByClause(column, descending)
        _orderBy.Add((column, descending));
        return this;
    }

    // Các method đơn giản nhưng vẫn return this để có thể chain
    public QueryBuilder Skip(int skip) { _skip = skip; return this; }
    public QueryBuilder Take(int take) { _take = take; return this; }
    public QueryBuilder Distinct() { _distinct = true; return this; }

    // === BƯỚC 2: Build() – bước cuối cùng tạo ra "sản phẩm" ===
    // Chỉ gọi Build() một lần sau khi đã chain tất cả bước cấu hình
    // Trả về tuple (SQL string, Parameters dict) – sản phẩm hoàn chỉnh
    public (string Sql, Dictionary<string, object> Parameters) Build()
    {
        // Validate trước khi build – fail-fast thay vì tạo SQL không hợp lệ
        if (string.IsNullOrEmpty(_table))
            throw new InvalidOperationException("Table name is required");

        var sb = new StringBuilder("SELECT ");
        // DISTINCT chỉ thêm nếu được yêu cầu – không ảnh hưởng performance khi không cần
        if (_distinct) sb.Append("DISTINCT ");
        // Join columns với ", " → "o.id, o.total, o.created_at"
        sb.Append(string.Join(", ", _columns));
        sb.Append($" FROM {_table}");

        // WHERE chỉ được thêm nếu có điều kiện → tránh "WHERE " trống
        if (_conditions.Count > 0)
            // Các conditions được nối bằng AND – phổ biến nhất cho filter
            sb.Append($" WHERE {string.Join(" AND ", _conditions)}");

        if (_orderBy.Count > 0)
        {
            // Tạo "column DESC" hoặc "column" tùy theo Descending flag
            var orderClauses = _orderBy.Select(o =>
                o.Descending ? $"{o.Column} DESC" : o.Column);
            sb.Append($" ORDER BY {string.Join(", ", orderClauses)}");
        }

        // Paging: OFFSET/FETCH NEXT – SQL Server syntax
        if (_skip.HasValue || _take.HasValue)
        {
            // _skip ?? 0: nếu không set skip nhưng có take → OFFSET 0
            sb.Append($" OFFSET {_skip ?? 0} ROWS");
            if (_take.HasValue)
                sb.Append($" FETCH NEXT {_take} ROWS ONLY");
        }

        // Trả về SQL string + parameters dict để truyền vào Dapper hay ADO.NET
        return (sb.ToString(), _parameters);
    }
}

// === BƯỚC 3: Usage – fluent API, đọc như tiếng Anh ===
// WhereIf cho phép thêm điều kiện động mà không cần if/else trong client code
var (sql, parameters) = QueryBuilder
    .From("orders o")
    // SELECT cụ thể thay vì SELECT * → tốt hơn về performance và maintenance
    .Select("o.id", "o.total", "o.created_at", "c.name AS customer_name")
    // Điều kiện bắt buộc: luôn filter theo status
    .Where("o.status = @status", "pending", "@status")
    // Điều kiện optional: chỉ thêm WHERE nếu customerId có giá trị
    .WhereIf(customerId.HasValue, "o.customer_id = @customerId", customerId, "@customerId")
    .WhereIf(dateFrom.HasValue, "o.created_at >= @dateFrom", dateFrom, "@dateFrom")
    .OrderBy("o.created_at", descending: true) // Mới nhất lên đầu
    .Skip((page - 1) * pageSize)   // Bỏ qua N records đầu (paging)
    .Take(pageSize)                 // Lấy pageSize records
    .Build();                       // Tạo SQL string và parameters

// === BƯỚC 4: WebApplicationBuilder – Builder pattern có sẵn trong .NET 8 ===
// WebApplication.CreateBuilder() tạo builder → configure từng bước → Build() tạo app
var builder = WebApplication.CreateBuilder(args);

// builder.Services là IServiceCollection – builder cho DI container
// Chain method giúp cấu hình phức tạp trở nên đọc được
builder.Services
    .AddControllers()   // Thêm MVC controllers
    // Cấu hình JSON serialization: camelCase trong API response
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);

// Authentication cũng dùng builder pattern: AddAuthentication → AddJwtBearer
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // TokenValidationParameters cũng là một Builder (object initializer style)
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true, // Token hết hạn → reject
            // SymmetricSecurityKey từ secret key → verify JWT signature
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// Serilog cũng là builder: ReadFrom.Configuration → ReadFrom.Services → Enrich → WriteTo
builder.Host
    .UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration) // Đọc sink config từ appsettings
        .ReadFrom.Services(services)     // Inject DI services vào enrichers
        .Enrich.FromLogContext()         // Thêm context info (requestId, userId) vào mỗi log
        .WriteTo.Console()               // Sink 1: xuất ra console
        .WriteTo.Seq(context.Configuration["Seq:Url"]!)); // Sink 2: gửi lên Seq log server

// builder.Build() = bước cuối cùng: tất cả config được "đóng gói" → tạo WebApplication
var app = builder.Build();`,
    umlDiagram: `┌──────────┐    ┌──────────────┐    ┌─────────┐
│ Director │───▶│   Builder    │───▶│ Product │
├──────────┤    ├──────────────┤    ├─────────┤
│+Construct│    │+BuildPartA() │    │ partA   │
└──────────┘    │+BuildPartB() │    │ partB   │
                │+GetResult()  │    └─────────┘
                └──────────────┘
                       ▲
                       │
              ┌────────────────┐
              │ConcreteBuilder │
              ├────────────────┤
              │+BuildPartA()   │
              │+BuildPartB()   │
              │+GetResult()    │
              └────────────────┘`
  },
  {
    id: "prototype",
    name: "Prototype",
    nameVi: "Prototype - Nguyên Mẫu",
    category: "creational",
    categoryVi: "Khởi Tạo",
    priority: "low",
    readingTime: 10,
    phase: 3,
    description: "Tạo object mới bằng cách sao chép (clone) một object hiện có, thay vì tạo mới từ đầu. Đặc biệt hữu ích khi việc khởi tạo tốn kém.",
    intent: "Chỉ định loại đối tượng cần tạo bằng cách sử dụng một nguyên mẫu, sau đó tạo các đối tượng mới bằng cách sao chép nguyên mẫu đó.",
    dotnetExample: "ICloneable interface trong .NET, Object.MemberwiseClone(), record với 'with' expressions trong C# 9+, Clone() trong các entity frameworks.",
    whenToUse: [
      "Khi khởi tạo đối tượng tốn kém (database queries, network calls)",
      "Khi cần tạo nhiều đối tượng tương tự với ít khác biệt nhỏ",
      "Khi muốn tránh coupling với concrete classes",
      "Khi cần deep copy của complex object graph"
    ],
    whenNotToUse: [
      "Khi đối tượng có circular references – deep clone rất phức tạp",
      "Khi construction đơn giản và không tốn kém",
      "Khi ICloneable không đủ rõ ràng về shallow vs deep copy"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Tạo template 1 lần → Registry lưu → Create() trả về deep clone → modify tự do
// ════════════════════════════════════════════════════════════════
// Prototype giải quyết vấn đề: khởi tạo object tốn kém (DB query, computation).
// Thay vì tạo mới từ đầu, ta CLONE từ object đã có sẵn → nhanh hơn nhiều.

// === BƯỚC 1: Hiểu sự khác biệt giữa Shallow Clone và Deep Clone ===
// Shallow clone: copy reference → hai objects share cùng List/Dictionary object
// Deep clone: copy toàn bộ object graph → hai objects hoàn toàn độc lập

// record với 'with' là SHALLOW clone cho reference types (List, Dictionary)!
// Cần xử lý thủ công các collection để có deep clone thực sự
public record ProductTemplate
{
    public string Name { get; init; } = string.Empty;
    public decimal BasePrice { get; init; }
    // List<string> là reference type → 'with' sẽ copy reference, không copy nội dung!
    public List<string> Tags { get; init; } = [];
    // Record lồng nhau cũng cần 'with' riêng để clone đúng cách
    public ProductMetadata Metadata { get; init; } = new();
}

// init-only properties: chỉ gán được trong constructor hoặc 'with' expression
// → tạo ra immutable-like objects sau khi khởi tạo
public record ProductMetadata
{
    public string Category { get; init; } = string.Empty;
    public bool IsDigital { get; init; }
    // Dictionary cũng là reference type → cần deep copy khi clone
    public Dictionary<string, string> Attributes { get; init; } = [];
}

// === BƯỚC 2: Tạo template gốc (prototype) ===
var template = new ProductTemplate
{
    Name = "Software License",
    BasePrice = 99.99m,
    Tags = ["software", "license"],
    Metadata = new ProductMetadata
    {
        Category = "Software",
        IsDigital = true,
        Attributes = new() { ["platform"] = "Windows" }
    }
};

// === BƯỚC 3: Clone với 'with' expression – đúng cách cho collections ===
// 'with' tạo record mới với một số properties khác → phần còn lại giữ nguyên
var enterpriseVersion = template with
{
    Name = "Enterprise License",   // Đổi tên → property value type, safe
    BasePrice = 499.99m,
    // [..template.Tags, "enterprise"] = spread operator → tạo List MỚI với nội dung cũ + thêm
    // Nếu dùng template.Tags trực tiếp → cả hai records share cùng List → BUG!
    Tags = [..template.Tags, "enterprise"],
    // Metadata là record → dùng 'with' lồng nhau để clone đúng cách
    Metadata = template.Metadata with
    {
        // new Dictionary(existing) tạo dictionary MỚI với nội dung copy từ original
        // Thêm key mới vào enterprise version mà không ảnh hưởng template
        Attributes = new Dictionary<string, string>(template.Metadata.Attributes)
        {
            ["seats"] = "unlimited"  // Enterprise có thêm thuộc tính "số ghế không giới hạn"
        }
    }
};

// === BƯỚC 4: Prototype Registry – cache expensive prototypes ===
// Scenario thực tế: ReportTemplate chứa layout phức tạp, load từ DB tốn 500ms.
// Prototype Registry: load 1 lần → clone nhanh cho mọi request sau
public interface IPrototype<T>
{
    // DeepClone phải trả về object hoàn toàn độc lập với original
    T DeepClone();
}

public class ReportTemplate : IPrototype<ReportTemplate>
{
    public string Title { get; set; } = string.Empty;
    public List<ReportSection> Sections { get; set; } = [];
    public ReportStyle Style { get; set; } = new();
    public Dictionary<string, object> DefaultFilters { get; set; } = [];

    // Deep clone bằng JSON serialization: serialize → deserialize → object graph mới hoàn toàn
    // Đây là cách đơn giản nhất cho deep clone khi object có nhiều nested properties.
    // ⚠️ Trade-off: chậm hơn manual clone nhưng an toàn và dễ bảo trì
    public ReportTemplate DeepClone()
    {
        var json = JsonSerializer.Serialize(this);
        // Deserialize tạo ra object mới hoàn toàn – không share bất kỳ reference nào với original
        return JsonSerializer.Deserialize<ReportTemplate>(json)!;
    }
}

// === BƯỚC 5: Registry quản lý pool of prototypes ===
// Registry = nơi "đăng ký" các prototype đã được khởi tạo sẵn
// Mỗi lần Create() → trả về clone, KHÔNG bao giờ trả về prototype gốc
public class ReportTemplateRegistry
{
    // Lưu prototypes theo tên – tất cả đã được khởi tạo và ready to clone
    private readonly Dictionary<string, ReportTemplate> _templates = new();

    // Register: thêm prototype vào registry (gọi một lần lúc startup)
    public void Register(string key, ReportTemplate template)
        => _templates[key] = template;

    public ReportTemplate Create(string key)
    {
        if (!_templates.TryGetValue(key, out var template))
            throw new KeyNotFoundException($"Template '{key}' not found");
        // Clone thay vì trả về original → caller có thể modify tự do
        // Nếu trả về original: caller modify → ảnh hưởng tất cả Create() sau!
        return template.DeepClone();
    }
}

// === BƯỚC 6: Sử dụng Registry ===
var registry = new ReportTemplateRegistry();
// Load prototype tốn kém (một lần duy nhất khi startup)
registry.Register("monthly-sales", new ReportTemplate
{
    Title = "Monthly Sales Report",
    Sections = [new() { Name = "Summary" }, new() { Name = "Details" }],
    DefaultFilters = new() { ["period"] = "monthly" }
});

// Create() nhanh vì chỉ clone JSON, không query DB
var report1 = registry.Create("monthly-sales");
// Modify clone tự do – KHÔNG ảnh hưởng prototype trong registry
report1.Title = "January 2025 Sales";

// Create() lần 2 vẫn trả về template "sạch" với Title = "Monthly Sales Report"
var report2 = registry.Create("monthly-sales"); // report2.Title = "Monthly Sales Report"`,
    umlDiagram: `┌────────────────┐         ┌──────────────────┐
│   Prototype    │         │  Client          │
├────────────────┤         ├──────────────────┤
│+Clone()        │◀────────│+Operation()      │
└────────────────┘         └──────────────────┘
        ▲
        │
┌───────────────────┐
│ ConcretePrototype │
├───────────────────┤
│ - field1          │
│+Clone()           │──▶ return copy of self
└───────────────────┘`
  },

  // ============================================================
  // STRUCTURAL PATTERNS (7)
  // ============================================================
  {
    id: "adapter",
    name: "Adapter",
    nameVi: "Adapter - Bộ Chuyển Đổi",
    category: "structural",
    categoryVi: "Cấu Trúc",
    priority: "high",
    readingTime: 13,
    phase: 1,
    description: "Chuyển đổi interface của một lớp sang interface khác mà client mong đợi. Adapter cho phép các lớp có interface không tương thích làm việc được với nhau.",
    intent: "Kết nối hai interface không tương thích. Đặc biệt hữu ích khi tích hợp third-party libraries hoặc legacy code vào hệ thống hiện tại.",
    dotnetExample: "Wrapping third-party payment SDK (Stripe, VNPay) behind interface, adapting legacy DAL to repository pattern, IEnumerable/IQueryable adapters.",
    whenToUse: [
      "Khi muốn dùng lớp hiện có nhưng interface không phù hợp",
      "Khi tích hợp third-party library cần giữ interface riêng",
      "Khi refactor legacy code mà không muốn phá vỡ API hiện tại",
      "Khi cần reuse một số subclasses thiếu chức năng chung"
    ],
    whenNotToUse: [
      "Khi có thể modify source class trực tiếp",
      "Khi adapter layer tạo thêm quá nhiều complexity",
      "Khi performance overhead của extra indirection không chấp nhận được"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Client → IPaymentGateway → Adapter → Stripe/VNPay SDK (Adaptee) → convert result → Client
// ════════════════════════════════════════════════════════════════
// Vấn đề: Stripe SDK có interface KHÁC với những gì app cần.
// Adapter là "ổ cắm chuyển đổi": giữ nguyên Target interface, bên trong gọi Adaptee.

// === BƯỚC 1: Target interface – những gì app cần ===
// IPaymentGateway là interface "nội bộ" của chúng ta, được thiết kế theo business domain.
// Client code (OrderService, PaymentController) chỉ biết interface này.
// → Swap từ Stripe sang VNPay: chỉ đổi DI registration, KHÔNG sửa OrderService
public interface IPaymentGateway
{
    Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct);
    Task<RefundResult> RefundAsync(string transactionId, decimal amount, CancellationToken ct);
    Task<PaymentStatus> GetStatusAsync(string transactionId, CancellationToken ct);
}

// Record types – immutable data containers, auto-generate Equals/GetHashCode/ToString
public record PaymentRequest(decimal Amount, string Currency, string CardToken, string Description);
public record PaymentResult(bool Success, string TransactionId, string? ErrorMessage);
public record RefundResult(bool Success, string RefundId, string? ErrorMessage);
// Enum normalize các status string khác nhau ("succeeded", "00", "PAID") thành giá trị thống nhất
public enum PaymentStatus { Pending, Completed, Failed, Refunded }

// === BƯỚC 2: Adaptee – Stripe SDK với interface không tương thích ===
// StripeClient là class của third-party – chúng ta KHÔNG sửa được.
// Nó dùng: StripeChargeOptions (khác PaymentRequest), trả về StripeCharge (khác PaymentResult)
// Đặc biệt: Stripe tính tiền bằng CENTS (100 = $1), app ta dùng decimal ($99.99)
public class StripeClient
{
    // Stripe API: CreateChargeAsync nhận StripeChargeOptions, KHÔNG nhận PaymentRequest
    public async Task<StripeCharge> CreateChargeAsync(StripeChargeOptions options)
        => await Task.FromResult(new StripeCharge { Id = "ch_123", Status = "succeeded" });

    // Stripe refund: nhận chargeId và amountInCents (long), không phải decimal
    public async Task<StripeRefund> CreateRefundAsync(string chargeId, long amountInCents)
        => await Task.FromResult(new StripeRefund { Id = "re_123", Status = "succeeded" });

    // Retrieve: trả về StripeCharge với Status là string ("succeeded", "pending", "failed")
    public async Task<StripeCharge> RetrieveChargeAsync(string chargeId)
        => await Task.FromResult(new StripeCharge { Id = chargeId, Status = "succeeded" });
}

// === BƯỚC 3: Adapter – cầu nối giữa Target và Adaptee ===
// StripePaymentAdapter IMPLEMENT IPaymentGateway (Target) nhưng bên trong GỌI StripeClient (Adaptee)
// Nhiệm vụ: chuyển đổi PaymentRequest → StripeChargeOptions, StripeCharge → PaymentResult
public class StripePaymentAdapter(StripeClient stripeClient) : IPaymentGateway
{
    public async Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct)
    {
        try
        {
            // Data transformation: PaymentRequest → StripeChargeOptions
            var options = new StripeChargeOptions
            {
                // Stripe tính tiền bằng cents → nhân 100: $99.99 → 9999 cents
                // Đây là ví dụ điển hình của "impedance mismatch" mà Adapter giải quyết
                Amount = (long)(request.Amount * 100),
                // Stripe yêu cầu lowercase: "USD" → "usd"
                Currency = request.Currency.ToLower(),
                Source = request.CardToken,
                Description = request.Description
            };

            var charge = await stripeClient.CreateChargeAsync(options);

            // Data transformation: StripeCharge → PaymentResult (normalized)
            return charge.Status == "succeeded"
                ? new PaymentResult(true, charge.Id, null)
                : new PaymentResult(false, string.Empty, "Payment declined");
        }
        catch (StripeException ex)
        {
            // Bắt Stripe-specific exception → convert sang generic result
            // Client không cần biết StripeException tồn tại
            return new PaymentResult(false, string.Empty, ex.Message);
        }
    }

    public async Task<RefundResult> RefundAsync(
        string transactionId, decimal amount, CancellationToken ct)
    {
        // Convert decimal → long (cents): bước chuyển đổi đơn vị tiền tệ
        var amountInCents = (long)(amount * 100);
        var refund = await stripeClient.CreateRefundAsync(transactionId, amountInCents);

        return refund.Status == "succeeded"
            ? new RefundResult(true, refund.Id, null)
            : new RefundResult(false, string.Empty, "Refund failed");
    }

    public async Task<PaymentStatus> GetStatusAsync(string transactionId, CancellationToken ct)
    {
        var charge = await stripeClient.RetrieveChargeAsync(transactionId);
        // Switch expression: map Stripe string status → enum (normalized)
        // VNPay sẽ có các status string khác → adapter của VNPay map khác
        return charge.Status switch
        {
            "succeeded" => PaymentStatus.Completed,
            "pending"   => PaymentStatus.Pending,
            "failed"    => PaymentStatus.Failed,
            _           => PaymentStatus.Failed // Unknown status → treat as failed
        };
    }
}

// === BƯỚC 4: VNPay Adapter – cùng Target interface, Adaptee hoàn toàn khác ===
// VNPay API: khác hoàn toàn về tên method, cấu trúc request/response, đơn vị tiền tệ
// Nhưng sau khi bọc trong adapter → client code KHÔNG thấy sự khác biệt
public class VnPayAdapter(VnPayClient vnPayClient, IOptions<VnPaySettings> settings)
    : IPaymentGateway
{
    public async Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct)
    {
        // VNPay dùng VND (đã là đơn vị nhỏ nhất) → KHÔNG nhân 100
        var vnpayRequest = new VnPayTransactionRequest
        {
            TmnCode  = settings.Value.TmnCode,  // Terminal code – VNPay merchant ID
            Amount   = (long)request.Amount,    // VND, không cần convert
            OrderInfo = request.Description,    // Stripe dùng "Description", VNPay dùng "OrderInfo"
            ReturnUrl = settings.Value.ReturnUrl // VNPay là redirect-based, Stripe là API-based
        };

        var result = await vnPayClient.CreateTransactionAsync(vnpayRequest);
        // VNPay dùng ResponseCode "00" = thành công (không phải "succeeded")
        return result.ResponseCode == "00"
            ? new PaymentResult(true, result.TransactionNo, null)
            : new PaymentResult(false, string.Empty, result.Message);
    }

    public Task<RefundResult> RefundAsync(string transactionId, decimal amount, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<PaymentStatus> GetStatusAsync(string transactionId, CancellationToken ct)
        => throw new NotImplementedException();
}

// === BƯỚC 5: DI Registration – một dòng duy nhất để swap payment provider ===
builder.Services.AddSingleton<StripeClient>(sp =>
    new StripeClient { ApiKey = builder.Configuration["Stripe:ApiKey"] });

// Đây là dòng DUY NHẤT cần thay đổi để swap từ Stripe sang VNPay:
builder.Services.AddScoped<IPaymentGateway, StripePaymentAdapter>();
// Hoặc: builder.Services.AddScoped<IPaymentGateway, VnPayAdapter>();
// OrderService, PaymentController, InvoiceService... đều KHÔNG cần sửa!`,
    umlDiagram: `┌────────┐    ┌──────────┐    ┌──────────┐
│ Client │───▶│  Target  │    │ Adaptee  │
└────────┘    ├──────────┤    ├──────────┤
              │+Request()│    │+SpecReq()│
              └──────────┘    └──────────┘
                    ▲                ▲
                    │                │
              ┌───────────────────────┐
              │       Adapter         │
              ├───────────────────────┤
              │+Request()             │
              │  → adaptee.SpecReq()  │
              └───────────────────────┘`
  },
  {
    id: "bridge",
    name: "Bridge",
    nameVi: "Bridge - Cầu Nối",
    category: "structural",
    categoryVi: "Cấu Trúc",
    priority: "low",
    readingTime: 14,
    phase: 3,
    description: "Tách biệt abstraction khỏi implementation để cả hai có thể thay đổi độc lập với nhau. Sử dụng composition thay vì inheritance.",
    intent: "Phân tách một abstraction lớn thành hai hệ thống phân cấp riêng biệt – abstraction và implementation – có thể phát triển độc lập.",
    dotnetExample: "Device/Remote control analogy trong WPF, ADO.NET với DbConnection abstraction, ILogger với multiple sinks (Console, File, Database).",
    whenToUse: [
      "Khi muốn tránh binding vĩnh viễn giữa abstraction và implementation",
      "Khi cả abstraction và implementation cần được extended qua subclassing",
      "Khi thay đổi implementation không nên ảnh hưởng đến client code",
      "Khi cần chia sẻ implementation giữa nhiều objects"
    ],
    whenNotToUse: [
      "Khi chỉ có một implementation – over-engineering",
      "Khi class hierarchy không có khả năng phát triển nhiều chiều"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Client tạo Notification(Channel) → gọi SendAsync → Notification format → Channel gửi
// ════════════════════════════════════════════════════════════════
// Vấn đề Bridge giải quyết: nếu dùng inheritance:
// UrgentEmailNotification, UrgentSmsNotification, ScheduledEmailNotification, ScheduledSmsNotification...
// N loại notification × M kênh gửi = N×M classes → "class explosion"
// Bridge tách thành 2 hierarchy độc lập: Notification (N) + Channel (M) → N+M classes

// === BƯỚC 1: Implementation interface – kênh gửi thông báo ===
// INotificationChannel là một "dimension" của Bridge: kênh gửi
// Bổ sung kênh mới (Zalo, Slack)? Thêm class implement interface này, KHÔNG sửa Notification
public interface INotificationChannel
{
    Task SendAsync(string recipient, string content, CancellationToken ct);
    // SupportsRichContent cho phép Abstraction điều chỉnh format nội dung theo kênh
    bool SupportsRichContent { get; }
}

// === BƯỚC 2: Concrete Implementations – các kênh gửi cụ thể ===
// EmailChannel biết cách gửi qua SMTP, hỗ trợ HTML
public class EmailChannel(ISmtpClient smtpClient) : INotificationChannel
{
    // Email hỗ trợ HTML → Abstraction có thể format content với tags HTML
    public bool SupportsRichContent => true;

    public async Task SendAsync(string recipient, string content, CancellationToken ct)
    {
        var message = new MailMessage
        {
            To = { recipient },
            Subject = "Notification",
            Body = content,
            IsBodyHtml = SupportsRichContent // true → Email client sẽ render HTML
        };
        await smtpClient.SendMailAsync(message, ct);
    }
}

// SmsChannel biết cách gửi qua Twilio, giới hạn 160 ký tự
public class SmsChannel(ITwilioClient twilioClient) : INotificationChannel
{
    // SMS không hỗ trợ HTML → Abstraction sẽ dùng plain text format
    public bool SupportsRichContent => false;

    public async Task SendAsync(string recipient, string content, CancellationToken ct)
    {
        // SMS giới hạn 160 ký tự – truncate và thêm "..." nếu dài hơn
        // [..157]: Range operator C# – lấy 157 ký tự đầu (an toàn hơn Substring)
        var smsContent = content.Length > 160
            ? content[..157] + "..."
            : content;
        await twilioClient.SendSmsAsync(recipient, smsContent, ct);
    }
}

// === BƯỚC 3: Abstraction – loại thông báo ===
// Notification là "dimension" thứ hai của Bridge: cách xử lý notification
// Nó GIỮ reference đến INotificationChannel (Bridge) thay vì kế thừa từ nó
public abstract class Notification
{
    // "Bridge" – reference đến implementation hierarchy
    // protected: subclass có thể dùng Channel để gọi SendAsync
    protected readonly INotificationChannel Channel;

    // Inject channel qua constructor → có thể swap channel mà không tạo class mới
    protected Notification(INotificationChannel channel) => Channel = channel;

    // Abstract: subclass quyết định CÁCH gửi (urgent, scheduled, batched...)
    public abstract Task SendAsync(NotificationData data, CancellationToken ct);

    // Shared helper: format content dựa trên khả năng của channel
    // Abstraction "biết" về Channel qua interface → không biết là Email hay SMS
    protected string FormatContent(NotificationData data)
        => Channel.SupportsRichContent
            ? $"<b>{data.Title}</b><br/>{data.Body}"  // HTML cho email
            : $"{data.Title}: {data.Body}";            // Plain text cho SMS
}

// === BƯỚC 4: Refined Abstractions – các loại notification cụ thể ===
// UrgentNotification thêm "[URGENT]" prefix – logic này KHÔNG phụ thuộc kênh gửi
public class UrgentNotification(INotificationChannel channel) : Notification(channel)
{
    public override async Task SendAsync(NotificationData data, CancellationToken ct)
    {
        // FormatContent tự điều chỉnh theo Channel.SupportsRichContent
        var content = $"[URGENT] {FormatContent(data)}";
        // Channel.SendAsync: gọi qua Bridge → không biết là Email hay SMS
        await Channel.SendAsync(data.Recipient, content, ct);
    }
}

// ScheduledNotification trì hoãn gửi – logic này cũng không phụ thuộc kênh
public class ScheduledNotification(INotificationChannel channel, TimeSpan delay)
    : Notification(channel)
{
    public override async Task SendAsync(NotificationData data, CancellationToken ct)
    {
        // Task.Delay: không block thread, yield execution trở lại thread pool
        await Task.Delay(delay, ct);
        // Sau delay: gọi Channel qua Bridge – Email hay SMS đều dùng cùng code này
        await Channel.SendAsync(data.Recipient, FormatContent(data), ct);
    }
}

// === BƯỚC 5: Usage – Bridge cho phép kết hợp tự do ===
// Tạo bất kỳ combination nào mà không cần thêm class mới
var emailUrgent    = new UrgentNotification(new EmailChannel(smtpClient));
var smsUrgent      = new UrgentNotification(new SmsChannel(twilioClient));
var emailScheduled = new ScheduledNotification(new EmailChannel(smtpClient), TimeSpan.FromHours(1));
var smsScheduled   = new ScheduledNotification(new SmsChannel(twilioClient), TimeSpan.FromHours(1));
// 2 loại notification × 2 kênh = 4 combinations chỉ với 4 dòng, KHÔNG cần 4 classes!`,
    umlDiagram: `┌─────────────────┐           ┌──────────────────┐
│  Abstraction    │           │  Implementation  │
├─────────────────┤           ├──────────────────┤
│ -impl: IImpl    │◆─────────▶│+OperationImpl()  │
│+Operation()     │           └──────────────────┘
└─────────────────┘                    ▲
        ▲                       ┌──────┴──────┐
        │                  ┌────────┐    ┌────────┐
┌───────────────┐           │ImplA   │    │ImplB   │
│RefinedAbstract│           └────────┘    └────────┘
└───────────────┘`
  },
  {
    id: "composite",
    name: "Composite",
    nameVi: "Composite - Tổng Hợp",
    category: "structural",
    categoryVi: "Cấu Trúc",
    priority: "medium",
    readingTime: 12,
    phase: 2,
    description: "Tổ chức các đối tượng thành cấu trúc cây để biểu diễn các phân cấp phần-toàn thể. Cho phép client xử lý các đối tượng đơn lẻ và các nhóm đối tượng theo cách thống nhất.",
    intent: "Xử lý các đối tượng đơn và nhóm đối tượng theo cùng một cách. Lý tưởng cho cấu trúc cây như menu navigation, file system, organization chart.",
    dotnetExample: "FileInfo/DirectoryInfo trong System.IO, XmlNode hierarchy, WPF UIElement tree, Expression trees trong LINQ, menu items trong web apps.",
    whenToUse: [
      "Khi muốn biểu diễn cấu trúc phân cấp part-whole",
      "Khi muốn client có thể ignore sự khác biệt giữa composite và individual objects",
      "Khi xây dựng tree structures như menus, file systems, org charts"
    ],
    whenNotToUse: [
      "Khi không có cấu trúc phân cấp rõ ràng",
      "Khi interface chung quá khó thiết kế cho leaf và composite"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Client gọi IsAccessibleBy()/Render() trên IMenuComponent → không quan tâm Leaf hay Composite
// ════════════════════════════════════════════════════════════════
// Composite giải quyết: "xử lý một item" và "xử lý group items" bằng CÙNG MỘT code.
// Client dùng interface IMenuComponent → không cần if/else kiểm tra là Leaf hay Composite.

// === BƯỚC 1: Component interface – giao diện chung cho cả Leaf lẫn Composite ===
// Đây là "chìa khóa" của Composite: cả MenuItem (lá) và MenuGroup (nhánh) đều implement interface này.
// Client code chỉ làm việc với IMenuComponent → không cần biết cấu trúc cây bên trong
public interface IMenuComponent
{
    string Name { get; }
    string? Icon { get; }
    // IsAccessibleBy – quy tắc phân quyền: Leaf kiểm tra roles, Composite delegate xuống children
    bool IsAccessibleBy(IEnumerable<string> userRoles);
    // GetChildren – Leaf trả về [] (rỗng), Composite trả về danh sách children
    IEnumerable<IMenuComponent> GetChildren();
    // Render với depth cho phép render cây với indentation đúng mức
    void Render(StringBuilder sb, int depth = 0);
}

// === BƯỚC 2: Leaf – node lá của cây, không có children ===
// MenuItem là phần tử đơn giản nhất: chỉ có URL, không chứa component khác
public class MenuItem : IMenuComponent
{
    public string Name { get; }
    public string? Icon { get; }
    public string Url { get; }
    // HashSet cho O(1) lookup thay vì O(n) List.Contains → quan trọng khi render menu nhiều lần
    private readonly HashSet<string> _requiredRoles;

    public MenuItem(string name, string url, string? icon = null, params string[] requiredRoles)
    {
        Name = name;
        Url = url;
        Icon = icon;
        _requiredRoles = requiredRoles.ToHashSet();
    }

    // Accessible nếu không yêu cầu role nào (public) HOẶC user có ít nhất 1 role phù hợp
    // Any() dừng ngay khi tìm thấy match đầu tiên → hiệu quả hơn Contains(all)
    public bool IsAccessibleBy(IEnumerable<string> userRoles)
        => _requiredRoles.Count == 0 || userRoles.Any(r => _requiredRoles.Contains(r));

    // Leaf không có children → trả về empty collection (không phải null!)
    // Tránh null check ở client code → Composite pattern encourage null-safe design
    public IEnumerable<IMenuComponent> GetChildren() => [];

    // Render leaf: chỉ render bản thân, không đệ quy
    public void Render(StringBuilder sb, int depth = 0)
        => sb.AppendLine($"{new string(' ', depth * 2)}<a href='{Url}'>{Name}</a>");
}

// === BƯỚC 3: Composite – node nhánh của cây, chứa các IMenuComponent khác ===
// MenuGroup có thể chứa cả MenuItem (leaf) lẫn MenuGroup khác (composite) → cây đệ quy
public class MenuGroup : IMenuComponent
{
    // Lưu children là IMenuComponent → có thể mix Leaf và Composite tự do
    private readonly List<IMenuComponent> _children = [];
    public string Name { get; }
    public string? Icon { get; }

    public MenuGroup(string name, string? icon = null)
    {
        Name = name;
        Icon = icon;
    }

    // Add/Remove để build cây dynamically
    public void Add(IMenuComponent component) => _children.Add(component);
    public void Remove(IMenuComponent component) => _children.Remove(component);

    // Composite IsAccessibleBy: accessible nếu BẤT KỲ child nào accessible
    // → tự động ẩn group nếu user không có quyền với BẤT KỲ item nào trong group
    // Any() truyền tải ý nghĩa business logic rõ ràng: "show group nếu có ít nhất 1 item được phép"
    public bool IsAccessibleBy(IEnumerable<string> userRoles)
        => _children.Any(c => c.IsAccessibleBy(userRoles));

    // Trả về children để client có thể traverse nếu cần
    public IEnumerable<IMenuComponent> GetChildren() => _children;

    // Composite Render: render bản thân + đệ quy render tất cả children với depth tăng 1
    // Đệ quy này hoạt động với bất kỳ độ sâu cây nào → không giới hạn level
    public void Render(StringBuilder sb, int depth = 0)
    {
        // <details>/<summary> là HTML5 collapsible group
        sb.AppendLine($"{new string(' ', depth * 2)}<details><summary>{Name}</summary>");
        // Gọi Render trên mỗi child: nếu child là MenuGroup → nó lại đệ quy tiếp
        foreach (var child in _children)
            child.Render(sb, depth + 1); // depth + 1 → indentation sâu hơn
        sb.AppendLine($"{new string(' ', depth * 2)}</details>");
    }
}

// === BƯỚC 4: Builder helper – tạo menu tree với collection initializer ===
// {{ }} là C# object initializer cho class: gọi Add() ngầm sau constructor
public static class MenuBuilder
{
    public static IMenuComponent BuildAdminMenu() =>
        new MenuGroup("Admin", "fa-cog")
        {{
            Add(new MenuItem("Dashboard", "/admin/dashboard", "fa-home")); // Public – không cần role
            Add(new MenuGroup("User Management", "fa-users")              // Composite lồng nhau
            {{
                Add(new MenuItem("Users", "/admin/users", "fa-user", "Admin", "SuperAdmin"));
                Add(new MenuItem("Roles", "/admin/roles", "fa-shield", "SuperAdmin")); // Chỉ SuperAdmin
            }});
            Add(new MenuGroup("Reports", "fa-chart-bar")
            {{
                Add(new MenuItem("Sales", "/reports/sales", requiredRoles: "Admin", "Manager"));
                Add(new MenuItem("Audit Log", "/reports/audit", requiredRoles: "SuperAdmin"));
            }});
        }};
}

// === BƯỚC 5: Client code – xử lý cả cây với thuật toán đệ quy duy nhất ===
var menu = MenuBuilder.BuildAdminMenu();
var userRoles = new[] { "Admin" };

// Hàm này hoạt động với BẤT KỲ IMenuComponent: Leaf hoặc Composite
// Client KHÔNG cần biết hay kiểm tra kiểu – đây là ưu điểm cốt lõi của Composite
IEnumerable<IMenuComponent> TraverseAccessible(IMenuComponent component, IEnumerable<string> roles)
{
    if (!component.IsAccessibleBy(roles)) yield break; // Cắt tỉa nhánh không có quyền
    yield return component;
    // GetChildren() trả về [] nếu là Leaf → foreach không chạy → đệ quy dừng tự nhiên
    foreach (var child in component.GetChildren())
        foreach (var accessible in TraverseAccessible(child, roles))
            yield return accessible; // yield + recursion = lazy traversal toàn cây
}`,
    umlDiagram: `       ┌──────────────┐
       │  Component   │
       ├──────────────┤
       │+Operation()  │
       │+Add()        │
       └──────────────┘
              ▲
       ┌──────┴──────┐
       │             │
  ┌────────┐  ┌────────────┐
  │  Leaf  │  │ Composite  │
  ├────────┤  ├────────────┤
  │+Op()   │  │-children[] │
  └────────┘  │+Operation()│──▶ children.Op()
              │+Add()      │
              └────────────┘`
  },
  {
    id: "decorator",
    name: "Decorator",
    nameVi: "Decorator - Trang Trí",
    category: "structural",
    categoryVi: "Cấu Trúc",
    priority: "high",
    readingTime: 15,
    phase: 1,
    description: "Gắn thêm trách nhiệm vào một đối tượng một cách động. Decorator cung cấp một giải pháp linh hoạt thay thế cho subclassing để mở rộng chức năng.",
    intent: "Mở rộng chức năng của đối tượng mà không cần kế thừa, bằng cách 'bọc' đối tượng trong các decorator objects có cùng interface.",
    dotnetExample: "ASP.NET Core Middleware pipeline, ILogger decorators, Stream classes (BufferedStream, CryptoStream, GZipStream), DelegatingHandler trong HttpClient.",
    whenToUse: [
      "Khi cần thêm chức năng vào object mà không ảnh hưởng đến objects khác",
      "Khi extension bằng inheritance không thực tế hoặc không thể",
      "Khi cần thêm/bớt chức năng dynamically tại runtime",
      "Khi có nhiều feature combinations và inheritance tạo class explosion"
    ],
    whenNotToUse: [
      "Khi decorator order quan trọng và khó kiểm soát",
      "Khi chỉ cần thêm một tính năng đơn giản",
      "Khi decorator stack quá sâu gây khó debug"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Client → Logged → Cached → ProductRepository (DB) → ngược lại trả kết quả
// ════════════════════════════════════════════════════════════════
// Decorator giải quyết: thêm cross-cutting concerns (cache, log) mà KHÔNG sửa ProductRepository.
// Mỗi decorator "bọc" decorator bên trong – gọi inner.Method() và thêm behavior trước/sau.

// === BƯỚC 1: Interface "hợp đồng" – tất cả decorators phải implement ===
// Tất cả decorators PHẢI implement interface này để client không biết sự khác biệt.
// Nếu thêm method vào đây: tất cả decorators đều phải cập nhật → trade-off của pattern
public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct);
    Task<Product> CreateAsync(Product product, CancellationToken ct);
    Task UpdateAsync(Product product, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
}

// === BƯỚC 2: ConcreteComponent – implementation thực sự, làm việc với DB ===
// ProductRepository chỉ lo về DB logic, KHÔNG biết có cache hay logging bên ngoài.
// Tuân thủ SRP (Single Responsibility): chỉ một lý do để thay đổi – khi DB schema thay đổi
public class ProductRepository(AppDbContext dbContext) : IProductRepository
{
    // FindAsync: EF Core tìm theo PK, có tracking context → phù hợp cho Update/Delete sau
    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
        => await dbContext.Products.FindAsync([id], ct);

    // AsNoTracking: không track thay đổi → nhanh hơn, ít memory hơn cho read-only queries
    public async Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct)
        => await dbContext.Products.AsNoTracking().ToListAsync(ct);

    public async Task<Product> CreateAsync(Product product, CancellationToken ct)
    {
        dbContext.Products.Add(product); // Track entity → EF biết cần INSERT
        await dbContext.SaveChangesAsync(ct); // Commit → gửi INSERT lên DB
        return product; // Trả về entity đã có Id (được DB gán)
    }

    public async Task UpdateAsync(Product product, CancellationToken ct)
    {
        dbContext.Products.Update(product); // Đánh dấu entity là Modified
        await dbContext.SaveChangesAsync(ct); // Commit → UPDATE SQL
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var product = await GetByIdAsync(id, ct);
        if (product != null)
        {
            dbContext.Products.Remove(product); // Đánh dấu Deleted
            await dbContext.SaveChangesAsync(ct); // Commit → DELETE SQL
        }
    }
}

// === BƯỚC 3: Caching Decorator – thêm caching mà không sửa ProductRepository ===
// inner là IProductRepository được inject → có thể là ProductRepository hoặc decorator khác
// Điều này cho phép chain decorators: LoggedRepo → CachedRepo → ProductRepo
public class CachedProductRepository(
    IProductRepository inner,       // Delegate đến đây sau khi xử lý cache
    IMemoryCache cache,
    IOptions<CacheOptions> options) : IProductRepository
{
    // Cache key convention: "product:{id}" → dễ debug, dễ invalidate
    private static string CacheKey(Guid id) => $"product:{id}";
    private const string AllProductsKey = "products:all";

    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        // Cache hit: trả về ngay, không gọi DB → đây là giá trị của cache decorator
        if (cache.TryGetValue(CacheKey(id), out Product? cached))
            return cached;

        // Cache miss: delegate xuống inner (ProductRepository hoặc decorator khác)
        var product = await inner.GetByIdAsync(id, ct);
        if (product != null)
            // Set cache với TTL từ config → sản phẩm sẽ tự động expire
            cache.Set(CacheKey(id), product, options.Value.ProductExpiry);
        return product;
    }

    public async Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct)
    {
        if (cache.TryGetValue(AllProductsKey, out IEnumerable<Product>? cached))
            return cached!;
        var products = await inner.GetAllAsync(ct);
        cache.Set(AllProductsKey, products, options.Value.ListExpiry);
        return products;
    }

    // Write operations: delegate first, then INVALIDATE cache
    // Thứ tự này quan trọng: tránh cache inconsistency nếu DB operation thất bại
    public async Task<Product> CreateAsync(Product product, CancellationToken ct)
    {
        var created = await inner.CreateAsync(product, ct);
        // Sản phẩm mới được thêm → list cache lỗi thời, cần xóa để GetAll() lấy lại từ DB
        cache.Remove(AllProductsKey);
        return created;
    }

    public async Task UpdateAsync(Product product, CancellationToken ct)
    {
        await inner.UpdateAsync(product, ct);
        // Xóa cả cache theo id lẫn list cache → đảm bảo consistency
        cache.Remove(CacheKey(product.Id));
        cache.Remove(AllProductsKey);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        await inner.DeleteAsync(id, ct);
        cache.Remove(CacheKey(id));
        cache.Remove(AllProductsKey);
    }
}

// === BƯỚC 4: Logging Decorator – thêm observability không xâm phạm business logic ===
// Bọc ngoài CachedProductRepository → log cả thời gian kể cả việc cache hit/miss
public class LoggedProductRepository(
    IProductRepository inner,
    ILogger<LoggedProductRepository> logger) : IProductRepository
{
    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        // Structured logging: {ProductId} là named property → dễ query trong Seq/Kibana
        logger.LogDebug("Fetching product {ProductId}", id);
        var sw = Stopwatch.StartNew(); // Đo thời gian bao gồm cả cache lookup
        var result = await inner.GetByIdAsync(id, ct);
        // Log kết quả + thời gian: giúp phát hiện performance issues
        logger.LogDebug("Fetched product {ProductId} in {ElapsedMs}ms, Found: {Found}",
            id, sw.ElapsedMilliseconds, result != null);
        return result;
    }
    // Các method còn lại: delegate trực tiếp (có thể thêm logging tương tự nếu cần)
    public Task<IEnumerable<Product>> GetAllAsync(CancellationToken ct) => inner.GetAllAsync(ct);
    public Task<Product> CreateAsync(Product product, CancellationToken ct) => inner.CreateAsync(product, ct);
    public Task UpdateAsync(Product product, CancellationToken ct) => inner.UpdateAsync(product, ct);
    public Task DeleteAsync(Guid id, CancellationToken ct) => inner.DeleteAsync(id, ct);
}

// === BƯỚC 5: DI Registration – Scrutor library tự động wrap decorators ===
// Thứ tự Decorate() quyết định thứ tự gọi: decorator sau bọc ngoài decorator trước
builder.Services.AddScoped<IProductRepository, ProductRepository>(); // Base
builder.Services.Decorate<IProductRepository, CachedProductRepository>(); // Wrap ProductRepository
builder.Services.Decorate<IProductRepository, LoggedProductRepository>(); // Wrap CachedProductRepository
// Kết quả: Client → LoggedProductRepository → CachedProductRepository → ProductRepository
// Đọc giải thích: "Log" bọc ngoài cùng → logged → check cache → nếu miss thì query DB`,
    umlDiagram: `  ┌─────────────┐
  │  Component  │
  ├─────────────┤
  │+Operation() │
  └─────────────┘
         ▲
  ┌──────┴──────┐
  │             │
┌──────┐  ┌──────────────┐
│Concr.│  │  Decorator   │
│Comp. │  ├──────────────┤
└──────┘  │-wrappee:Comp │
          │+Operation()  │──▶ wrappee.Op()
          └──────────────┘
                 ▲
          ┌──────┴───────┐
     ┌─────────┐   ┌─────────┐
     │DecorA   │   │DecorB   │
     └─────────┘   └─────────┘`
  },
  {
    id: "facade",
    name: "Facade",
    nameVi: "Facade - Mặt Tiền",
    category: "structural",
    categoryVi: "Cấu Trúc",
    priority: "high",
    readingTime: 11,
    phase: 1,
    description: "Cung cấp một interface đơn giản hóa cho một hệ thống con phức tạp. Facade ẩn đi độ phức tạp của subsystem và cung cấp một interface đơn giản hơn để client sử dụng.",
    intent: "Giảm sự phụ thuộc của client vào các thành phần nội bộ phức tạp bằng cách cung cấp một API gọn gàng, dễ sử dụng.",
    dotnetExample: "MediaR trong CQRS, ASP.NET Core app.UseXxx() middleware, Entity Framework DbContext facade cho database operations, SignalR hubs.",
    whenToUse: [
      "Khi cần interface đơn giản cho subsystem phức tạp",
      "Khi muốn layer hóa subsystem để giảm dependencies",
      "Khi có nhiều dependencies giữa clients và implementation classes",
      "Khi tích hợp với external services cần simplification layer"
    ],
    whenNotToUse: [
      "Khi facade trở thành God Object chứa quá nhiều logic",
      "Khi cần expose toàn bộ functionality của subsystem",
      "Khi tạo thêm layer không có giá trị thực sự"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Controller → OrderFacade.PlaceOrderAsync() → Inventory → Payment → Order → Shipping → Notification
// ════════════════════════════════════════════════════════════════
// Facade ẩn đi sự phức tạp của 5 subsystems.
// Controller chỉ gọi 1 method → Facade điều phối toàn bộ workflow bên trong.

// === BƯỚC 1: Các subsystem độc lập – mỗi cái có bounded context riêng ===
// Các class này phát triển độc lập. InventoryService không biết PaymentService tồn tại.
// Nếu không có Facade: Controller phải biết tất cả 5 services và thứ tự gọi → tight coupling

public class InventoryService
{
    // Kiểm tra tồn kho trước khi đặt hàng – nếu hết hàng → dừng sớm, không charge tiền
    public async Task<bool> CheckAvailabilityAsync(Guid productId, int quantity)
        => await Task.FromResult(true);
    // Reserve (giữ hàng) trước khi charge tiền → tránh overselling
    public async Task ReserveStockAsync(Guid productId, int quantity)
        => await Task.CompletedTask;
    // Release reservation nếu payment thất bại → rollback để hàng available trở lại
    public async Task ReleaseReservationAsync(Guid productId, int quantity)
        => await Task.CompletedTask;
}

public class PaymentService
{
    // Charge tiền – chỉ gọi SAU KHI reserve thành công → tránh charge khi hết hàng
    public async Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request)
        => await Task.FromResult(new PaymentResult(true, "txn_123", null));
    // Refund – gọi khi cần rollback sau khi đã charge thành công
    public async Task RefundAsync(string transactionId) => await Task.CompletedTask;
}

public class ShippingService
{
    // Tạo shipment – chỉ gọi SAU KHI order được lưu vào DB và payment confirmed
    public async Task<ShippingLabel> CreateShipmentAsync(ShippingRequest request)
        => await Task.FromResult(new ShippingLabel("TRACK123", DateTime.UtcNow.AddDays(3)));
    public async Task CancelShipmentAsync(string trackingNumber) => await Task.CompletedTask;
}

public class NotificationService
{
    // Gửi email xác nhận – không ảnh hưởng đến success/failure của order
    public async Task SendOrderConfirmationAsync(Order order, string email)
        => await Task.CompletedTask;
    public async Task SendShippingNotificationAsync(Order order, string trackingNumber)
        => await Task.CompletedTask;
}

// === BƯỚC 2: FACADE – tập trung toàn bộ orchestration logic ===
// OrderFacade là "mặt tiền" duy nhất mà client cần biết.
// Nó biết: thứ tự gọi, compensation logic (rollback), error handling.
// Controller KHÔNG cần biết những điều này → Separation of Concerns
public class OrderFacade(
    InventoryService inventoryService,
    PaymentService paymentService,
    ShippingService shippingService,
    NotificationService notificationService,
    IOrderRepository orderRepository,
    ILogger<OrderFacade> logger)
{
    public async Task<OrderResult> PlaceOrderAsync(
        PlaceOrderCommand command, CancellationToken ct)
    {
        logger.LogInformation("Processing order for customer {CustomerId}", command.CustomerId);

        // BƯỚC A: Kiểm tra tồn kho tất cả items TRƯỚC khi reserve bất kỳ item nào
        // Tại sao? Tránh trường hợp reserve 3/5 items rồi thất bại → phải rollback
        foreach (var item in command.Items)
        {
            if (!await inventoryService.CheckAvailabilityAsync(item.ProductId, item.Quantity))
                return OrderResult.Failure($"Product {item.ProductId} is out of stock");
        }

        // BƯỚC B: Reserve inventory – lưu lại những gì đã reserve để có thể rollback
        var reservations = new List<(Guid ProductId, int Quantity)>();
        try
        {
            foreach (var item in command.Items)
            {
                await inventoryService.ReserveStockAsync(item.ProductId, item.Quantity);
                // Ghi lại mỗi reservation ngay sau khi thành công → rollback chính xác
                reservations.Add((item.ProductId, item.Quantity));
            }

            // BƯỚC C: Charge tiền – sau khi inventory đã được giữ
            var paymentResult = await paymentService.ProcessPaymentAsync(
                new PaymentRequest(command.TotalAmount, command.Currency, command.PaymentToken, "Order"));

            if (!paymentResult.Success)
            {
                // Compensation: giải phóng tất cả reservation vì payment thất bại
                // Facade biết phải làm gì khi failure → Controller không cần biết
                foreach (var (productId, quantity) in reservations)
                    await inventoryService.ReleaseReservationAsync(productId, quantity);
                return OrderResult.Failure(paymentResult.ErrorMessage!);
            }

            // BƯỚC D: Tạo order record trong DB – sau khi payment confirmed
            var order = await orderRepository.CreateAsync(new Order
            {
                CustomerId = command.CustomerId,
                Items = command.Items.Select(i => new OrderItem(i.ProductId, i.Quantity, i.Price)).ToList(),
                TotalAmount = command.TotalAmount,
                PaymentTransactionId = paymentResult.TransactionId, // Lưu để có thể refund sau
                Status = OrderStatus.Confirmed
            }, ct);

            // BƯỚC E: Tạo shipment sau khi order record tồn tại (cần order.Id)
            var shippingLabel = await shippingService.CreateShipmentAsync(
                new ShippingRequest(order.Id, command.ShippingAddress));

            // BƯỚC F: Gửi notifications – best effort, không rollback nếu thất bại
            await notificationService.SendOrderConfirmationAsync(order, command.CustomerEmail);
            await notificationService.SendShippingNotificationAsync(order, shippingLabel.TrackingNumber);

            logger.LogInformation("Order {OrderId} placed successfully", order.Id);
            return OrderResult.Success(order.Id, shippingLabel.TrackingNumber);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to place order for customer {CustomerId}", command.CustomerId);
            // Compensate: giải phóng tất cả reservations đã thực hiện
            // Đây là "saga compensation" – Facade quản lý distributed transaction thủ công
            foreach (var (productId, quantity) in reservations)
                await inventoryService.ReleaseReservationAsync(productId, quantity);
            throw; // Re-throw để caller biết có lỗi
        }
    }
}

// === BƯỚC 3: Controller – thin controller, chỉ delegate đến Facade ===
// Controller không biết InventoryService, PaymentService, ShippingService... tồn tại.
// Điều này đúng theo Clean Architecture: Controller chỉ handle HTTP, không handle business.
[ApiController, Route("api/orders")]
public class OrdersController(OrderFacade orderFacade) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> PlaceOrder(
        [FromBody] PlaceOrderCommand command, CancellationToken ct)
    {
        var result = await orderFacade.PlaceOrderAsync(command, ct);
        // 201 Created với Location header nếu thành công, 400 nếu thất bại
        return result.IsSuccess
            ? CreatedAtAction(nameof(GetOrder), new { id = result.OrderId }, result)
            : BadRequest(result.ErrorMessage);
    }

    [HttpGet("{id}")] public IActionResult GetOrder(Guid id) => Ok();
}`,
    umlDiagram: `         ┌─────────────┐
Client──▶│   Facade    │
         ├─────────────┤
         │+Operation() │
         └─────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐
│SubSys │ │SubSys │ │SubSys │
│   A   │ │   B   │ │   C   │
└───────┘ └───────┘ └───────┘`
  },
  {
    id: "flyweight",
    name: "Flyweight",
    nameVi: "Flyweight - Trọng Lượng Nhẹ",
    category: "structural",
    categoryVi: "Cấu Trúc",
    priority: "low",
    readingTime: 11,
    phase: 4,
    description: "Chia sẻ dữ liệu chung giữa nhiều đối tượng nhỏ để tiết kiệm bộ nhớ. Phân tách trạng thái của đối tượng thành intrinsic (chia sẻ được) và extrinsic (không chia sẻ).",
    intent: "Giảm memory footprint bằng cách chia sẻ data chung giữa nhiều objects tương tự, thay vì mỗi object giữ bản copy riêng.",
    dotnetExample: "String interning trong .NET, font rendering trong WPF, particle systems trong game engines, compiled regex patterns, database connection pooling.",
    whenToUse: [
      "Khi ứng dụng cần tạo số lượng rất lớn objects tương tự",
      "Khi memory usage là vấn đề nghiêm trọng",
      "Khi objects có thể chia sẻ extrinsic state",
      "Khi nhiều groups of objects khác nhau chỉ ở extrinsic state"
    ],
    whenNotToUse: [
      "Khi số lượng object không đủ lớn để tiết kiệm đáng kể",
      "Khi overhead của flyweight factory phức tạp hơn lợi ích",
      "Khi objects không có shared state"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Client → Factory.GetIconAsync("save") → lần 1: load SVG → cache → lần 2+: trả cache
// ════════════════════════════════════════════════════════════════
// Flyweight giải quyết: 1000 buttons đều dùng icon "save" nhưng SVG data chỉ load 1 lần.
// Tách state thành: Intrinsic (chia sẻ, bất biến) và Extrinsic (riêng mỗi lần dùng, truyền vào)

// === BƯỚC 1: Hiểu Intrinsic vs Extrinsic state ===
// INTRINSIC: dữ liệu không thay đổi theo context → CÓ THỂ chia sẻ
//   - SVG content của icon "save": luôn giống nhau, bất kể dùng ở đâu
//   - Alt text, width, height: cố định theo icon
// EXTRINSIC: dữ liệu phụ thuộc vào context cụ thể → PHẢI truyền vào khi dùng
//   - Màu sắc: button này dùng đỏ, button kia dùng xanh
//   - Kích thước hiển thị: sidebar 16px, toolbar 24px, header 32px
//   - CSS class: "icon-primary", "icon-danger"...

// IconData chứa INTRINSIC state: bất biến, chia sẻ giữa mọi button dùng cùng icon
// record → value semantics, tự động immutable nếu dùng init-only properties
public record IconData(string SvgContent, string AltText, int Width, int Height);

// === BƯỚC 2: Flyweight class – bọc intrinsic state, nhận extrinsic khi Render ===
// Icon object được share: 1000 buttons dùng icon "save" → đều trỏ đến CÙNG Icon instance
public class Icon
{
    // _sharedData là intrinsic: private, readonly, không thay đổi sau khởi tạo
    // Nhiều button instances share object này → tiết kiệm memory
    private readonly IconData _sharedData;

    public Icon(IconData sharedData) => _sharedData = sharedData;

    // Render NHẬN extrinsic state qua parameters thay vì lưu trong field
    // Nếu lưu color/displaySize vào field → mỗi button cần instance riêng → mất đi lợi ích Flyweight
    public string Render(string color, int displaySize, string? cssClass = null)
    {
        // Tính scale từ intrinsic width → extrinsic displaySize
        var scale = (double)displaySize / _sharedData.Width;
        // Raw string literal (""") C# 11: tránh escape characters phức tạp cho HTML
        return $"""
            <span class="icon {cssClass ?? ""}"
                  style="color:{color};width:{displaySize}px;height:{displaySize}px"
                  title="{_sharedData.AltText}">
                <svg viewBox="0 0 {_sharedData.Width} {_sharedData.Height}"
                     transform="scale({scale:F2})">
                    {_sharedData.SvgContent}
                </svg>
            </span>
            """;
    }
}

// === BƯỚC 3: Flyweight Factory – "nhà kho" quản lý shared instances ===
// Factory đảm bảo: mỗi iconName chỉ có DUY NHẤT một Icon instance trong memory
// Nếu không có Factory: mỗi nơi tạo Icon mới → không share được → mất đi ý nghĩa Flyweight
public class IconFactory
{
    // Dictionary là object pool: key = iconName, value = shared Icon instance
    private readonly Dictionary<string, Icon> _cache = new();
    private readonly IIconRepository _repository;

    public IconFactory(IIconRepository repository) => _repository = repository;

    public async Task<Icon> GetIconAsync(string iconName)
    {
        // Cache hit: trả về CÙNG instance cho tất cả callers
        // → 1000 callers nhận CÙNG object reference → share intrinsic state
        if (_cache.TryGetValue(iconName, out var cached))
            return cached;

        // Cache miss: load SVG từ file/DB một lần duy nhất
        var svgContent = await _repository.LoadSvgAsync(iconName);
        var iconData = new IconData(svgContent, iconName, 24, 24);
        var icon = new Icon(iconData);
        // Lưu vào cache → tất cả request sau sẽ nhận CÙNG instance này
        _cache[iconName] = icon;
        return icon;
    }

    // Theo dõi số lượng unique icons đang được share → dùng cho monitoring
    public int CachedCount => _cache.Count;
}

// === BƯỚC 4: Client code – 1000 buttons, chỉ tốn memory của số lượng icon loại ===
public class ButtonRenderer(IconFactory iconFactory)
{
    public async Task<string> RenderButtonsAsync(IEnumerable<ButtonConfig> buttons)
    {
        var sb = new StringBuilder();
        foreach (var config in buttons)
        {
            // GetIconAsync("save") lần 1: load SVG (~2KB) và cache
            // GetIconAsync("save") lần 2-1000: trả về cached instance → 0 bytes thêm
            var icon = await iconFactory.GetIconAsync(config.IconName);

            // Extrinsic state (color, size, cssClass) là riêng của mỗi button
            // Không lưu vào Icon → Icon vẫn là shared object thuần túy
            sb.Append(icon.Render(config.Color, config.Size, config.CssClass));
        }
        return sb.ToString();
    }
    // Kết quả: 1000 buttons dùng "save" icon → chỉ load SVG 1 lần (Flyweight effect!)
}

// === BƯỚC 5: String interning – Flyweight được build sẵn trong .NET CLR ===
// CLR tự động intern string literals → mọi "frequently-used-key" trong code đều share 1 object
var strings = Enumerable.Range(0, 10000)
    .Select(_ => string.Intern("frequently-used-key")) // Tất cả point đến CÙNG string object
    .ToList();
// ReferenceEquals kiểm tra pointer equality (không phải value equality)
// true → xác nhận tất cả share cùng instance → Flyweight đang hoạt động
Console.WriteLine(ReferenceEquals(strings[0], strings[9999])); // true!
// 10000 strings → chỉ 1 object trong heap → tiết kiệm ~80KB RAM`,
    umlDiagram: `┌─────────────────┐       ┌─────────────┐
│FlyweightFactory │       │  Flyweight  │
├─────────────────┤       ├─────────────┤
│-pool: Dict      │       │+Operation   │
│+GetFlyweight()  │──────▶│(extrinsic)  │
└─────────────────┘       └─────────────┘
                                  ▲
                          ┌───────┴──────┐
                     ┌──────────┐  ┌──────────┐
                     │Concrete  │  │Unshared  │
                     │Flyweight │  │Flyweight │
                     └──────────┘  └──────────┘`
  },
  {
    id: "proxy",
    name: "Proxy",
    nameVi: "Proxy - Ủy Quyền",
    category: "structural",
    categoryVi: "Cấu Trúc",
    priority: "medium",
    readingTime: 13,
    phase: 2,
    description: "Cung cấp một đối tượng thay thế hoặc placeholder cho đối tượng khác để kiểm soát quyền truy cập vào nó.",
    intent: "Kiểm soát truy cập vào một đối tượng thông qua một wrapper object. Proxy có thể thêm logging, caching, access control, lazy loading mà không thay đổi interface.",
    dotnetExample: "Entity Framework lazy loading proxies, Castle DynamicProxy, gRPC client proxies, WCF channel proxies, HttpClient với DelegatingHandler.",
    whenToUse: [
      "Lazy initialization – delay expensive object creation",
      "Access control – kiểm tra permissions trước khi delegate",
      "Remote proxy – local representative for remote service",
      "Logging/monitoring proxy – thêm cross-cutting concerns"
    ],
    whenNotToUse: [
      "Khi proxy thêm overhead không cần thiết",
      "Khi response time là critical và thêm layer gây latency",
      "Khi có thể đạt được mục đích bằng Decorator đơn giản hơn"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Client → AuthorizedDocumentService (Proxy) → kiểm tra quyền → DocumentService (Real)
// ════════════════════════════════════════════════════════════════
// Proxy "đứng giữa" client và real service – kiểm soát truy cập mà không thay đổi interface.
// Khác Decorator: Decorator thêm behavior; Proxy kiểm soát ACCESS đến subject.

// === BƯỚC 1: Subject interface – Proxy và RealSubject đều implement ===
// Client inject IDocumentService → không biết đang nhận Proxy hay Real service
public interface IDocumentService
{
    Task<Document> GetDocumentAsync(Guid id, CancellationToken ct);
    Task<Document> CreateDocumentAsync(CreateDocumentRequest request, CancellationToken ct);
    Task DeleteDocumentAsync(Guid id, CancellationToken ct);
}

// === BƯỚC 2: Real Subject – service thực sự, không biết mình có Proxy bảo vệ ===
// DocumentService chỉ lo về document operations, không lo về authorization.
// Điều này đúng theo SRP: authorization là separate concern
public class DocumentService(IDocumentRepository repo) : IDocumentService
{
    // Chỉ làm việc với DB, không kiểm tra user permissions
    public Task<Document> GetDocumentAsync(Guid id, CancellationToken ct)
        => repo.GetByIdAsync(id, ct);

    public async Task<Document> CreateDocumentAsync(
        CreateDocumentRequest request, CancellationToken ct)
    {
        // Guid.NewGuid() tạo unique id – không để DB auto-generate → client biết Id ngay
        var doc = new Document { Id = Guid.NewGuid(), Title = request.Title };
        await repo.CreateAsync(doc, ct);
        return doc;
    }

    public Task DeleteDocumentAsync(Guid id, CancellationToken ct)
        => repo.DeleteAsync(id, ct);
}

// === BƯỚC 3: Authorization Proxy – kiểm tra quyền TRƯỚC khi delegate ===
// Đây là "Protection Proxy" – bảo vệ real service khỏi unauthorized access.
// Tất cả security logic tập trung ở đây → dễ audit, dễ test, dễ thay đổi policy
public class AuthorizedDocumentService(
    IDocumentService inner,                    // Real service (hoặc proxy khác)
    IHttpContextAccessor httpContextAccessor,  // Lấy current user từ HTTP context
    IAuthorizationService authService) : IDocumentService
{
    // Property helper: truy cập user từ HTTP context một cách sạch sẽ
    private ClaimsPrincipal User => httpContextAccessor.HttpContext!.User;

    public async Task<Document> GetDocumentAsync(Guid id, CancellationToken ct)
    {
        // AuthorizeAsync kiểm tra policy "DocumentRead" với resource là document id
        // ASP.NET Core Authorization: policy có thể check ownership, role, và custom rules
        var result = await authService.AuthorizeAsync(User, id, "DocumentRead");
        if (!result.Succeeded)
            // Throw exception thay vì return null → client biết rõ lý do thất bại
            throw new UnauthorizedAccessException($"Access denied to document {id}");
        // Chỉ delegate đến real service SAU KHI xác nhận có quyền
        return await inner.GetDocumentAsync(id, ct);
    }

    public async Task<Document> CreateDocumentAsync(
        CreateDocumentRequest request, CancellationToken ct)
    {
        // resource = null: tạo mới không có resource id cụ thể để check ownership
        var result = await authService.AuthorizeAsync(User, null, "DocumentCreate");
        if (!result.Succeeded)
            throw new UnauthorizedAccessException("Not authorized to create documents");
        return await inner.CreateDocumentAsync(request, ct);
    }

    public async Task DeleteDocumentAsync(Guid id, CancellationToken ct)
    {
        // "DocumentDelete" policy có thể check: user phải là owner HOẶC có role Admin
        var result = await authService.AuthorizeAsync(User, id, "DocumentDelete");
        if (!result.Succeeded)
            throw new UnauthorizedAccessException($"Not authorized to delete document {id}");
        await inner.DeleteDocumentAsync(id, ct);
    }
}

// === BƯỚC 4: Virtual Proxy – Lazy Loading (loại Proxy khác) ===
// LazyDocumentProxy trì hoãn khởi tạo DocumentService cho đến khi thực sự cần.
// Dùng khi: DocumentService có expensive initialization (connect DB, load config...)
public class LazyDocumentProxy : IDocumentService
{
    private IDocumentService? _realService; // null cho đến khi cần lần đầu
    private readonly IServiceProvider _serviceProvider;

    public LazyDocumentProxy(IServiceProvider serviceProvider)
        => _serviceProvider = serviceProvider;

    // Lazy initialization với null-coalescing assignment (??=): thread-safe trong .NET 8
    // Lần đầu gọi: resolve từ DI container (có thể tốn kém)
    // Lần sau: trả về instance đã có sẵn → không tốn kém
    private IDocumentService RealService
        => _realService ??= _serviceProvider.GetRequiredService<DocumentService>();

    // Tất cả methods delegate đến RealService (được khởi tạo lazily)
    public Task<Document> GetDocumentAsync(Guid id, CancellationToken ct)
        => RealService.GetDocumentAsync(id, ct);
    public Task<Document> CreateDocumentAsync(CreateDocumentRequest request, CancellationToken ct)
        => RealService.CreateDocumentAsync(request, ct);
    public Task DeleteDocumentAsync(Guid id, CancellationToken ct)
        => RealService.DeleteDocumentAsync(id, ct);
}

// === BƯỚC 5: DI Registration – Proxy transparent với client ===
// DocumentService được register như concrete class (không phải interface)
// → AuthorizedDocumentService inject DocumentService trực tiếp
builder.Services.AddScoped<DocumentService>();
// IDocumentService được resolve là AuthorizedDocumentService (Proxy)
// → Client inject IDocumentService → nhận Proxy → không biết real service tồn tại
builder.Services.AddScoped<IDocumentService>(sp =>
    new AuthorizedDocumentService(
        sp.GetRequiredService<DocumentService>(),        // Real subject
        sp.GetRequiredService<IHttpContextAccessor>(),   // Lấy current user
        sp.GetRequiredService<IAuthorizationService>())); // ASP.NET Core Authorization`,
    umlDiagram: `┌────────┐    ┌───────────┐    ┌─────────────┐
│ Client │───▶│  Subject  │    │  RealSubject│
└────────┘    ├───────────┤    ├─────────────┤
              │+Request() │    │+Request()   │
              └───────────┘    └─────────────┘
                    ▲                 ▲
                    │                 │
              ┌─────────────────────┐
              │        Proxy        │
              ├─────────────────────┤
              │-realSubject         │
              │+Request()           │──▶ realSubject.Request()
              └─────────────────────┘`
  },

  // ============================================================
  // BEHAVIORAL PATTERNS (11)
  // ============================================================
  {
    id: "chain-of-responsibility",
    name: "Chain of Responsibility",
    nameVi: "Chain of Responsibility - Chuỗi Trách Nhiệm",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "high",
    readingTime: 14,
    phase: 1,
    description: "Cho phép chuyển yêu cầu dọc theo một chuỗi các handler. Mỗi handler quyết định xử lý yêu cầu hay chuyển tiếp đến handler tiếp theo.",
    intent: "Giải phóng sender khỏi việc biết receiver cụ thể. Nhiều handlers có thể xử lý một request, hoặc request được chuyển tiếp cho đến khi được xử lý.",
    dotnetExample: "ASP.NET Core Middleware pipeline, Exception handling middleware, Authorization policies, IAsyncRequestHandler pipeline trong MediatR.",
    whenToUse: [
      "Khi nhiều handler có thể xử lý một request",
      "Khi muốn issue request mà không chỉ định receiver cụ thể",
      "Khi tập hợp handlers cần được xác định dynamically",
      "Khi cần pipeline với multiple processing steps"
    ],
    whenNotToUse: [
      "Khi cần đảm bảo request được xử lý – có thể bị rớt nếu chain kết thúc",
      "Khi thứ tự handler rất quan trọng và khó kiểm soát"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Request → LoggingBehavior → ValidationBehavior → PerformanceBehavior → Handler → kết quả
// ════════════════════════════════════════════════════════════════
// Chain of Responsibility: mỗi handler trong chuỗi quyết định xử lý HOẶC chuyển tiếp cho "next".
// Đây chính xác là cách ASP.NET Core Middleware pipeline hoạt động.

// === BƯỚC 1: Định nghĩa pipeline interfaces ===
// IRequestHandler là handler cuối cùng trong chain – xử lý business logic thực sự
public interface IRequestHandler<TRequest, TResponse>
{
    Task<TResponse> HandleAsync(TRequest request, CancellationToken ct);
}

// IPipelineBehavior là mỗi "link" trong chain.
// Mỗi behavior nhận 'next' delegate → gọi next() để chuyển sang behavior tiếp theo
// KHÔNG gọi next() = "short-circuit" – dừng chain sớm (ví dụ: validation fail)
public interface IPipelineBehavior<TRequest, TResponse>
{
    Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> next, // Đây là "next handler" trong chain
        CancellationToken ct);
}

// Delegate type: đại diện cho "phần còn lại của chain"
// Khi gọi next() → thực thi behavior tiếp theo (hoặc final handler nếu là cuối chain)
public delegate Task<TResponse> RequestHandlerDelegate<TResponse>();

// === BƯỚC 2: Validation Behavior – link đầu tiên, fail-fast ===
// Nếu validation fail → throw exception → KHÔNG gọi next() → chain bị short-circuit
// Tại sao validation đứng sớm? Tiết kiệm resources: không cần log, không cần query DB
public class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators) // Inject tất cả validators cho TRequest
    : IPipelineBehavior<TRequest, TResponse>
{
    public async Task<TResponse> HandleAsync(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        // Không có validator? Bỏ qua bước này, đẩy ngay vào next
        if (!validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        // Chạy TẤT CẢ validators và gom tất cả errors (không dừng ở validator đầu tiên fail)
        var failures = validators
            .Select(v => v.Validate(context))   // Validate trả về ValidationResult
            .SelectMany(r => r.Errors)           // Flatten tất cả errors
            .Where(f => f != null)               // Lọc bỏ null
            .ToList();

        // Có lỗi → throw → controller nhận được ValidationException → trả 400 Bad Request
        // Chain bị dừng: LoggingBehavior, business logic sẽ KHÔNG được gọi
        if (failures.Count != 0)
            throw new ValidationException(failures);

        // Validation pass → chuyển sang link tiếp theo trong chain
        return await next();
    }
}

// === BƯỚC 3: Logging Behavior – bao quanh cả chain ===
// LoggingBehavior thường đứng ngoài cùng (gọi đầu tiên, kết thúc cuối cùng)
// → ghi log cả trường hợp success lẫn failure
public class LoggingBehavior<TRequest, TResponse>(
    ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
{
    public async Task<TResponse> HandleAsync(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        // Log TRƯỚC khi xử lý: biết request nào đang được xử lý
        logger.LogInformation("Handling {RequestName}: {@Request}", requestName, request);

        var sw = Stopwatch.StartNew();
        try
        {
            // Gọi phần còn lại của chain (validation, performance, business handler...)
            var response = await next();
            // Log SAU khi xử lý thành công: thời gian xử lý
            logger.LogInformation("Handled {RequestName} in {ElapsedMs}ms",
                requestName, sw.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            // Log khi có exception – trước khi re-throw
            logger.LogError(ex, "Error handling {RequestName}", requestName);
            throw; // Re-throw: không nuốt exception, chỉ log
        }
    }
}

// === BƯỚC 4: Performance Behavior – phát hiện slow requests ===
// Đứng bên trong logging behavior → đo thời gian của actual processing
public class PerformanceBehavior<TRequest, TResponse>(
    ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
{
    // 500ms là ngưỡng "slow": requests chậm hơn sẽ bị log warning để investigate
    private const int SlowRequestThresholdMs = 500;

    public async Task<TResponse> HandleAsync(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var response = await next(); // Luôn delegate – behavior này không short-circuit

        // Sau khi xử lý xong: kiểm tra thời gian
        if (sw.ElapsedMilliseconds > SlowRequestThresholdMs)
        {
            // LogWarning thay vì LogError: slow nhưng không phải lỗi
            logger.LogWarning("Slow request detected: {RequestName} took {ElapsedMs}ms",
                typeof(TRequest).Name, sw.ElapsedMilliseconds);
        }

        return response;
    }
}

// === BƯỚC 5: ASP.NET Core Middleware – Chain of Responsibility được build vào framework ===
// Mỗi Use*() call THÊM một link vào chain. Thứ tự CỰC KỲ quan trọng!
app.UseExceptionHandler(); // Bắt mọi unhandled exception → link đầu tiên, bao quanh toàn bộ
app.UseHttpsRedirection(); // Redirect HTTP → HTTPS: phải TRƯỚC authentication
app.UseAuthentication();   // Parse JWT/Cookie → đặt User principal: phải TRƯỚC Authorization
app.UseAuthorization();    // Kiểm tra quyền: phải SAU Authentication (cần User principal)
app.UseRateLimiter();      // Giới hạn request rate: sau auth để biết user nào
app.MapControllers();      // Final handler: xử lý request thực sự nếu vượt qua tất cả links`,
    umlDiagram: `Request──▶[Handler1]──▶[Handler2]──▶[Handler3]──▶null
              │              │              │
           Handle         Pass On        Handle
           or pass        to next      (final stop)

┌───────────────┐
│    Handler    │
├───────────────┤
│-next: Handler │
│+SetNext()     │
│+Handle()      │──▶ next.Handle() or process
└───────────────┘`
  },
  {
    id: "command",
    name: "Command",
    nameVi: "Command - Lệnh",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "high",
    readingTime: 16,
    phase: 1,
    description: "Đóng gói một yêu cầu thành một đối tượng, cho phép parameterize clients với các yêu cầu khác nhau, xếp hàng các yêu cầu, log các yêu cầu, và hỗ trợ undo/redo.",
    intent: "Tách biệt sender và receiver của một request. Command object chứa tất cả thông tin cần thiết để thực thi một action.",
    dotnetExample: "MediatR IRequest/IRequestHandler, CQRS Commands/Queries, Undo/Redo trong text editors, database migrations, job queues với background workers.",
    whenToUse: [
      "Khi cần parameterize objects với operations",
      "Khi cần queue, log, hoặc undo operations",
      "Khi implement CQRS architecture",
      "Khi cần scheduled commands hoặc retry logic"
    ],
    whenNotToUse: [
      "Khi business logic đơn giản không cần encapsulation",
      "Khi overhead của command classes không worth it",
      "Khi không cần undo/redo hay queuing"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Controller → Mediator.Send(Command) → Handler → Execute → PublishEvent → Response
// ════════════════════════════════════════════════════════════════
// Command pattern: đóng gói một request thành object.
// CQRS dùng Command/Query là hai loại Command riêng biệt: write (Command) và read (Query).

// === BƯỚC 1: Command – "data transfer object" cho write operations ===
// record = immutable DTO: tất cả data cần thiết để thực thi operation được đóng gói ở đây
// IRequest<CreateOrderResult> là marker: Command này sẽ trả về CreateOrderResult
// Tại sao dùng record? Hai Commands với cùng data thì bằng nhau (value equality) → dễ test
public record CreateOrderCommand(
    Guid CustomerId,
    List<OrderItemDto> Items,
    string ShippingAddress,
    string PaymentToken) : IRequest<CreateOrderResult>;

// Result cũng là record – immutable response từ handler
public record CreateOrderResult(Guid OrderId, string TrackingNumber);

// === BƯỚC 2: Command Handler – xử lý business logic ===
// Handler là "receiver" trong Command pattern: nơi business logic thực sự xảy ra.
// CreateOrderCommandHandler biết CÁCH xử lý CreateOrderCommand, Controller không cần biết.
public class CreateOrderCommandHandler(
    IOrderRepository orderRepo,
    IInventoryService inventory,
    IPaymentService payment,
    IEventBus eventBus,
    ILogger<CreateOrderCommandHandler> logger)
    : IRequestHandler<CreateOrderCommand, CreateOrderResult>
{
    public async Task<CreateOrderResult> Handle(
        CreateOrderCommand request, CancellationToken ct)
    {
        // Order.Create() là factory method trong domain model – encapsulate business rules
        // Tại sao không new Order() trực tiếp? Factory method có thể validate và raise domain events
        var order = Order.Create(request.CustomerId, request.Items, request.ShippingAddress);

        // Bước 1: Reserve inventory trước khi charge tiền → tránh charge khi hết hàng
        await inventory.ReserveAsync(order.Items, ct);

        // Bước 2: Charge payment sau khi reserve thành công
        var paymentResult = await payment.ChargeAsync(
            new PaymentRequest(order.Total, "USD", request.PaymentToken, "Order"), ct);

        // Cập nhật order với transaction id → lưu vào DB để có thể refund sau
        order.ConfirmPayment(paymentResult.TransactionId);

        // Bước 3: Persist order vào DB
        await orderRepo.CreateAsync(order, ct);

        // Bước 4: Publish domain event – Observer pattern bên trong Command pattern
        // EventBus dispatch event đến tất cả handlers quan tâm (email, inventory update...)
        await eventBus.PublishAsync(new OrderCreatedEvent(order.Id, request.CustomerId), ct);

        logger.LogInformation("Order {OrderId} created for customer {CustomerId}",
            order.Id, request.CustomerId);

        // [..8]: lấy 8 ký tự đầu của Guid → tạo tracking number ngắn gọn
        return new CreateOrderResult(order.Id, "TRACK" + order.Id.ToString()[..8].ToUpper());
    }
}

// === BƯỚC 3: Query – read operation, không thay đổi state ===
// Query là Command đặc biệt: chỉ đọc dữ liệu, không có side effects
// CQRS tách biệt Read/Write model → Query có thể optimize độc lập với Write model
public record GetOrderByIdQuery(Guid OrderId) : IRequest<OrderDetailDto?>;

public class GetOrderByIdQueryHandler(IOrderReadRepository readRepo)
    : IRequestHandler<GetOrderByIdQuery, OrderDetailDto?>
{
    // readRepo có thể là read-replica DB, cache, hay optimized read model
    // Hoàn toàn độc lập với write-side (orderRepo trong CreateOrderCommandHandler)
    public Task<OrderDetailDto?> Handle(GetOrderByIdQuery request, CancellationToken ct)
        => readRepo.GetDetailByIdAsync(request.OrderId, ct);
}

// === BƯỚC 4: Undoable Command – hỗ trợ Undo/Redo ===
// Command object lưu đủ thông tin để HOÀN TÁC operation → cơ sở của mọi undo system
public interface IUndoableCommand
{
    Task ExecuteAsync(CancellationToken ct);
    Task UndoAsync(CancellationToken ct);
    string Description { get; } // Hiển thị trong UI: "Undo: Transfer 1.000.000đ"
}

// TransferFundsCommand đóng gói tất cả thông tin cần thiết để thực thi VÀ hoàn tác
public class TransferFundsCommand(
    IBankAccountRepository repo,
    Guid fromAccountId,
    Guid toAccountId,
    decimal amount) : IUndoableCommand
{
    // :C format → hiển thị theo culture (VND: 1.000.000 ₫, USD: $1,000.00)
    public string Description => $"Transfer {amount:C} from {fromAccountId} to {toAccountId}";
    // _executed flag: bảo vệ khỏi Undo khi chưa Execute → tránh inconsistent state
    private bool _executed;

    public async Task ExecuteAsync(CancellationToken ct)
    {
        // ?? throw: null check với message rõ ràng thay vì NullReferenceException mơ hồ
        var from = await repo.GetByIdAsync(fromAccountId, ct)
            ?? throw new InvalidOperationException("Source account not found");
        var to = await repo.GetByIdAsync(toAccountId, ct)
            ?? throw new InvalidOperationException("Destination account not found");

        from.Debit(amount);  // Trừ tiền từ tài khoản nguồn
        to.Credit(amount);   // Cộng tiền vào tài khoản đích

        await repo.UpdateAsync(from, ct);
        await repo.UpdateAsync(to, ct);
        _executed = true; // Đánh dấu đã thực thi → cho phép Undo
    }

    public async Task UndoAsync(CancellationToken ct)
    {
        // Guard clause: Undo không có nghĩa nếu chưa Execute
        if (!_executed) throw new InvalidOperationException("Cannot undo: not executed");

        var from = await repo.GetByIdAsync(fromAccountId, ct)!;
        var to = await repo.GetByIdAsync(toAccountId, ct)!;

        from.Credit(amount); // Đảo ngược: cộng lại tiền cho tài khoản nguồn
        to.Debit(amount);    // Đảo ngược: trừ tiền từ tài khoản đích

        await repo.UpdateAsync(from!, ct);
        await repo.UpdateAsync(to!, ct);
        _executed = false; // Reset để có thể Execute lại (Redo sẽ gọi ExecuteAsync)
    }
}

// === BƯỚC 5: Command History – Invoker quản lý Undo/Redo stacks ===
// Hai Stack: undo stack (đã làm) + redo stack (đã undo)
// Stack phù hợp hơn List cho undo/redo: LIFO (Last In First Out) → undo theo thứ tự ngược
public class CommandHistory
{
    private readonly Stack<IUndoableCommand> _undoStack = new();
    private readonly Stack<IUndoableCommand> _redoStack = new();

    public async Task ExecuteAsync(IUndoableCommand command, CancellationToken ct)
    {
        await command.ExecuteAsync(ct);
        _undoStack.Push(command); // Lưu vào undo stack sau khi thực thi thành công
        // Clear redo stack: sau khi thực hiện action mới, không thể redo action cũ
        // Logic này giống Word/Excel: undo → type something → redo button disabled
        _redoStack.Clear();
    }

    public async Task UndoAsync(CancellationToken ct)
    {
        // TryPop: an toàn hơn Pop (không throw khi stack rỗng)
        if (!_undoStack.TryPop(out var command)) return;
        await command.UndoAsync(ct);
        _redoStack.Push(command); // Chuyển sang redo stack để có thể Redo
    }

    public async Task RedoAsync(CancellationToken ct)
    {
        if (!_redoStack.TryPop(out var command)) return;
        await command.ExecuteAsync(ct); // Thực thi lại (Execute, không phải Redo riêng)
        _undoStack.Push(command); // Chuyển về undo stack
    }
}`,
    umlDiagram: `┌──────────┐    ┌─────────┐    ┌──────────┐
│  Client  │───▶│ Command │───▶│ Receiver │
└──────────┘    ├─────────┤    ├──────────┤
                │+Execute()│   │+Action() │
                └─────────┘    └──────────┘
                      ▲
               ┌──────┴──────┐
          ┌─────────┐  ┌─────────┐
          │ConcrCmd1│  │ConcrCmd2│
          └─────────┘  └─────────┘
┌───────────┐
│  Invoker  │──stores──▶ Command
├───────────┤
│+Execute() │
└───────────┘`
  },
  {
    id: "iterator",
    name: "Iterator",
    nameVi: "Iterator - Bộ Lặp",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "low",
    readingTime: 9,
    phase: 3,
    description: "Cung cấp cách duyệt qua các phần tử của một collection mà không expose cấu trúc bên trong của nó.",
    intent: "Chuẩn hóa cách truy cập tuần tự vào các phần tử của một aggregate object, bất kể collection đó là array, list, tree hay bất kỳ cấu trúc nào.",
    dotnetExample: "IEnumerable<T>/IEnumerator<T> trong .NET, yield return, LINQ, foreach keyword, IAsyncEnumerable<T> cho async streaming.",
    whenToUse: [
      "Khi cần cách truy cập elements mà không expose internal structure",
      "Khi muốn hỗ trợ multiple traversal algorithms",
      "Khi muốn uniform interface cho traversing different collections",
      "Khi implement lazy evaluation hoặc infinite sequences"
    ],
    whenNotToUse: [
      "Khi chỉ có một simple collection – foreach đã đủ",
      "Khi không cần custom iteration logic"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Client dùng await foreach → Iterator cung cấp từng element → không cần biết nguồn dữ liệu
// ════════════════════════════════════════════════════════════════
// Iterator trong .NET được tích hợp sâu qua IEnumerable<T>/IAsyncEnumerable<T> và yield keyword.
// yield return = "trả về 1 element rồi TẠM DỪNG" – đây là lazy evaluation, không load hết memory.

// === BƯỚC 1: IAsyncEnumerable với yield – streaming data từ DB ===
// Vấn đề nếu không dùng streaming: 1 triệu orders → ToListAsync() → 1GB RAM → OutOfMemoryException
// IAsyncEnumerable giải quyết: xử lý từng batch nhỏ, chỉ tốn memory cho 1 row tại một thời điểm
public class OrderRepository
{
    private readonly AppDbContext _db;

    public OrderRepository(AppDbContext db) => _db = db;

    // async IAsyncEnumerable: method này là async iterator – kết hợp async/await và yield
    // Caller dùng 'await foreach' → thân method chạy đến 'yield return' → pause
    // → caller xử lý item → method resume → chạy tiếp đến yield return tiếp theo...
    public async IAsyncEnumerable<Order> StreamOrdersAsync(
        DateOnly fromDate,
        DateOnly toDate,
        // [EnumeratorCancellation] attribute: cho phép WithCancellation() truyền ct vào iterator
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        // DateOnly.ToDateTime cần DateTimeKind.Utc để so sánh đúng với DB timestamps
        var from = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var to = toDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        // AsAsyncEnumerable(): không ToList() – EF Core stream từng row từ DB
        // WithCancellation: kết nối CancellationToken với iterator loop
        await foreach (var order in _db.Orders
            .Where(o => o.CreatedAt >= from && o.CreatedAt <= to)
            .OrderBy(o => o.CreatedAt)
            .AsAsyncEnumerable()
            .WithCancellation(ct))
        {
            // yield return: trả về 1 order cho caller, TẠM DỪNG ở đây
            // → caller xử lý order → foreach loop chạy tiếp → yield return tiếp theo
            yield return order;
        }
    }
}

// === BƯỚC 2: Tree Iterator – duyệt cây với yield ===
// Hai thuật toán duyệt khác nhau, cùng interface IEnumerable<CategoryTree>
// Client code KHÔNG cần biết thuật toán đằng sau: TraverseDepthFirst() hay TraverseBreadthFirst()
public class CategoryTree
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<CategoryTree> Children { get; set; } = [];

    // Depth-first (DFS): đi sâu trước khi đi rộng
    // Thứ tự: root → tất cả descendants của child1 → tất cả descendants của child2...
    // yield return: CLR tự động tạo state machine để "nhớ" vị trí hiện tại trong cây
    public IEnumerable<CategoryTree> TraverseDepthFirst()
    {
        yield return this; // Trả về node hiện tại trước
        foreach (var child in Children)
            // Đệ quy: duyệt hết subtree của child → yield từng phần tử
            // foreach + yield = "flatten" recursive structure thành flat sequence
            foreach (var descendant in child.TraverseDepthFirst())
                yield return descendant;
    }

    // Breadth-first (BFS): duyệt từng level từ trên xuống
    // Dùng Queue thay Stack: Queue = FIFO → đảm bảo duyệt theo level
    // Thứ tự: root → tất cả con của root → tất cả cháu của root...
    public IEnumerable<CategoryTree> TraverseBreadthFirst()
    {
        var queue = new Queue<CategoryTree>();
        queue.Enqueue(this); // Bắt đầu từ root

        while (queue.Count > 0)
        {
            var current = queue.Dequeue(); // Lấy node tiếp theo theo FIFO
            yield return current;          // Trả về cho caller
            // Thêm tất cả children vào cuối queue → chúng sẽ được xử lý sau level này
            foreach (var child in current.Children)
                queue.Enqueue(child);
        }
    }

    // Tìm đường đi từ root đến node với targetId
    // Trả về null nếu không tìm thấy (nullable return)
    public IEnumerable<string>? FindPath(Guid targetId)
    {
        if (Id == targetId)
            return [Name]; // Tìm thấy: trả về array với tên node này

        foreach (var child in Children)
        {
            var path = child.FindPath(targetId); // Đệ quy tìm trong subtree
            if (path != null)
                // Prepend(Name): thêm tên node hiện tại vào đầu path
                // → xây dựng path từ leaf lên root (ngược chiều đệ quy)
                return path.Prepend(Name);
        }
        return null; // Không tìm thấy trong subtree này
    }
}

// === BƯỚC 3: Paginated Iterator – duyệt API nhiều trang mà không biết tổng số trang ===
// Pattern này phổ biến khi làm việc với REST API: GET /orders?page=1&size=50
// PaginatedApiIterator ẩn đi logic phân trang → client chỉ dùng await foreach
public class PaginatedApiIterator<T>(
    Func<int, int, CancellationToken, Task<PagedResult<T>>> fetchPage, // Lambda để gọi API
    int pageSize = 50) // Default 50 items/page – cân bằng memory vs round-trips
{
    public async IAsyncEnumerable<T> IterateAllAsync(
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var page = 1;
        bool hasMore;

        do
        {
            // Gọi API để lấy trang hiện tại
            var result = await fetchPage(page, pageSize, ct);
            // Yield từng item trong trang → caller xử lý từng item
            foreach (var item in result.Items)
                yield return item;

            // Heuristic: nếu nhận đúng pageSize items → có thể còn trang tiếp
            // Nếu nhận ít hơn pageSize → đây là trang cuối
            hasMore = result.Items.Count() == pageSize;
            page++;
        } while (hasMore && !ct.IsCancellationRequested); // Tôn trọng cancellation
    }
}

// === BƯỚC 4: Usage – client code đơn giản, không biết phân trang ===
var iterator = new PaginatedApiIterator<OrderDto>(
    (page, size, ct) => apiClient.GetOrdersAsync(page, size, ct));

// await foreach: .NET syntax cho IAsyncEnumerable – CLR tự gọi GetAsyncEnumerator()
// → MoveNextAsync() → Current → lặp lại cho đến hết
await foreach (var order in iterator.IterateAllAsync(cancellationToken))
{
    // Xử lý từng order: memory chỉ tốn cho 50 orders (1 page) tại một lúc
    // Không cần load tất cả orders vào memory trước khi process
    await ProcessOrderAsync(order);
}`,
    umlDiagram: `┌───────────────┐      ┌──────────────────┐
│   Aggregate   │      │    Iterator       │
├───────────────┤      ├──────────────────┤
│+CreateIterator│      │+First()           │
└───────────────┘      │+Next()            │
        ▲              │+IsDone()          │
        │              │+CurrentItem()     │
┌───────────────┐      └──────────────────┘
│ConcrAggregate │              ▲
├───────────────┤              │
│+CreateIterator│──creates──▶ ConcrIterator
└───────────────┘`
  },
  {
    id: "mediator",
    name: "Mediator",
    nameVi: "Mediator - Người Trung Gian",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "medium",
    readingTime: 14,
    phase: 2,
    description: "Định nghĩa một đối tượng encapsulate cách một tập hợp các objects tương tác. Mediator thúc đẩy loose coupling bằng cách giữ cho các objects không tham chiếu lẫn nhau.",
    intent: "Giảm sự phụ thuộc hỗn loạn giữa các objects bằng cách chuyển tất cả communication qua một mediator trung tâm.",
    dotnetExample: "MediatR library, IHubContext trong SignalR, EventAggregator trong Prism/MVVM, message brokers như MassTransit/RabbitMQ.",
    whenToUse: [
      "Khi nhiều objects communicate theo cách phức tạp và tạo ra tight coupling",
      "Khi muốn reuse components nhưng bị phụ thuộc quá nhiều",
      "Khi implement CQRS hoặc event-driven architecture",
      "Khi cần centralized communication control"
    ],
    whenNotToUse: [
      "Khi chỉ có ít objects tương tác – mediator thêm complexity không cần thiết",
      "Khi mediator trở thành God Object",
      "Khi performance-critical và thêm layer gây latency"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Controller → Mediator.Send(Command) → tìm Handler qua DI → execute pipeline → response
// ════════════════════════════════════════════════════════════════
// Mediator giảm "spaghetti dependencies": thay vì Controller biết 10 services,
// Controller chỉ biết IMediator. Mediator biết ai xử lý request nào.

// === BƯỚC 1: Marker interfaces – phân loại requests ===
// IRequest<TResponse>: request cần trả về TResponse (Command/Query)
// INotification: event publish-subscribe (không cần trả về)
public interface IRequest<TResponse> { }
public interface INotification { }

// === BƯỚC 2: Handler interfaces – ai xử lý gì ===
// Generic constraint: chỉ nhận TRequest là IRequest<TResponse> → type safety tại compile time
public interface IRequestHandler<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    Task<TResponse> Handle(TRequest request, CancellationToken ct);
}

// NotificationHandler có thể có NHIỀU implementations cho cùng TNotification
// → publish 1 event → tất cả handlers đều được gọi (fan-out)
public interface INotificationHandler<TNotification>
    where TNotification : INotification
{
    Task Handle(TNotification notification, CancellationToken ct);
}

// === BƯỚC 3: Mediator interface – trung tâm điều phối ===
public interface IMediator
{
    // Send: 1 request → 1 handler → 1 response (request-response)
    Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken ct = default);
    // Publish: 1 notification → nhiều handlers → không có response (fire-and-forget style)
    Task Publish<TNotification>(TNotification notification, CancellationToken ct = default)
        where TNotification : INotification;
}

// === BƯỚC 4: Concrete Mediator – tìm handler và build pipeline qua Reflection ===
// MakeGenericType: tạo closed generic type tại runtime – đây là "magic" của MediatR
public class Mediator(IServiceProvider serviceProvider) : IMediator
{
    public async Task<TResponse> Send<TResponse>(
        IRequest<TResponse> request, CancellationToken ct)
    {
        // Tạo type IRequestHandler<CreateOrderCommand, CreateOrderResult> tại runtime
        var handlerType = typeof(IRequestHandler<,>)
            .MakeGenericType(request.GetType(), typeof(TResponse));

        // GetRequiredService: resolve handler từ DI container → throw nếu không tìm thấy
        var handler = serviceProvider.GetRequiredService(handlerType);

        // Tương tự: tạo pipeline behavior types và resolve tất cả behaviors đã đăng ký
        var pipelineType = typeof(IPipelineBehavior<,>)
            .MakeGenericType(request.GetType(), typeof(TResponse));
        var behaviors = serviceProvider.GetServices(pipelineType).ToList();

        // Tạo final delegate: gọi handler.Handle() bằng reflection
        RequestHandlerDelegate<TResponse> handlerDelegate = () =>
            (Task<TResponse>)handlerType
                .GetMethod("Handle")!
                .Invoke(handler, [request, ct])!;

        // Bọc behaviors theo thứ tự NGƯỢC: behavior đăng ký cuối sẽ gọi đầu tiên
        // Kết quả: Behavior1 → Behavior2 → Behavior3 → Handler
        foreach (var behavior in behaviors.AsEnumerable().Reverse())
        {
            var next = handlerDelegate; // Capture current delegate (closure)
            handlerDelegate = () =>
                (Task<TResponse>)behavior.GetType()
                    .GetMethod("HandleAsync")!
                    .Invoke(behavior, [request, next, ct])!;
        }

        // Khởi động pipeline: gọi behavior ngoài cùng → cascade qua chain
        return await handlerDelegate();
    }

    public async Task Publish<TNotification>(
        TNotification notification, CancellationToken ct)
        where TNotification : INotification
    {
        // GetServices: lấy TẤT CẢ handlers (có thể là 0, 1, hoặc nhiều)
        var handlers = serviceProvider
            .GetServices<INotificationHandler<TNotification>>();

        // WhenAll: chạy song song tất cả handlers → nhanh hơn tuần tự
        // ⚠️ Trade-off: nếu 1 handler fail → AggregateException cho tất cả handlers
        var tasks = handlers.Select(h => h.Handle(notification, ct));
        await Task.WhenAll(tasks);
    }
}

// === BƯỚC 5: Domain Event – notification được publish sau khi order shipped ===
// record: immutable event data, tự động có Equals/GetHashCode
public record OrderShippedEvent(Guid OrderId, string TrackingNumber) : INotification;

// Handler 1: gửi email xác nhận giao hàng
// Hoàn toàn độc lập với Handler 2 → có thể thêm/bỏ mà không ảnh hưởng handlers khác
public class SendShippingEmailHandler(IEmailService emailService)
    : INotificationHandler<OrderShippedEvent>
{
    public async Task Handle(OrderShippedEvent notification, CancellationToken ct)
    {
        await emailService.SendShippingConfirmationAsync(
            notification.OrderId, notification.TrackingNumber, ct);
    }
}

// Handler 2: cập nhật inventory status sau khi giao hàng
// Cùng event, logic khác hoàn toàn – Mediator fan-out đến cả hai handlers
public class UpdateInventoryHandler(IInventoryService inventoryService)
    : INotificationHandler<OrderShippedEvent>
{
    public async Task Handle(OrderShippedEvent notification, CancellationToken ct)
    {
        // MarkOrderShippedAsync: cập nhật inventory để biết đơn nào đã xuất kho
        await inventoryService.MarkOrderShippedAsync(notification.OrderId, ct);
    }
}

// === BƯỚC 6: Controller – thin controller, chỉ biết IMediator ===
// Lợi ích: thêm handler mới, thêm behavior mới → Controller KHÔNG cần sửa
[ApiController]
public class OrdersController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateOrder(
        CreateOrderCommand command, CancellationToken ct)
        // mediator.Send: dispatch đến đúng handler, kèm pipeline behaviors
        => Ok(await mediator.Send(command, ct));
}`,
    umlDiagram: `┌──────────┐                    ┌──────────┐
│Component1│◀──────────────────▶│Component2│
└──────────┘  without mediator  └──────────┘

      With Mediator:
┌──────────┐    ┌──────────┐    ┌──────────┐
│Component1│───▶│ Mediator │◀───│Component2│
└──────────┘    ├──────────┤    └──────────┘
                │+Notify() │
                └──────────┘`
  },
  {
    id: "memento",
    name: "Memento",
    nameVi: "Memento - Kỷ Niệm",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "low",
    readingTime: 10,
    phase: 4,
    description: "Capture và externalize trạng thái nội bộ của một đối tượng mà không vi phạm encapsulation, để đối tượng có thể được restore về trạng thái đó sau này.",
    intent: "Cho phép save và restore trạng thái của một object mà không expose implementation details. Cơ sở của undo/redo functionality.",
    dotnetExample: "Database transactions với rollback, ASP.NET Core session state, EF Core change tracking, undo/redo trong text editors và design tools.",
    whenToUse: [
      "Khi cần implement undo/redo functionality",
      "Khi cần snapshot state trước khi destructive operation",
      "Khi direct access to fields vi phạm encapsulation",
      "Khi save/restore game state hoặc transaction rollback"
    ],
    whenNotToUse: [
      "Khi state object quá lớn và snapshot tốn nhiều memory",
      "Khi cần snapshot thường xuyên – memory pressure",
      "Khi có thể dùng database transaction thay thế"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Editor thay đổi state → Caretaker.SaveSnapshot() → Undo() restore memento → Editor khôi phục
// ════════════════════════════════════════════════════════════════
// Memento: lưu snapshot internal state của Originator mà không vi phạm encapsulation.
// Ba vai trò: Originator (tạo/restore memento), Memento (lưu state), Caretaker (quản lý history)

// === BƯỚC 1: Memento interface – ẩn state khỏi Caretaker ===
// Caretaker lưu trữ Memento nhưng KHÔNG được phép đọc/sửa State bên trong.
// Chỉ Originator mới được phép tạo và đọc Memento → bảo vệ encapsulation
public interface IMemento<T>
{
    T State { get; }           // State snapshot – Caretaker không quan tâm nội dung
    DateTime CreatedAt { get; } // Timestamp để hiển thị history cho user
    string Description { get; } // Mô tả human-readable: "Typed 'Hello World'"
}

// === BƯỚC 2: Originator – DocumentEditor tạo và restore từ Memento ===
// DocumentEditor là chủ sở hữu của state → chỉ nó biết cách đóng gói và giải nén state
public class DocumentEditor
{
    private string _content = string.Empty;
    private string _title = string.Empty;
    // _pendingEdits: theo dõi tất cả thay đổi chưa save → cần lưu vào memento
    private readonly List<DocumentEdit> _pendingEdits = [];

    // Property setter tự động track thay đổi → không cần client gọi TrackChange() thủ công
    public string Content
    {
        get => _content;
        set
        {
            // Ghi lại thay đổi: oldContent → newContent tại thời điểm nào
            _pendingEdits.Add(new DocumentEdit(DateTime.UtcNow, _content, value));
            _content = value;
        }
    }

    public string Title { get => _title; set => _title = value; }

    // SaveState: tạo "ảnh chụp" toàn bộ state hiện tại
    // [.._pendingEdits]: spread operator – tạo List MỚI (deep copy) thay vì chia sẻ reference
    // Tại sao deep copy? Nếu share reference: modify _pendingEdits sau này → ảnh hưởng memento!
    public DocumentMemento SaveState(string description)
        => new(new DocumentState(_title, _content, [.._pendingEdits]), description);

    // RestoreState: khôi phục state từ memento – chỉ Originator biết cách làm điều này
    // Caretaker KHÔNG thể gọi RestoreState trực tiếp vì nó không biết DocumentEditor internals
    public void RestoreState(DocumentMemento memento)
    {
        _title = memento.State.Title;
        _content = memento.State.Content;
        _pendingEdits.Clear();
        _pendingEdits.AddRange(memento.State.PendingEdits); // Khôi phục edit history
    }
}

// Immutable records để lưu state snapshot – record đảm bảo không ai sửa được sau khi tạo
public record DocumentEdit(DateTime Timestamp, string OldContent, string NewContent);
// DocumentState là "snapshot" hoàn chỉnh tại một thời điểm
public record DocumentState(string Title, string Content, List<DocumentEdit> PendingEdits);

// Concrete Memento – lưu state + metadata
public class DocumentMemento(DocumentState state, string description)
    : IMemento<DocumentState>
{
    // get; init; = read-only sau khi constructor – Caretaker không thể sửa state
    public DocumentState State { get; } = state;
    // DateTime.UtcNow tại thời điểm tạo memento – không phải thời điểm restore
    public DateTime CreatedAt { get; } = DateTime.UtcNow;
    public string Description { get; } = description;
}

// === BƯỚC 3: Caretaker – DocumentHistory quản lý Memento stack ===
// Caretaker biết KHI NÀO lưu và restore, nhưng KHÔNG biết NỘI DUNG của Memento
public class DocumentHistory
{
    // Stack: LIFO – undo theo thứ tự ngược với thứ tự thực hiện
    private readonly Stack<DocumentMemento> _undoStack = new();
    private readonly Stack<DocumentMemento> _redoStack = new();
    private readonly DocumentEditor _editor; // Originator cần thiết để save/restore
    // MaxHistorySize: giới hạn memory – không giữ history vô hạn
    private const int MaxHistorySize = 50;

    public DocumentHistory(DocumentEditor editor) => _editor = editor;

    // Gọi sau mỗi significant action: save file, paste large text, format...
    public void SaveSnapshot(string description)
    {
        var memento = _editor.SaveState(description);
        _undoStack.Push(memento);
        // Sau action mới: redo stack không còn ý nghĩa → clear (giống Word/Excel)
        _redoStack.Clear();

        // Giới hạn stack size: nếu vượt 50 → cắt bỏ entries cũ nhất
        if (_undoStack.Count > MaxHistorySize)
        {
            var items = _undoStack.ToArray();
            _undoStack.Clear();
            // Take(MaxHistorySize) lấy 50 entries MỚI NHẤT, Reverse để đúng thứ tự LIFO
            foreach (var item in items.Take(MaxHistorySize).Reverse())
                _undoStack.Push(item);
        }
    }

    // Computed properties: UI có thể bind để enable/disable Undo/Redo buttons
    public bool CanUndo => _undoStack.Count > 0;
    public bool CanRedo => _redoStack.Count > 0;

    public void Undo()
    {
        if (!CanUndo) return;
        // Lưu state HIỆN TẠI vào redo stack trước khi restore → cho phép Redo sau
        var current = _editor.SaveState("Before undo");
        var previous = _undoStack.Pop(); // Lấy state ngay trước đó
        _redoStack.Push(current);        // Lưu current để Redo
        _editor.RestoreState(previous);  // Originator khôi phục state
    }

    public void Redo()
    {
        if (!CanRedo) return;
        var current = _editor.SaveState("Before redo");
        var next = _redoStack.Pop();    // Lấy state đã bị undo
        _undoStack.Push(current);       // Lưu current để có thể Undo lại
        _editor.RestoreState(next);     // Originator khôi phục state đã undo
    }

    // History display: hiển thị danh sách undo actions cho user (như History panel trong Photoshop)
    public IEnumerable<string> GetHistory()
        => _undoStack.Select(m => $"{m.CreatedAt:HH:mm:ss} - {m.Description}");
}`,
    umlDiagram: `┌───────────┐  SaveState  ┌──────────┐
│Originator │────────────▶│ Memento  │
├───────────┤             ├──────────┤
│-state     │  Restore    │-state    │
│+Save()    │◀────────────│+GetState │
│+Restore() │             └──────────┘
└───────────┘                   ▲
                                │ stores
                         ┌─────────────┐
                         │  Caretaker  │
                         ├─────────────┤
                         │-mementos[]  │
                         │+Undo()      │
                         │+Redo()      │
                         └─────────────┘`
  },
  {
    id: "observer",
    name: "Observer",
    nameVi: "Observer - Quan Sát Viên",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "high",
    readingTime: 14,
    phase: 1,
    description: "Định nghĩa sự phụ thuộc một-nhiều giữa các đối tượng sao cho khi một đối tượng thay đổi trạng thái, tất cả các đối tượng phụ thuộc vào nó đều được thông báo và cập nhật tự động.",
    intent: "Tạo cơ chế subscription cho phép nhiều objects lắng nghe và react với events hoặc state changes của một object khác.",
    dotnetExample: "INotifyPropertyChanged trong WinForms/WPF/MAUI, C# events/delegates, IObservable<T>/IObserver<T> (Rx.NET), IAsyncEventHandler, domain events.",
    whenToUse: [
      "Khi thay đổi state của một object cần trigger updates ở nhiều objects khác",
      "Khi objects cần notify other objects mà không biết ai họ là",
      "Khi implement event-driven systems hay reactive UI",
      "Khi cần loose coupling giữa subject và observers"
    ],
    whenNotToUse: [
      "Khi notification chain gây ra cascading updates khó debug",
      "Khi performance critical và notification overhead không chấp nhận được",
      "Khi thứ tự notification quan trọng và khó đảm bảo"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Order được tạo → Publish OrderPlacedEvent → tất cả handlers nhận event → xử lý độc lập
// ════════════════════════════════════════════════════════════════
// Observer: Subject publish events, Observers subscribe và react.
// Loose coupling: Subject KHÔNG biết Observers là ai; Observers KHÔNG biết nhau.

// === BƯỚC 1: Domain Event – dữ liệu event bất biến ===
// Domain events mô tả "điều đã xảy ra" trong business → tên dùng past tense (OrderPlaced, StockDepleted)
// IDomainEvent interface đảm bảo mọi event có EventId (idempotent) và timestamp
public interface IDomainEvent
{
    Guid EventId { get; }      // Unique ID: tránh xử lý event hai lần (idempotency)
    DateTime OccurredAt { get; } // Khi nào event xảy ra – quan trọng cho event sourcing
}

// IDomainEventHandler – interface cho Observer
// Generic constraint: handler biết chính xác loại event mình xử lý → type-safe
public interface IDomainEventHandler<TEvent> where TEvent : IDomainEvent
{
    Task HandleAsync(TEvent domainEvent, CancellationToken ct);
}

// Subject interface – nơi publish events
public interface IDomainEventPublisher
{
    Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct)
        where TEvent : IDomainEvent;
}

// === BƯỚC 2: Domain Events – immutable records ===
// record tạo immutable event object tự động: Equals, GetHashCode, ToString được generate
// init-only properties: không ai sửa event sau khi tạo → event sourcing safe
public record OrderPlacedEvent(
    Guid EventId,
    DateTime OccurredAt,
    Guid OrderId,
    Guid CustomerId,
    decimal TotalAmount) : IDomainEvent;

public record StockDepletedEvent(
    Guid EventId,
    DateTime OccurredAt,
    Guid ProductId,
    int RemainingQuantity) : IDomainEvent;

// === BƯỚC 3: Observers – mỗi handler là một independent Observer ===
// Thêm handler mới = thêm class + đăng ký DI → KHÔNG cần sửa Order domain, không sửa publisher

// Observer 1: Gửi welcome email nếu đây là đơn hàng đầu tiên
// "Tên class = hành động" convention: rõ ràng hơn handler tổng quát
public class SendWelcomeEmailOnOrderPlaced(IEmailService emailService, ICustomerRepository customerRepo)
    : IDomainEventHandler<OrderPlacedEvent>
{
    public async Task HandleAsync(OrderPlacedEvent @event, CancellationToken ct)
    {
        // @ trước event tránh conflict với keyword 'event' của C#
        var customer = await customerRepo.GetByIdAsync(@event.CustomerId, ct);
        // IsFirstOrder: business logic riêng của handler, không ảnh hưởng handler khác
        if (customer?.IsFirstOrder == true)
            await emailService.SendWelcomeEmailAsync(customer.Email, ct);
    }
}

// Observer 2: Cộng điểm loyalty – cùng event, logic hoàn toàn khác
// Nếu bỏ handler này (comment out DI registration) → chỉ điểm loyalty không chạy, các handler khác fine
public class UpdateLoyaltyPoints(ILoyaltyService loyalty)
    : IDomainEventHandler<OrderPlacedEvent>
{
    public async Task HandleAsync(OrderPlacedEvent @event, CancellationToken ct)
    {
        // Business rule: 1 điểm cho mỗi 10.000đ chi tiêu
        // (int) cast: bỏ phần thập phân → lấy số điểm nguyên
        var points = (int)(@event.TotalAmount / 10);
        await loyalty.AddPointsAsync(@event.CustomerId, points, ct);
    }
}

// Observer 3: Cảnh báo đội kho khi hàng sắp hết – listen event khác (StockDepletedEvent)
public class NotifyRestockingTeam(INotificationService notifications)
    : IDomainEventHandler<StockDepletedEvent>
{
    public async Task HandleAsync(StockDepletedEvent @event, CancellationToken ct)
    {
        // Business rule: cảnh báo khi còn ≤ 10 units
        if (@event.RemainingQuantity <= 10)
            await notifications.SendAlertAsync(
                "warehouse-team@company.com",
                $"Low stock alert: Product {@event.ProductId} has only {@event.RemainingQuantity} left",
                ct);
    }
}

// === BƯỚC 4: INotifyPropertyChanged – Observer được build vào .NET cho UI binding ===
// WPF/MAUI/Blazor tự động subscribe PropertyChanged event → cập nhật UI khi data thay đổi
public class ProductViewModel : INotifyPropertyChanged
{
    private decimal _price;
    private int _stockCount;

    // event keyword trong C# = Observer subscription mechanism
    // UI framework subscribe handler của mình vào event này
    public event PropertyChangedEventHandler? PropertyChanged;

    public decimal Price
    {
        get => _price;
        set
        {
            if (_price == value) return; // Guard: không notify nếu value không thay đổi → tránh vòng lặp vô hạn
            _price = value;
            // Notify hai properties: Price (chính nó) và FormattedPrice (computed property phụ thuộc)
            OnPropertyChanged();
            OnPropertyChanged(nameof(FormattedPrice)); // nameof: type-safe, refactoring-safe
        }
    }

    // Computed property: UI tự động refresh khi Price thay đổi nhờ OnPropertyChanged(nameof(FormattedPrice))
    public string FormattedPrice => $"{_price:C}";

    public int StockCount
    {
        get => _stockCount;
        set
        {
            if (_stockCount == value) return;
            _stockCount = value;
            // 1 property thay đổi → notify 3 properties phụ thuộc:
            // StockCount, IsInStock (computed), StockStatusText (computed)
            OnPropertyChanged();
            OnPropertyChanged(nameof(IsInStock));
            OnPropertyChanged(nameof(StockStatusText));
        }
    }

    public bool IsInStock => _stockCount > 0;
    // Computed: tự động cập nhật trên UI khi StockCount thay đổi
    public string StockStatusText => IsInStock ? $"Còn {_stockCount} sản phẩm" : "Hết hàng";

    // [CallerMemberName]: compiler tự động điền tên property gọi method này
    // OnPropertyChanged() trong setter Price → name sẽ là "Price" tự động
    protected virtual void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    // ?.Invoke: null-safe invoke – không throw nếu không có subscriber
}`,
    umlDiagram: `┌───────────┐          ┌──────────┐
│  Subject  │ notify   │ Observer │
├───────────┤─────────▶├──────────┤
│-observers │          │+Update() │
│+Attach()  │          └──────────┘
│+Detach()  │                ▲
│+Notify()  │         ┌──────┴──────┐
└───────────┘    ┌─────────┐  ┌─────────┐
       ▲         │Observer1│  │Observer2│
       │         └─────────┘  └─────────┘
┌─────────────┐
│ConcrSubject │
├─────────────┤
│-state       │
│+GetState()  │
└─────────────┘`
  },
  {
    id: "state",
    name: "State",
    nameVi: "State - Trạng Thái",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "medium",
    readingTime: 13,
    phase: 2,
    description: "Cho phép một đối tượng thay đổi hành vi khi trạng thái nội bộ của nó thay đổi. Đối tượng sẽ như thể thay đổi lớp của nó.",
    intent: "Thay thế switch/if statements khổng lồ cho state-dependent behavior bằng các state objects riêng biệt, mỗi object chứa behavior cho một trạng thái cụ thể.",
    dotnetExample: "Order status machine, HTTP request lifecycle, workflow engines, traffic light simulation, media player states (Playing/Paused/Stopped).",
    whenToUse: [
      "Khi object behavior phụ thuộc vào state và phải thay đổi tại runtime",
      "Khi có nhiều conditional statements phụ thuộc vào object state",
      "Khi implement workflow, state machine, order lifecycle",
      "Khi muốn tách biệt state transition logic"
    ],
    whenNotToUse: [
      "Khi có ít states và transitions không phức tạp",
      "Khi state machine đơn giản có thể dùng enum + switch",
      "Khi overhead của nhiều state classes không worth it"
    ],
    codeExample: `// LUỒNG XỬ LÝ: order.ConfirmAsync() → _state.ConfirmAsync(order) → PendingState xử lý → TransitionTo(ConfirmedState)
// ════════════════════════════════════════════════════════════════
// State pattern: thay vì if/switch khổng lồ trong Order class,
// mỗi State class chứa behavior cho trạng thái đó → dễ đọc, dễ thêm state mới.

// === BƯỚC 1: State interface – mọi state phải "hiểu" tất cả transitions ===
// Mỗi method = một transition. State KHÔNG hỗ trợ transition đó → throw exception.
// Điều này NGĂN transitions không hợp lệ tại runtime, không cần validation riêng
public interface IOrderState
{
    string StateName { get; }
    // Mỗi method nhận Order (Context) để state có thể modify order data và trigger transitions
    Task ConfirmAsync(Order order, CancellationToken ct);
    Task ShipAsync(Order order, string trackingNumber, CancellationToken ct);
    Task DeliverAsync(Order order, CancellationToken ct);
    Task CancelAsync(Order order, string reason, CancellationToken ct);
    Task RefundAsync(Order order, CancellationToken ct);
}

// === BƯỚC 2: Base State – default behavior là throw exception ===
// Tại sao dùng abstract base class thay vì interface default implementation?
// abstract class cho phép throw với message có ý nghĩa: "Cannot confirm in Shipped state"
// Subclass chỉ override những transitions MÀ STATE ĐÓ HỖ TRỢ – các transition khác tự throw
public abstract class BaseOrderState : IOrderState
{
    public abstract string StateName { get; }

    // virtual (không abstract) → subclass KHÔNG bắt buộc override → default là throw
    public virtual Task ConfirmAsync(Order order, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot confirm order in {StateName} state");
    public virtual Task ShipAsync(Order order, string trackingNumber, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot ship order in {StateName} state");
    public virtual Task DeliverAsync(Order order, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot deliver order in {StateName} state");
    public virtual Task CancelAsync(Order order, string reason, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot cancel order in {StateName} state");
    public virtual Task RefundAsync(Order order, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot refund order in {StateName} state");
}

// === BƯỚC 3: Concrete States – mỗi state chứa valid transitions của mình ===

// PendingState: đơn mới tạo → có thể Confirm hoặc Cancel (chưa ship nên có thể cancel)
public class PendingState : BaseOrderState
{
    public override string StateName => "Pending";

    // Override Confirm: PendingState HỖ TRỢ transition này
    public override async Task ConfirmAsync(Order order, CancellationToken ct)
    {
        // State tự cập nhật Context data trước khi transition
        order.ConfirmedAt = DateTime.UtcNow;
        // TransitionTo: Context thay đổi _state field → hành vi tiếp theo sẽ khác
        order.TransitionTo(new ConfirmedState());
        // Audit trail: ghi lại mọi transition → tracing & debugging production issues
        await order.AddHistoryAsync("Order confirmed", ct);
    }

    // Override Cancel: Pending order có thể bị hủy
    public override async Task CancelAsync(Order order, string reason, CancellationToken ct)
    {
        order.CancelledAt = DateTime.UtcNow;
        order.CancellationReason = reason;
        order.TransitionTo(new CancelledState());
        await order.AddHistoryAsync($"Order cancelled: {reason}", ct);
    }
    // Ship, Deliver, Refund → throw (từ base class) → Pending order không thể ship!
}

// ConfirmedState: đã xác nhận → có thể Ship hoặc Cancel (chưa ship nên còn cancel được)
public class ConfirmedState : BaseOrderState
{
    public override string StateName => "Confirmed";

    public override async Task ShipAsync(Order order, string trackingNumber, CancellationToken ct)
    {
        order.TrackingNumber = trackingNumber; // Lưu tracking number từ shipping provider
        order.ShippedAt = DateTime.UtcNow;
        order.TransitionTo(new ShippedState()); // State change → không thể Cancel nữa
        await order.AddHistoryAsync($"Order shipped: {trackingNumber}", ct);
    }

    public override async Task CancelAsync(Order order, string reason, CancellationToken ct)
    {
        order.CancellationReason = reason;
        order.TransitionTo(new CancelledState());
        await order.AddHistoryAsync($"Order cancelled before shipping: {reason}", ct);
    }
}

// ShippedState: đang giao → chỉ có thể Deliver (không Cancel được khi đang giao!)
public class ShippedState : BaseOrderState
{
    public override string StateName => "Shipped";

    public override async Task DeliverAsync(Order order, CancellationToken ct)
    {
        order.DeliveredAt = DateTime.UtcNow;
        order.TransitionTo(new DeliveredState());
        await order.AddHistoryAsync("Order delivered", ct);
    }
    // Cancel → throw: không thể hủy khi hàng đang trên đường giao → đây là business rule!
}

// DeliveredState: đã giao → chỉ có thể Refund trong 30 ngày
public class DeliveredState : BaseOrderState
{
    public override string StateName => "Delivered";

    public override async Task RefundAsync(Order order, CancellationToken ct)
    {
        // Business rule trong State: chính xác, tập trung, dễ tìm
        if (order.DeliveredAt.HasValue &&
            DateTime.UtcNow - order.DeliveredAt.Value > TimeSpan.FromDays(30))
            throw new InvalidOperationException("Refund window has expired");

        order.TransitionTo(new RefundedState());
        await order.AddHistoryAsync("Order refunded", ct);
    }
}

// === BƯỚC 4: Context – Order delegate tất cả behavior xuống current state ===
// Order KHÔNG biết logic của state nào – nó chỉ gọi methods trên _state
// Đây là điểm khác biệt với Strategy: State tự chuyển state; Strategy không chuyển
public class Order
{
    // _state: field duy nhất quản lý behavior của cả object → pattern's core
    // Khởi tạo với PendingState: đơn mới luôn bắt đầu từ Pending
    private IOrderState _state = new PendingState();
    // Public read-only: external code biết current state nhưng không thể set trực tiếp
    public string CurrentState => _state.StateName;

    public Guid Id { get; init; }
    public string TrackingNumber { get; set; } = string.Empty;
    // Nullable DateTime: null = chưa xảy ra, có giá trị = đã xảy ra tại thời điểm đó
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string CancellationReason { get; set; } = string.Empty;

    // internal: chỉ State classes (trong cùng assembly) được gọi TransitionTo
    // Client code KHÔNG thể tự set state → State machine được bảo vệ
    internal void TransitionTo(IOrderState newState) => _state = newState;

    // Mỗi public method chỉ là "delegate" – Order không có if/switch nào về state
    public Task ConfirmAsync(CancellationToken ct) => _state.ConfirmAsync(this, ct);
    public Task ShipAsync(string trackingNumber, CancellationToken ct) => _state.ShipAsync(this, trackingNumber, ct);
    public Task DeliverAsync(CancellationToken ct) => _state.DeliverAsync(this, ct);
    public Task CancelAsync(string reason, CancellationToken ct) => _state.CancelAsync(this, reason, ct);
    public Task RefundAsync(CancellationToken ct) => _state.RefundAsync(this, ct);

    // internal helper: State classes gọi để ghi audit log
    internal Task AddHistoryAsync(string note, CancellationToken ct)
    {
        // Thực tế: ghi vào OrderHistory table, publish event, v.v.
        return Task.CompletedTask;
    }
}`,
    umlDiagram: `┌─────────────┐           ┌───────────┐
│   Context   │──state───▶│   State   │
├─────────────┤           ├───────────┤
│-state:State │           │+Handle()  │
│+Request()   │           └───────────┘
└─────────────┘                  ▲
                         ┌───────┴───────┐
                    ┌────────┐      ┌────────┐
                    │StateA  │      │StateB  │
                    ├────────┤      ├────────┤
                    │+Handle │      │+Handle │
                    └────────┘      └────────┘`
  },
  {
    id: "strategy",
    name: "Strategy",
    nameVi: "Strategy - Chiến Lược",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "high",
    readingTime: 13,
    phase: 1,
    description: "Định nghĩa một họ các thuật toán, đóng gói từng cái, và làm cho chúng có thể thay thế lẫn nhau. Strategy cho phép thuật toán thay đổi độc lập với clients sử dụng nó.",
    intent: "Cho phép chọn thuật toán/behavior tại runtime. Thay thế nhiều if/switch statements bằng objects có thể swap được.",
    dotnetExample: "IComparer<T> cho sorting strategies, IEqualityComparer<T>, authentication schemes trong ASP.NET Core, discount calculation strategies, export format strategies.",
    whenToUse: [
      "Khi cần dùng các biến thể khác nhau của cùng một algorithm",
      "Khi cần thay đổi algorithm tại runtime",
      "Khi muốn loại bỏ conditional statements lớn",
      "Khi muốn isolate implementation details của algorithm"
    ],
    whenNotToUse: [
      "Khi chỉ có vài strategies và chúng ít thay đổi – dùng simple method thay thế",
      "Khi clients không cần biết về sự khác biệt của strategies",
      "Khi overhead của extra objects không đáng"
    ],
    codeExample: `// LUỒNG XỬ LÝ: PricingEngine nhận context → lọc applicable strategies → tính giá → chọn giá tốt nhất
// ════════════════════════════════════════════════════════════════
// Strategy: đóng gói mỗi thuật toán tính giá vào class riêng → có thể swap/thêm mà không sửa PricingEngine.
// Thay vì if/switch lớn: "nếu là Platinum thì giảm 15%, nếu là Flash Sale thì giảm 30%..."

// === BƯỚC 1: Strategy interface – "hợp đồng" cho tất cả strategies ===
// Tất cả strategies phải implement interface này → PricingEngine làm việc qua interface, không biết concrete class
public interface IPricingStrategy
{
    string Name { get; } // Tên để hiển thị trong invoice và debug
    // IsApplicable: strategy tự quyết định mình có áp dụng được không
    // → PricingEngine không cần if/else để kiểm tra điều kiện từng strategy
    bool IsApplicable(PricingContext context);
    decimal CalculatePrice(PricingContext context);
}

// PricingContext là "dữ liệu đầu vào" – tất cả thông tin cần để tính giá
// record: immutable → strategies không thể thay đổi context khi tính giá (no side effects)
public record PricingContext(
    decimal BasePrice,      // Giá gốc của sản phẩm
    int Quantity,           // Số lượng mua → ảnh hưởng volume discount
    CustomerTier CustomerTier, // Hạng khách hàng → loyalty discount
    DateTime OrderDate,     // Thời điểm đặt → Flash Sale có thời hạn
    bool IsFirstOrder,      // Đơn đầu tiên → first order discount
    string? PromoCode);     // Mã giảm giá → có thể thêm strategy PromoCodeStrategy sau

public enum CustomerTier { Standard, Silver, Gold, Platinum }

// === BƯỚC 2: Concrete Strategies – mỗi algorithm tính giá là một class riêng ===

// Fallback strategy: luôn áp dụng được → đảm bảo luôn có ít nhất 1 strategy
public class RegularPricingStrategy : IPricingStrategy
{
    public string Name => "Regular Price";
    public bool IsApplicable(PricingContext ctx) => true; // Fallback: không có điều kiện
    // Đơn giản: BasePrice × Quantity, không có discount
    public decimal CalculatePrice(PricingContext ctx) => ctx.BasePrice * ctx.Quantity;
}

// Volume discount: mua nhiều → giảm giá nhiều
public class VolumeDiscountStrategy : IPricingStrategy
{
    public string Name => "Volume Discount";
    // Chỉ áp dụng khi mua ≥ 10 items → IsApplicable tự quản lý điều kiện này
    public bool IsApplicable(PricingContext ctx) => ctx.Quantity >= 10;

    public decimal CalculatePrice(PricingContext ctx)
    {
        // Switch expression C# 8+: sạch hơn if/else if
        // Relational patterns (>= 100): so sánh trực tiếp trong switch
        var discount = ctx.Quantity switch
        {
            >= 100 => 0.20m, // Mua ≥ 100: giảm 20%
            >= 50  => 0.15m,
            >= 20  => 0.10m,
            >= 10  => 0.05m, // Mua 10-19: giảm 5%
            _      => 0m     // Không xảy ra vì IsApplicable đã lọc
        };
        return ctx.BasePrice * ctx.Quantity * (1 - discount);
    }
}

// Loyalty discount: khách VIP nhận ưu đãi đặc biệt
public class LoyaltyPricingStrategy : IPricingStrategy
{
    public string Name => "Loyalty Discount";
    // 'is' pattern matching với 'or': chỉ áp dụng cho Gold và Platinum
    public bool IsApplicable(PricingContext ctx)
        => ctx.CustomerTier is CustomerTier.Gold or CustomerTier.Platinum;

    public decimal CalculatePrice(PricingContext ctx)
    {
        // Ternary: Platinum nhận discount cao hơn Gold
        var discount = ctx.CustomerTier == CustomerTier.Platinum ? 0.15m : 0.10m;
        return ctx.BasePrice * ctx.Quantity * (1 - discount);
    }
}

// First order discount: thu hút khách mới
public class FirstOrderStrategy : IPricingStrategy
{
    public string Name => "First Order Discount (10%)";
    public bool IsApplicable(PricingContext ctx) => ctx.IsFirstOrder; // Chỉ đơn đầu tiên
    // Giảm 10% cố định: 0.90m = (1 - 0.10)
    public decimal CalculatePrice(PricingContext ctx)
        => ctx.BasePrice * ctx.Quantity * 0.90m;
}

// Flash Sale: giảm giá theo thời gian (Harcode 11/11, Black Friday...)
// FlashSaleStrategy nhận TimeRange qua constructor → có thể configure per campaign
public class FlashSaleStrategy(TimeRange saleWindow) : IPricingStrategy
{
    public string Name => "Flash Sale (30% OFF)";
    // saleWindow.Contains: kiểm tra OrderDate có trong khung giờ Flash Sale không
    public bool IsApplicable(PricingContext ctx)
        => saleWindow.Contains(ctx.OrderDate);
    // Giảm 30%: 0.70m = (1 - 0.30) – giảm mạnh nhất
    public decimal CalculatePrice(PricingContext ctx)
        => ctx.BasePrice * ctx.Quantity * 0.70m;
}

// === BƯỚC 3: Context/Selector – chọn strategy tốt nhất cho khách ===
// PricingEngine không biết strategy nào tồn tại – chỉ biết interface IPricingStrategy
// Thêm strategy mới? Chỉ register vào DI, KHÔNG sửa PricingEngine
public class PricingEngine(IEnumerable<IPricingStrategy> strategies)
{
    public PricingResult CalculateBestPrice(PricingContext context)
    {
        // Lọc chỉ những strategies applicable cho context này
        var applicableStrategies = strategies
            .Where(s => s.IsApplicable(context))
            .ToList();

        if (!applicableStrategies.Any())
            throw new InvalidOperationException("No applicable pricing strategy found");

        // Tính giá từ tất cả applicable strategies, rồi chọn giá thấp nhất (lợi nhất cho khách)
        // Business decision: "best for customer" → minimize price
        var results = applicableStrategies
            .Select(s => new { Strategy = s, Price = s.CalculatePrice(context) })
            .OrderBy(r => r.Price) // Sắp xếp tăng dần → First() = giá thấp nhất
            .ToList();

        var best = results.First();
        return new PricingResult(
            FinalPrice: best.Price,
            AppliedStrategy: best.Strategy.Name,
            // Savings: số tiền tiết kiệm được so với giá gốc → hiển thị cho khách
            Savings: context.BasePrice * context.Quantity - best.Price,
            // AllOptions: tất cả options để hiển thị transparency (giống Shopee/Lazada)
            AllOptions: results.Select(r => (r.Strategy.Name, r.Price)).ToList());
    }
}

// PricingResult record – immutable response chứa đủ info để hiển thị trên UI
public record PricingResult(
    decimal FinalPrice,
    string AppliedStrategy,
    decimal Savings,
    List<(string StrategyName, decimal Price)> AllOptions);

// === BƯỚC 4: DI Registration – thêm strategy = thêm 1 dòng ===
builder.Services.AddSingleton<IPricingStrategy, RegularPricingStrategy>();
builder.Services.AddSingleton<IPricingStrategy, VolumeDiscountStrategy>();
builder.Services.AddSingleton<IPricingStrategy, LoyaltyPricingStrategy>();
builder.Services.AddSingleton<IPricingStrategy, FirstOrderStrategy>();
// FlashSaleStrategy cần config → factory method trong DI
builder.Services.AddSingleton<IPricingStrategy, FlashSaleStrategy>(_ =>
    new FlashSaleStrategy(new TimeRange(
        new DateTime(2025, 11, 11),   // Flash Sale bắt đầu: 11/11/2025 00:00
        new DateTime(2025, 11, 12)))); // Flash Sale kết thúc: 12/11/2025 00:00
// PricingEngine inject IEnumerable<IPricingStrategy> → DI tự inject tất cả 5 strategies trên
builder.Services.AddScoped<PricingEngine>();`,
    umlDiagram: `┌─────────────┐           ┌──────────┐
│   Context   │──strategy▶│ Strategy │
├─────────────┤           ├──────────┤
│+Execute()   │           │+Execute()│
└─────────────┘           └──────────┘
                                 ▲
                      ┌──────────┼──────────┐
                 ┌─────────┐┌─────────┐┌─────────┐
                 │Strategy │ │Strategy ││Strategy │
                 │    A    │ │    B    ││    C    │
                 └─────────┘└─────────┘└─────────┘`
  },
  {
    id: "template-method",
    name: "Template Method",
    nameVi: "Template Method - Phương Thức Khuôn Mẫu",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "medium",
    readingTime: 11,
    phase: 2,
    description: "Định nghĩa skeleton của một algorithm trong một method, để lại một số steps cho subclasses. Template Method cho phép subclasses override một số steps của algorithm mà không thay đổi cấu trúc của nó.",
    intent: "Định nghĩa algorithm frame trong base class, cho phép subclasses customize các steps cụ thể mà không thay đổi overall structure.",
    dotnetExample: "ASP.NET Core Controller base class, DbContext với OnModelCreating, BackgroundService với ExecuteAsync, TestBase trong unit testing frameworks.",
    whenToUse: [
      "Khi muốn để clients extend chỉ một số bước của algorithm",
      "Khi có nhiều classes với algorithms gần giống nhau",
      "Khi muốn control points where extensions are allowed",
      "Khi implement data processing pipelines với fixed steps"
    ],
    whenNotToUse: [
      "Khi algorithm không có invariant structure",
      "Khi clients cần thay đổi toàn bộ algorithm – dùng Strategy",
      "Khi hierarchy quá sâu làm code khó follow"
    ],
    codeExample: `// LUỒNG XỬ LÝ: GenerateAsync() → ValidateRequest → FetchData → ProcessData → BuildReport → PostProcess
// ════════════════════════════════════════════════════════════════
// Template Method: base class định nghĩa SKELETON của algorithm (thứ tự các bước).
// Subclass customize các BƯỚC CỤ THỂ mà không thay đổi overall flow.
// Khác Strategy: Template Method dùng INHERITANCE; Strategy dùng COMPOSITION.

// === BƯỚC 1: Abstract base class – Template Method sống ở đây ===
// GenerateAsync() là "template method" – sequence cố định, không thể bị subclass thay đổi
// Generic<TData, TReport>: type-safe với bất kỳ loại report nào
public abstract class ReportGenerator<TData, TReport>
{
    // ← ĐÂY là Template Method: không phải abstract, không cho phép override!
    // Xác định THỨ TỰ các bước: validate → fetch → process → build → post-process
    // Subclass KHÔNG thể thay đổi thứ tự này → đây là "invariant structure" của pattern
    public async Task<TReport> GenerateAsync(
        ReportRequest request, CancellationToken ct)
    {
        // Hook: có thể override để thêm validation riêng (optional step)
        ValidateRequest(request);

        // Abstract steps: PHẢI override, không có default implementation
        var data = await FetchDataAsync(request, ct);       // Bước 1: lấy raw data
        var processedData = await ProcessDataAsync(data, ct); // Bước 2: tính toán aggregates
        var report = await BuildReportAsync(processedData, request, ct); // Bước 3: tạo report object
        // Hook: có thể override cho post-processing (optional step)
        await PostProcessAsync(report, ct);

        return report;
    }

    // Hook method: virtual + có implementation mặc định → subclass CÓ THỂ nhưng không bắt buộc override
    // Đây là điểm mạnh của Template Method so với Strategy: subclass chỉ override những gì cần
    protected virtual void ValidateRequest(ReportRequest request)
    {
        // Default validation: dùng cho tất cả report generators
        if (request.StartDate > request.EndDate)
            throw new ArgumentException("Start date must be before end date");
    }

    // Abstract steps: subclass BẮT BUỘC phải implement → compile-time enforcement
    protected abstract Task<TData> FetchDataAsync(ReportRequest request, CancellationToken ct);
    protected abstract Task<TData> ProcessDataAsync(TData data, CancellationToken ct);
    protected abstract Task<TReport> BuildReportAsync(
        TData data, ReportRequest request, CancellationToken ct);

    // Hook: default là no-op → subclass có thể override để thêm email notification, save to storage...
    protected virtual Task PostProcessAsync(TReport report, CancellationToken ct)
        => Task.CompletedTask;
}

// === BƯỚC 2: Concrete Implementation – SalesReport customize các bước ===
// SalesReportGenerator implement abstract steps theo nghiệp vụ của nó
// InventoryReportGenerator sẽ implement CÙNG skeleton nhưng steps khác hoàn toàn
public class SalesReportGenerator(
    IOrderRepository orderRepo,
    IProductRepository productRepo,
    IPdfService pdfService)
    : ReportGenerator<SalesData, SalesReport>
{
    // FetchDataAsync: lấy orders và products từ DB trong cùng khoảng thời gian
    protected override async Task<SalesData> FetchDataAsync(
        ReportRequest request, CancellationToken ct)
    {
        var orders = await orderRepo.GetByDateRangeAsync(
            request.StartDate, request.EndDate, ct);
        // Lấy productIds từ tất cả order items → batch query thay vì N+1
        var productIds = orders.SelectMany(o => o.Items.Select(i => i.ProductId)).Distinct();
        var products = await productRepo.GetByIdsAsync(productIds, ct);

        return new SalesData { Orders = orders.ToList(), Products = products.ToList() };
    }

    // ProcessDataAsync: tính các aggregates (không query DB, chỉ tính toán từ data đã có)
    protected override Task<SalesData> ProcessDataAsync(SalesData data, CancellationToken ct)
    {
        // Aggregate calculations: đây là "business intelligence" của sales report
        data.TotalRevenue = data.Orders.Sum(o => o.Total);
        data.TotalOrders = data.Orders.Count;
        // Ternary tránh chia cho 0 khi không có đơn hàng nào
        data.AverageOrderValue = data.TotalOrders > 0
            ? data.TotalRevenue / data.TotalOrders
            : 0;

        // Top 10 products by revenue: flatten all order items → group by product → sort
        data.TopProducts = data.Orders
            .SelectMany(o => o.Items)                        // Flatten: tất cả items từ mọi orders
            .GroupBy(i => i.ProductId)                       // Group theo product
            .Select(g => new ProductSales
            {
                ProductId    = g.Key,
                TotalQuantity = g.Sum(i => i.Quantity),
                TotalRevenue  = g.Sum(i => i.Price * i.Quantity)
            })
            .OrderByDescending(p => p.TotalRevenue)          // Sort: doanh thu cao → thấp
            .Take(10)                                         // Chỉ lấy top 10
            .ToList();

        // Task.FromResult: wrap synchronous result thành Task → không cần async/await
        return Task.FromResult(data);
    }

    // BuildReportAsync: tạo PDF từ processed data
    protected override async Task<SalesReport> BuildReportAsync(
        SalesData data, ReportRequest request, CancellationToken ct)
    {
        // pdfService.GenerateAsync: render template với data → trả về byte array
        var pdfBytes = await pdfService.GenerateAsync(new SalesReportTemplate(data), ct);
        return new SalesReport
        {
            // MMM yyyy format: "Jan 2025", "Dec 2025"
            Title       = $"Sales Report {request.StartDate:MMM yyyy}",
            GeneratedAt = DateTime.UtcNow,
            PdfContent  = pdfBytes,  // PDF binary content để download
            Summary     = data       // Structured data để hiển thị trực tiếp trên web
        };
    }

    // Override validation hook: thêm validation ĐẶC THÙ cho sales report
    // Gọi base.ValidateRequest() trước để giữ lại default validation
    protected override void ValidateRequest(ReportRequest request)
    {
        base.ValidateRequest(request); // Kế thừa: kiểm tra StartDate <= EndDate
        // Thêm validation riêng: sales report không hỗ trợ khoảng thời gian quá 1 năm
        if (request.EndDate - request.StartDate > TimeSpan.FromDays(366))
            throw new ArgumentException("Date range cannot exceed 1 year");
    }

    // Override PostProcess hook: gửi email khi report generation xong
    // Không bắt buộc – nếu không override, base class dùng Task.CompletedTask (no-op)
    protected override async Task PostProcessAsync(SalesReport report, CancellationToken ct)
    {
        // Thực tế: upload PDF lên blob storage, gửi email với link download...
        await Task.CompletedTask;
    }
}`,
    umlDiagram: `┌───────────────────────────────┐
│       AbstractClass           │
├───────────────────────────────┤
│+TemplateMethod()              │ ← final, defines skeleton
│  Step1()                      │
│  PrimitiveOp1()               │ ← abstract
│  Step3()                      │
│  PrimitiveOp2()               │ ← abstract
│  Hook()                       │ ← optional override
├───────────────────────────────┤
│#PrimitiveOp1() abstract       │
│#PrimitiveOp2() abstract       │
│#Hook() virtual {}             │
└───────────────────────────────┘
              ▲
    ┌─────────┴─────────┐
    │    ConcreteClass  │
    ├───────────────────┤
    │#PrimitiveOp1()    │
    │#PrimitiveOp2()    │
    └───────────────────┘`
  },
  {
    id: "visitor",
    name: "Visitor",
    nameVi: "Visitor - Khách Thăm",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "low",
    readingTime: 13,
    phase: 4,
    description: "Cho phép định nghĩa operation mới lên các elements của một object structure mà không thay đổi các lớp của elements đó.",
    intent: "Tách biệt algorithm khỏi object structure. Thêm operations mới mà không cần modify các classes, chỉ cần thêm visitor mới.",
    dotnetExample: "Expression Visitor trong LINQ, Roslyn Syntax Tree visitors, JSON serialization visitors, tax calculation visitor trên order items.",
    whenToUse: [
      "Khi cần thực hiện nhiều distinct operations trên object structure",
      "Khi object structure ít thay đổi nhưng cần thêm operations thường xuyên",
      "Khi muốn accumulate state across elements trong traversal",
      "Khi cần separate concerns giữa data structure và operations"
    ],
    whenNotToUse: [
      "Khi class hierarchy thay đổi thường xuyên – visitor phải update theo",
      "Khi chỉ có ít operations cần thực hiện",
      "Khi đơn giản hơn khi add methods trực tiếp vào classes"
    ],
    codeExample: `// LUỒNG XỬ LÝ: item.Accept(visitor) → visitor.Visit(this) [double dispatch] → visitor xử lý theo loại item
// ════════════════════════════════════════════════════════════════
// Visitor giải quyết: thêm operation mới (tính thuế, export CSV) mà KHÔNG sửa order item classes.
// "Double dispatch": C# không có multiple dispatch → Accept(visitor) + visitor.Visit(this) giả lập nó.

// === BƯỚC 1: Element interface – mỗi element "chào đón" visitor ===
// Tại sao cần Accept()? C# dispatch method dựa trên compile-time type.
// Nếu gọi visitor.Visit(item) khi item là IOrderItem → compiler dùng overload Visit(IOrderItem)
// Nhưng Accept() gọi visitor.Visit(this) → 'this' là compile-time type cụ thể → đúng overload
// Đây là "Double Dispatch": dispatch lần 1 qua item.Accept(), dispatch lần 2 qua visitor.Visit(this)
public interface IOrderItem
{
    string Name { get; }
    decimal UnitPrice { get; }
    int Quantity { get; }
    // Accept: "cửa vào" cho visitor – element không biết visitor làm gì, chỉ biết "mời vào"
    void Accept(IOrderItemVisitor visitor);
}

// === BƯỚC 2: Visitor interface – định nghĩa operation cho mỗi element type ===
// Mỗi overload Visit() tương ứng với 1 element type cụ thể → type-safe, no casting
// Thêm element type mới (SubscriptionItem)? Phải thêm Visit(SubscriptionItem) ở đây
// → đây là trade-off: Visitor dễ thêm operation, nhưng khó thêm element type
public interface IOrderItemVisitor
{
    void Visit(PhysicalProductItem item);
    void Visit(DigitalProductItem item);
    void Visit(ServiceItem item);
    void Visit(BundleItem item);
}

// === BƯỚC 3: Concrete Elements – mỗi loại item có data riêng ===
// Primary constructor C# 12: parameter trực tiếp trở thành properties → less boilerplate
public class PhysicalProductItem(
    string name, decimal unitPrice, int quantity, string taxCategory) : IOrderItem
{
    public string Name => name;
    public decimal UnitPrice => unitPrice;
    public int Quantity => quantity;
    // TaxCategory là thông tin ĐẶC THÙ của PhysicalProduct, DigitalProduct không có
    // → Visitor có thể dùng thông tin này khi Visit(PhysicalProductItem)
    public string TaxCategory => taxCategory;

    // Accept: truyền this với type PhysicalProductItem → compiler chọn đúng Visit overload
    public void Accept(IOrderItemVisitor visitor) => visitor.Visit(this);
}

public class DigitalProductItem(string name, decimal unitPrice, int quantity) : IOrderItem
{
    public string Name => name;
    public decimal UnitPrice => unitPrice;
    public int Quantity => quantity;
    // DigitalProduct không có TaxCategory: luôn chịu VAT 10% theo luật VN

    public void Accept(IOrderItemVisitor visitor) => visitor.Visit(this);
}

public class ServiceItem(string name, decimal unitPrice, int quantity, bool isExempt) : IOrderItem
{
    public string Name => name;
    public decimal UnitPrice => unitPrice;
    public int Quantity => quantity;
    // IsTaxExempt: một số dịch vụ được miễn thuế (y tế, giáo dục...)
    public bool IsTaxExempt => isExempt;

    public void Accept(IOrderItemVisitor visitor) => visitor.Visit(this);
}

// BundleItem: composite element – chứa các items khác
// Visitor có thể xử lý bundle như 1 đơn vị HOẶC delegate xuống components
public class BundleItem(string name, decimal unitPrice, int quantity, IEnumerable<IOrderItem> components) : IOrderItem
{
    public string Name => name;
    public decimal UnitPrice => unitPrice;
    public int Quantity => quantity;
    // Components: các items trong bundle – visitor có thể recurse vào đây
    public IEnumerable<IOrderItem> Components => components;

    public void Accept(IOrderItemVisitor visitor) => visitor.Visit(this);
}

// === BƯỚC 4: TaxCalculationVisitor – operation 1: tính thuế ===
// Visitor accumulate state (TotalTax, TaxBreakdown) khi traverse qua elements
// → không cần modify element classes để thêm tax calculation logic
public class TaxCalculationVisitor(TaxRates rates) : IOrderItemVisitor
{
    // Accumulated state: visitor "nhớ" tổng thuế sau khi visit tất cả items
    public decimal TotalTax { get; private set; }
    public List<TaxLineItem> TaxBreakdown { get; } = []; // Chi tiết từng dòng thuế

    // Thuế VAT cho hàng hóa vật lý: rate phụ thuộc vào category (5%, 10%)
    public void Visit(PhysicalProductItem item)
    {
        // rates.GetRateForCategory: lookup tax rate từ config theo category
        var rate = rates.GetRateForCategory(item.TaxCategory);
        var subtotal = item.UnitPrice * item.Quantity;
        var tax = subtotal * rate;
        TotalTax += tax; // Cộng dồn vào tổng
        TaxBreakdown.Add(new TaxLineItem(item.Name, subtotal, rate, tax, "VAT"));
    }

    // Digital goods: luôn 10% VAT theo Thông tư 40/2021/TT-BTC của Việt Nam
    public void Visit(DigitalProductItem item)
    {
        var subtotal = item.UnitPrice * item.Quantity;
        var tax = subtotal * 0.10m; // 10% cố định
        TotalTax += tax;
        TaxBreakdown.Add(new TaxLineItem(item.Name, subtotal, 0.10m, tax, "Digital VAT"));
    }

    // Service: kiểm tra miễn thuế trước khi tính
    public void Visit(ServiceItem item)
    {
        if (item.IsTaxExempt)
        {
            // Vẫn thêm vào breakdown để record, nhưng tax = 0
            TaxBreakdown.Add(new TaxLineItem(item.Name, item.UnitPrice * item.Quantity, 0, 0, "Exempt"));
            return; // Early return: không cộng vào TotalTax
        }
        var subtotal = item.UnitPrice * item.Quantity;
        var tax = subtotal * 0.10m;
        TotalTax += tax;
        TaxBreakdown.Add(new TaxLineItem(item.Name, subtotal, 0.10m, tax, "Service Tax"));
    }

    // Bundle: delegate xuống từng component → visitor xử lý từng item riêng lẻ
    // Đây là recursive visitor – tốt cho composite structures
    public void Visit(BundleItem item)
    {
        foreach (var component in item.Components)
            component.Accept(this); // Double dispatch cho từng component
    }
}

// === BƯỚC 5: CsvExportVisitor – operation 2: export CSV ===
// Cùng elements, operation hoàn toàn khác → thêm Visitor mới, KHÔNG sửa element classes
// Đây là sức mạnh cốt lõi của Visitor: Open/Closed Principle cho operations
public class CsvExportVisitor : IOrderItemVisitor
{
    private readonly StringBuilder _csv = new();

    // Constructor thêm header row
    public CsvExportVisitor()
        => _csv.AppendLine("Type,Name,UnitPrice,Quantity,Subtotal");

    public void Visit(PhysicalProductItem item)
        => _csv.AppendLine($"Physical,{item.Name},{item.UnitPrice},{item.Quantity},{item.UnitPrice * item.Quantity}");

    public void Visit(DigitalProductItem item)
        => _csv.AppendLine($"Digital,{item.Name},{item.UnitPrice},{item.Quantity},{item.UnitPrice * item.Quantity}");

    public void Visit(ServiceItem item)
        => _csv.AppendLine($"Service,{item.Name},{item.UnitPrice},{item.Quantity},{item.UnitPrice * item.Quantity}");

    public void Visit(BundleItem item)
    {
        // Bundle: ghi cả bundle header lẫn từng component
        _csv.AppendLine($"Bundle,{item.Name},{item.UnitPrice},{item.Quantity},{item.UnitPrice * item.Quantity}");
        foreach (var component in item.Components)
            component.Accept(this); // Recursive: components được export với prefix indentation
    }

    // Lấy kết quả CSV sau khi đã visit tất cả items
    public string GetCsv() => _csv.ToString();
}`,
    umlDiagram: `┌──────────────┐       ┌──────────────┐
│   Visitor    │       │   Element    │
├──────────────┤       ├──────────────┤
│+VisitElemA() │       │+Accept(v)    │
│+VisitElemB() │       └──────────────┘
└──────────────┘              ▲
        ▲               ┌─────┴──────┐
┌────────────────┐  ┌────────┐  ┌────────┐
│ConcreteVisitor │  │ElemA   │  │ElemB   │
├────────────────┤  ├────────┤  ├────────┤
│+VisitElemA()   │  │+Accept │  │+Accept │
│+VisitElemB()   │  │ v.Visit│  │ v.Visit│
└────────────────┘  │ (this) │  │ (this) │
                    └────────┘  └────────┘`
  },
  {
    id: "interpreter",
    name: "Interpreter",
    nameVi: "Interpreter - Trình Thông Dịch",
    category: "behavioral",
    categoryVi: "Hành Vi",
    priority: "low",
    readingTime: 12,
    phase: 5,
    description: "Định nghĩa representation cho grammar của một ngôn ngữ, cùng với một interpreter sử dụng representation để interpret các câu trong ngôn ngữ đó.",
    intent: "Xây dựng mini language hoặc DSL cho domain-specific problems. Biểu diễn language grammar dưới dạng object trees.",
    dotnetExample: "LINQ Expression Trees, Roslyn Script Engine, SQL query builders, rule engines trong business applications, regex engine.",
    whenToUse: [
      "Khi cần interpret a simple grammar không cần full parser",
      "Khi muốn build DSL cho business rules",
      "Khi grammar đơn giản và hiệu suất không phải ưu tiên",
      "Khi cần parse complex query strings hoặc expressions"
    ],
    whenNotToUse: [
      "Khi grammar phức tạp – dùng parser generator thay thế",
      "Khi performance critical",
      "Khi thay đổi grammar thường xuyên"
    ],
    codeExample: `// LUỒNG XỬ LÝ: Xây dựng expression tree → Evaluate(context) đệ quy → true/false kết quả
// ════════════════════════════════════════════════════════════════
// Interpreter: biểu diễn grammar của một ngôn ngữ đơn giản dưới dạng object tree.
// Mỗi node trong tree là một expression; Evaluate() đệ quy qua tree để tính kết quả.
// Thực tế: LINQ Expression Trees, Roslyn, business rule engines đều dùng pattern này.

// === BƯỚC 1: Abstract Expression – giao diện chung cho tất cả nodes trong tree ===
// Generic T: interpreter có thể evaluate trên bất kỳ domain model nào (Order, Customer, Invoice...)
// Hai methods: Evaluate() cho runtime, Describe() cho debugging/logging/display
public interface IExpression<T>
{
    // Evaluate: "thông dịch" expression trên context cụ thể → true/false
    bool Evaluate(T context);
    // Describe: human-readable string của expression → dùng để log, hiển thị rule cho admin
    string Describe();
}

// === BƯỚC 2: Terminal Expressions – nodes LÁ của expression tree ===
// Terminal = không chứa sub-expressions; đây là "điểm dừng" của đệ quy

// PropertyEqualsExpression: kiểm tra property == value
// Func<T, object?> thay vì reflection → type-safe, fast, lambda expression
public class PropertyEqualsExpression<T>(
    Func<T, object?> propertyGetter,  // Lambda để lấy giá trị property: o => o.CustomerTier
    object expectedValue,              // Giá trị mong muốn: "Platinum"
    string propertyName) : IExpression<T>
{
    public bool Evaluate(T context)
    {
        var actualValue = propertyGetter(context); // Lấy giá trị thực từ context
        // Equals() thay vì == : hoạt động với value types, strings, và objects
        return Equals(actualValue, expectedValue);
    }

    // Describe() tạo readable string: "CustomerTier == Platinum"
    public string Describe() => $"{propertyName} == {expectedValue}";
}

// PropertyRangeExpression: kiểm tra min ≤ property ≤ max
// Func<T, decimal> thay vì Func<T, object?> → type-safe cho numeric comparisons
public class PropertyRangeExpression<T>(
    Func<T, decimal> propertyGetter,
    decimal min, decimal max,
    string propertyName) : IExpression<T>
{
    public bool Evaluate(T context)
    {
        var value = propertyGetter(context);
        // Range check: >= min AND <= max → thể hiện business rule "from X to Y"
        return value >= min && value <= max;
    }

    public string Describe() => $"{propertyName} between {min} and {max}";
}

// === BƯỚC 3: Non-terminal Expressions – NHÁNH của expression tree ===
// Non-terminal = chứa sub-expressions; đây là "composite" nodes – đệ quy qua chúng

// AndExpression: trả về true nếu CẢ HAI sub-expressions đều true
// Short-circuit evaluation: nếu left = false → right KHÔNG được evaluate (tiết kiệm CPU)
public class AndExpression<T>(IExpression<T> left, IExpression<T> right) : IExpression<T>
{
    // && operator: short-circuit → không evaluate right nếu left đã false
    public bool Evaluate(T context) => left.Evaluate(context) && right.Evaluate(context);
    // Describe wrap trong ngoặc để rõ ràng precedence: ((A) AND (B))
    public string Describe() => $"({left.Describe()} AND {right.Describe()})";
}

// OrExpression: trả về true nếu ÍT NHẤT MỘT trong hai sub-expressions là true
public class OrExpression<T>(IExpression<T> left, IExpression<T> right) : IExpression<T>
{
    // || operator: short-circuit → không evaluate right nếu left đã true
    public bool Evaluate(T context) => left.Evaluate(context) || right.Evaluate(context);
    public string Describe() => $"({left.Describe()} OR {right.Describe()})";
}

// NotExpression: phủ định – đảo ngược kết quả của sub-expression
public class NotExpression<T>(IExpression<T> inner) : IExpression<T>
{
    public bool Evaluate(T context) => !inner.Evaluate(context);
    public string Describe() => $"NOT ({inner.Describe()})";
}

// === BƯỚC 4: Rules helper class – xây dựng complex rules từ primitives ===
// Rules cung cấp các "named expressions" → code đọc như business language
// Đây là cách implement DSL (Domain Specific Language) đơn giản trong C#
public static class Rules
{
    // PlatinumCustomer: expression đọc như business requirement
    // "Khách hàng hạng Platinum" → code: o.CustomerTier == "Platinum"
    public static IExpression<Order> PlatinumCustomer =>
        new PropertyEqualsExpression<Order>(o => o.CustomerTier, "Platinum", "CustomerTier");

    // HighValueOrder: đơn hàng có giá trị ≥ 1 triệu VND
    // decimal.MaxValue thay cho "không có giới hạn trên"
    public static IExpression<Order> HighValueOrder =>
        new PropertyRangeExpression<Order>(o => o.Total, 1_000_000, decimal.MaxValue, "Total");

    // EligibleForFreeShipping: đơn ≥ 500k VÀ giao hàng tiêu chuẩn
    // AndExpression kết hợp hai conditions → composite rule
    public static IExpression<Order> EligibleForFreeShipping =>
        new AndExpression<Order>(
            new PropertyRangeExpression<Order>(o => o.Total, 500_000, decimal.MaxValue, "Total"),
            new PropertyEqualsExpression<Order>(o => o.ShippingType, "standard", "ShippingType"));
}

// === BƯỚC 5: Xây dựng complex business rule ===
// Business rule: "giảm giá cho Platinum customers HOẶC high-value orders eligible for free shipping"
// Đọc code như câu văn – đây là giá trị của Interpreter pattern
var discountRule = new OrExpression<Order>(
    Rules.PlatinumCustomer,                                      // Nhánh 1: OR
    new AndExpression<Order>(Rules.HighValueOrder, Rules.EligibleForFreeShipping)); // Nhánh 2

// Describe() trả về human-readable rule → hiển thị cho admin để verify
Console.WriteLine(discountRule.Describe());
// Output: ((CustomerTier == Platinum) OR ((Total between 1000000 and MaxValue)
//          AND ((Total between 500000 and MaxValue) AND (ShippingType == standard))))

// === BƯỚC 6: Evaluate trên dữ liệu thực ===
var order = new Order { CustomerTier = "Gold", Total = 2_000_000m, ShippingType = "standard" };
// Gold (không phải Platinum) → PlatinumCustomer = false
// Total = 2M ≥ 1M → HighValueOrder = true
// Total = 2M ≥ 500k AND standard shipping → EligibleForFreeShipping = true
// HighValueOrder AND EligibleForFreeShipping = true AND true = true
// false OR true = TRUE → khách này được giảm giá!
bool qualifiesForDiscount = discountRule.Evaluate(order); // true
// Interpreter pattern: rule được biểu diễn như object tree → dễ serialize, store, và modify tại runtime`,
    umlDiagram: `┌──────────────┐
│  Expression  │
├──────────────┤
│+Interpret()  │
└──────────────┘
        ▲
  ┌─────┴──────┐
┌──────┐  ┌────────────────┐
│Termin│  │  NonTerminal   │
│al Exp│  ├────────────────┤
├──────┤  │-expressions[]  │
│+Eval │  │+Interpret()    │──▶ each.Interpret()
└──────┘  └────────────────┘`
  }
];

// Thống kê patterns
const PATTERN_STATS = {
  total: PATTERNS_DATA.length,
  creational: PATTERNS_DATA.filter(p => p.category === 'creational').length,
  structural: PATTERNS_DATA.filter(p => p.category === 'structural').length,
  behavioral: PATTERNS_DATA.filter(p => p.category === 'behavioral').length,
  highPriority: PATTERNS_DATA.filter(p => p.priority === 'high').length,
  totalWeeks: 16,
  totalPhases: 5
};

// Phases data
const PHASES_DATA = [
  {
    id: 1,
    title: "Giai Đoạn 1: Nền Tảng",
    subtitle: "Core Patterns cho .NET Developer",
    duration: "4 tuần",
    weeks: "Tuần 1-4",
    color: "#3b82f6",
    icon: "fa-rocket",
    description: "Bắt đầu với các patterns quan trọng nhất và thường gặp nhất trong .NET development. Đây là nền tảng bắt buộc trước khi tiến đến các patterns phức tạp hơn.",
    patterns: ["singleton", "factory-method", "builder", "adapter", "decorator", "facade", "strategy", "observer", "command", "chain-of-responsibility"],
    milestone: "Áp dụng được 10 patterns vào dự án thực tế",
    project: "Xây dựng Order Processing System với đầy đủ patterns"
  },
  {
    id: 2,
    title: "Giai Đoạn 2: Mở Rộng",
    subtitle: "Patterns Bổ Sung Quan Trọng",
    duration: "3 tuần",
    weeks: "Tuần 5-7",
    color: "#8b5cf6",
    icon: "fa-layer-group",
    description: "Mở rộng với các patterns structural và behavioral quan trọng. Đặc biệt hữu ích cho enterprise application development.",
    patterns: ["abstract-factory", "composite", "proxy", "mediator", "state", "template-method"],
    milestone: "Hiểu và implement được State Machine và Mediator",
    project: "Refactor codebase hiện tại để áp dụng patterns mới"
  },
  {
    id: 3,
    title: "Giai Đoạn 3: Bổ Sung",
    subtitle: "Hoàn Thiện Bộ Patterns",
    duration: "3 tuần",
    weeks: "Tuần 8-10",
    color: "#f59e0b",
    icon: "fa-puzzle-piece",
    description: "Các patterns ít phổ biến hơn nhưng vẫn xuất hiện trong các scenarios đặc biệt. Hiểu chúng giúp nhận ra khi nào nên sử dụng.",
    patterns: ["prototype", "bridge", "iterator"],
    milestone: "Biết khi nào nên và không nên dùng mỗi pattern",
    project: "Code review thực tế và identify anti-patterns"
  },
  {
    id: 4,
    title: "Giai Đoạn 4: Nâng Cao",
    subtitle: "Patterns Chuyên Biệt",
    duration: "3 tuần",
    weeks: "Tuần 11-13",
    color: "#ef4444",
    icon: "fa-chess",
    description: "Patterns có use cases đặc biệt. Flyweight cho memory optimization, Memento cho undo/redo. Ít gặp nhưng quan trọng khi gặp đúng vấn đề.",
    patterns: ["flyweight", "memento", "visitor"],
    milestone: "Implement undo/redo system và optimize memory",
    project: "Build một text editor đơn giản với undo/redo"
  },
  {
    id: 5,
    title: "Giai Đoạn 5: Tổng Hợp",
    subtitle: "Mastery và Real-World Integration",
    duration: "3 tuần",
    weeks: "Tuần 14-16",
    color: "#22c55e",
    icon: "fa-crown",
    description: "Interpreter pattern và đặc biệt quan trọng – kết hợp nhiều patterns trong một hệ thống hoàn chỉnh. Học cách patterns hỗ trợ lẫn nhau.",
    patterns: ["interpreter"],
    milestone: "Design system architecture sử dụng multiple patterns",
    project: "Full-stack application với CQRS, DDD, và multiple patterns"
  }
];

// Pattern của ngày - xoay vòng theo ngày trong tuần
function getPatternOfTheDay() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const index = dayOfYear % PATTERNS_DATA.length;
  return PATTERNS_DATA[index];
}
