# Bài 11 – Abstract Factory Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 2 – Mở Rộng | **Tuần:** 5 | **Thứ tự:** 11/23  
**Thời lượng ước tính:** 23 phút  
**Độ ưu tiên:** ⭐⭐ Trung Bình

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Code dùng SQL Server-specific objects rải rác]**

> "Chào mừng đến Phase 2! Bài này là Abstract Factory – anh cả của Factory Method.
>
> Hãy tưởng tượng bạn có một ứng dụng phải hỗ trợ cả SQL Server và PostgreSQL. Vấn đề không chỉ là connection string – syntax paging khác nhau (`OFFSET/FETCH NEXT` vs `LIMIT/OFFSET`), parameter prefix khác (`@userId` vs `$1`), và nhiều thứ khác.
>
> Nếu dùng Factory Method, bạn giải quyết từng object một. Abstract Factory giải quyết cả *họ* objects: tạo `SqlConnection` thì phải đi kèm `SqlCommand` – không bao giờ nhầm lẫn SQL Server connection với PostgreSQL command."

---

## PHẦN 2 – ABSTRACT FACTORY VS FACTORY METHOD (2:30 – 5:30)

**[Màn hình: So sánh]**

```
Factory Method:    Tạo MỘT loại object
                   Creator → creates → Product

Abstract Factory:  Tạo CẢ HỌ objects tương thích nhau
                   SqlServerFactory → creates → SqlConnection + SqlCommand + SqlParameter
                   PostgreSqlFactory → creates → NpgsqlConnection + NpgsqlCommand + NpgsqlParameter
```

> "Abstract Factory đảm bảo consistency: nếu bạn chọn `SqlServerFactory`, bạn nhận toàn bộ SQL Server objects. Không bao giờ có chuyện SqlConnection + NpgsqlCommand – chúng không tương thích.
>
> Điều này mapping trực tiếp vào EF Core: `UseSqlServer()`, `UseNpgsql()`, `UseSqlite()` là các Abstract Factories. Gọi `UseSqlServer()` → EF Core dùng toàn bộ SQL Server-specific implementations."

---

## PHẦN 3 – CODE WALKTHROUGH (5:30 – 17:00)

### Bước 1: Abstract Products – họ interfaces (5:30 – 8:00)

```csharp
// "Họ" database objects: Connection, Command, Parameter phải tương thích nhau
public interface IDbConnection : IAsyncDisposable
{
    Task OpenAsync(CancellationToken ct = default);
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

public interface IDbParameter
{
    string Name { get; set; }
    object? Value { get; set; }
}
```

### Bước 2: Abstract Factory interface (8:00 – 10:00)

```csharp
// IDatabaseFactory: tạo TẤT CẢ members của database "họ"
public interface IDatabaseFactory
{
    IDbConnection CreateConnection(string connectionString);
    IDbCommand CreateCommand(string sql, IDbConnection connection);
    string GetParameterPrefix();                              // "@" vs "$"
    string BuildPagingQuery(string baseQuery, int skip, int take); // OFFSET/FETCH vs LIMIT/OFFSET
}
```

### Bước 3: Concrete Factories (10:00 – 14:00)

```csharp
// SQL Server Factory – TẠO và ĐẢM BẢO tất cả objects trong họ tương thích
public class SqlServerFactory : IDatabaseFactory
{
    public IDbConnection CreateConnection(string connectionString)
        => new SqlServerDbConnection(new SqlConnection(connectionString));

    public IDbCommand CreateCommand(string sql, IDbConnection connection)
        => new SqlServerDbCommand(new SqlCommand(sql));

    // SQL Server: named parameters với prefix "@"
    public string GetParameterPrefix() => "@";

    // SQL Server: OFFSET/FETCH NEXT – chuẩn SQL:2008
    public string BuildPagingQuery(string baseQuery, int skip, int take)
        => $"{baseQuery} ORDER BY (SELECT NULL) OFFSET {skip} ROWS FETCH NEXT {take} ROWS ONLY";
}

// PostgreSQL Factory – KHÁC HOÀN TOÀN nhưng cùng interface
public class PostgreSqlFactory : IDatabaseFactory
{
    public IDbConnection CreateConnection(string connectionString)
        => new PostgreSqlDbConnection(new NpgsqlConnection(connectionString));

    public IDbCommand CreateCommand(string sql, IDbConnection connection)
        => new PostgreSqlDbCommand(new NpgsqlCommand(sql));

    // PostgreSQL: positional parameters "$1", "$2", "$3"
    public string GetParameterPrefix() => "$";

    // PostgreSQL: LIMIT/OFFSET – cú pháp khác SQL Server
    public string BuildPagingQuery(string baseQuery, int skip, int take)
        => $"{baseQuery} LIMIT {take} OFFSET {skip}";
}
```

### Bước 4: Repository – client chỉ biết IDatabaseFactory (14:00 – 17:00)

```csharp
// UserRepository KHÔNG BIẾT đang chạy với SQL Server hay PostgreSQL
public class UserRepository(IDatabaseFactory dbFactory, string connectionString)
{
    public async Task<IEnumerable<User>> GetPagedAsync(int page, int pageSize, CancellationToken ct)
    {
        var prefix = dbFactory.GetParameterPrefix();       // "@" hoặc "$"
        var sql = dbFactory.BuildPagingQuery(              // Đúng cú pháp từng DB
            "SELECT id, name, email FROM users WHERE active = true",
            (page - 1) * pageSize, pageSize);

        await using var conn = dbFactory.CreateConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = dbFactory.CreateCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        var users = new List<User>();
        while (await reader.ReadAsync(ct))
            users.Add(MapUser(reader));
        return users;
    }
}

// DI Registration – điểm DUY NHẤT quyết định database engine
builder.Services.AddSingleton<IDatabaseFactory>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return config["DatabaseProvider"] switch
    {
        "SqlServer"  => new SqlServerFactory(),
        "PostgreSQL" => new PostgreSqlFactory(),
        _ => throw new InvalidOperationException("Unknown database provider")
    };
});
// Đổi SQL Server sang PostgreSQL: chỉ thay 1 dòng trong appsettings.json
```

---

## PHẦN 4 – EF CORE LÀ ABSTRACT FACTORY (17:00 – 20:00)

```csharp
// EF Core provider factories – Abstract Factory pattern built-in
// Mỗi UseXxx() là một concrete factory

// SQL Server factory
builder.Services.AddDbContext<AppDbContext>(opt => 
    opt.UseSqlServer(connectionString));  // ← SqlServerFactory

// PostgreSQL factory
builder.Services.AddDbContext<AppDbContext>(opt => 
    opt.UseNpgsql(connectionString));     // ← NpgsqlFactory (PostgreSQL)

// SQLite factory (testing)
builder.Services.AddDbContext<AppDbContext>(opt => 
    opt.UseSqlite("Data Source=test.db")); // ← SqliteFactory

// DbContext code không đổi dù dùng provider nào
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products { get; set; }
    public DbSet<Order> Orders { get; set; }
    
    // OnModelCreating: cùng fluent API cho mọi provider
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Name)
            .IsUnique();
    }
}
```

> "EF Core tự động dùng đúng SQL dialect, migration engine, và query translator cho mỗi provider. Đây là Abstract Factory giải quyết toàn bộ database abstraction."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (20:00 – 22:00)

**✅ NÊN dùng khi:**
- Hệ thống cần hoạt động với nhiều họ providers (SQL Server/PostgreSQL, AWS/Azure, production/test)
- Cần đảm bảo objects trong cùng họ tương thích với nhau
- Muốn swap toàn bộ họ implementation bằng một thay đổi config

**❌ KHÔNG nên dùng khi:**
- Chỉ có một loại product – dùng Factory Method thay thế
- Thêm product type mới vào family thường xuyên – phải update tất cả factories
- Ứng dụng nhỏ không cần nhiều providers

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (22:00 – 23:00)

> "Abstract Factory: tạo cả họ objects tương thích. Factory Method: tạo một object.
>
> Ba điều nhớ:
> 1. Abstract Factory đảm bảo consistency: SqlServerFactory luôn tạo tất cả SQL Server objects
> 2. EF Core's `UseSqlServer()`, `UseNpgsql()` là Abstract Factory có sẵn – hãy nhận ra chúng
> 3. Swap provider = đổi một factory, toàn bộ codebase không đổi
>
> Bài tiếp theo: **Composite Pattern** – khi bạn có cấu trúc cây (menu với sub-menu, folder với file), Composite cho phép client xử lý item đơn lẻ và nhóm items giống hệt nhau."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Đổi DatabaseProvider trong config, chạy query, thấy SQL syntax khác |
| So sánh | Factory Method (1 product) vs Abstract Factory (family) |
| Visual | Diagram "gia đình" objects – SQL Server family vs PostgreSQL family |
