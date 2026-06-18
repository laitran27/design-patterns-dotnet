# Bài 14 – Mediator Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 2 – Mở Rộng | **Tuần:** 6 | **Thứ tự:** 14/23  
**Thời lượng ước tính:** 22 phút  
**Độ ưu tiên:** ⭐⭐ Trung Bình

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Sơ đồ nhiều objects kết nối trực tiếp với nhau]**

> "Hãy tưởng tượng một phòng họp với 10 người. Nếu mỗi người nói chuyện trực tiếp với từng người khác, bạn có 45 kết nối hai chiều. Khi số người tăng lên 20, số kết nối tăng lên 190. Đây là vấn đề O(n²).
>
> Giải pháp: có một *chủ tọa*. Mỗi người chỉ nói với chủ tọa. Chủ tọa điều phối ai nghe gì. Số kết nối: O(n).
>
> Đây là **Mediator Pattern**.
>
> Trong .NET: bạn đã dùng MediatR mỗi ngày. `mediator.Send(command)` – Controller không biết Handler nào xử lý. `mediator.Publish(notification)` – Publisher không biết Subscriber nào lắng nghe."

---

## PHẦN 2 – MEDIATOR LÀ GÌ? CONCEPT (2:30 – 6:00)

```
TRƯỚC (không có Mediator) – O(n²) connections:
OrderService ←──→ InventoryService
     ↕                    ↕
EmailService ←──→ LoyaltyService
(mỗi service biết tất cả services khác)

SAU (có Mediator) – O(n) connections:
OrderService ──▶
InventoryService ──▶   [MEDIATOR]
EmailService ──▶
LoyaltyService ──▶
(mỗi service chỉ biết Mediator)
```

> "Mediator định nghĩa một object encapsulate cách một tập hợp objects tương tác với nhau. Loose coupling: objects không cần biết nhau, chỉ cần biết Mediator.
>
> Khác Observer: Observer là one-to-many broadcast. Mediator là hub điều phối two-way communication."

---

## PHẦN 3 – CODE WALKTHROUGH (6:00 – 17:00)

### Bước 1: MediatR – Mediator có sẵn trong .NET (6:00 – 10:00)

```csharp
// MediatR implement Mediator pattern cho Request/Response và Notification

// Request (Command/Query) – IRequest là marker
public record CreateProductCommand(string Name, decimal Price, int Stock) 
    : IRequest<ProductDto>;

// Handler xử lý request
public class CreateProductCommandHandler(
    IProductRepository repo, 
    IMediator mediator) // Handler cũng có thể dùng Mediator để publish events
    : IRequestHandler<CreateProductCommand, ProductDto>
{
    public async Task<ProductDto> Handle(CreateProductCommand request, CancellationToken ct)
    {
        var product = new Product(request.Name, request.Price, request.Stock);
        await repo.CreateAsync(product, ct);
        
        // Publish notification – Mediator broadcast đến tất cả handlers
        await mediator.Publish(new ProductCreatedNotification(product.Id, product.Name), ct);
        
        return new ProductDto(product.Id, product.Name, product.Price, product.Stock);
    }
}

// Notification – INotification là marker
public record ProductCreatedNotification(Guid ProductId, string Name) : INotification;

// Notification Handler 1: Index vào search engine
public class IndexProductInSearch(ISearchService search) 
    : INotificationHandler<ProductCreatedNotification>
{
    public async Task Handle(ProductCreatedNotification notification, CancellationToken ct)
        => await search.IndexAsync(notification.ProductId, notification.Name, ct);
}

// Notification Handler 2: Send email to category subscribers
public class NotifyCategorySubscribers(IEmailService email, ISubscriberRepository subscribers)
    : INotificationHandler<ProductCreatedNotification>
{
    public async Task Handle(ProductCreatedNotification notification, CancellationToken ct)
    {
        var subs = await subscribers.GetByCategoryAsync("New Products", ct);
        foreach (var sub in subs)
            await email.SendNewProductAlertAsync(sub.Email, notification.Name, ct);
    }
}

// Controller – chỉ biết IMediator
[ApiController]
[Route("api/products")]
public class ProductsController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(
        CreateProductCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);  // Mediator dispatch đến Handler
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
}
```

### Bước 2: MediatR Pipeline Behaviors (10:00 – 14:00)

```csharp
// Pipeline Behaviors – Mediator Pattern + Chain of Responsibility
// Mỗi Behavior bọc request/response, giống middleware nhưng cho MediatR

// Logging Behavior: log tất cả requests và responses
public class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request, 
        RequestHandlerDelegate<TResponse> next, // "next" trong chain
        CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        logger.LogInformation("Handling {RequestName}: {@Request}", requestName, request);
        
        var sw = Stopwatch.StartNew();
        var response = await next();  // Gọi handler tiếp theo
        
        logger.LogInformation("Handled {RequestName} in {ElapsedMs}ms", requestName, sw.ElapsedMilliseconds);
        return response;
    }
}

// Validation Behavior: validate trước khi handler xử lý
public class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        if (!validators.Any()) return await next();
        
        var context = new ValidationContext<TRequest>(request);
        var failures = validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();
        
        if (failures.Count > 0)
            throw new ValidationException(failures);  // Dừng chain, không gọi handler
        
        return await next();  // Validation passed: gọi handler tiếp theo
    }
}

// Registration
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());
builder.Services.AddScoped(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
builder.Services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
// Order matters! LoggingBehavior → ValidationBehavior → Handler
```

### Bước 3: Custom Mediator cho Chat Room (14:00 – 17:00)

```csharp
// Ví dụ tự implement Mediator để hiểu rõ pattern hơn
// Chat room: users không biết nhau, chỉ biết room (Mediator)

public interface IChatMediator
{
    void RegisterUser(ChatUser user);
    void SendMessage(string message, ChatUser from);
}

public class ChatRoom : IChatMediator
{
    private readonly List<ChatUser> _users = [];
    
    public void RegisterUser(ChatUser user)
    {
        user.SetMediator(this);
        _users.Add(user);
    }
    
    // Mediator điều phối: broadcast message đến TẤT CẢ users khác
    public void SendMessage(string message, ChatUser from)
    {
        foreach (var user in _users.Where(u => u != from))
            user.Receive($"[{from.Name}]: {message}");
    }
}

public class ChatUser(string name)
{
    public string Name { get; } = name;
    private IChatMediator? _mediator;
    
    public void SetMediator(IChatMediator mediator) => _mediator = mediator;
    
    // User chỉ biết Mediator, không biết users khác
    public void Send(string message) => _mediator?.SendMessage(message, this);
    
    public void Receive(string message) => Console.WriteLine($"{Name} received: {message}");
}

// Sử dụng
var room = new ChatRoom();
var alice = new ChatUser("Alice");
var bob = new ChatUser("Bob");
var charlie = new ChatUser("Charlie");

room.RegisterUser(alice);
room.RegisterUser(bob);
room.RegisterUser(charlie);

alice.Send("Hello everyone!"); // Bob và Charlie nhận – Alice không biết ai là ai
```

---

## PHẦN 4 – KHI NÀO DÙNG / KHÔNG DÙNG (17:00 – 19:30)

**✅ NÊN dùng khi:**
- Nhiều objects tương tác phức tạp, coupling cao
- Muốn decoupling objects khỏi nhau hoàn toàn
- Implement CQRS với Commands và Queries
- Cần pipeline behaviors (logging, validation, caching) xuyên suốt tất cả requests

**❌ KHÔNG nên dùng khi:**
- Mediator trở thành God Object – biết quá nhiều
- Chỉ có 2-3 objects tương tác đơn giản – direct call đủ rồi
- Performance critical – overhead của Mediator dispatch không chấp nhận được

---

## PHẦN 5 – TÓM TẮT & BÀI TIẾP THEO (19:30 – 22:00)

> "Mediator: tất cả objects giao tiếp qua một trung gian. O(n²) → O(n).
>
> Ba điều nhớ:
> 1. MediatR là Mediator pattern ready-to-use cho .NET – hãy dùng nó
> 2. Pipeline Behaviors = Mediator + Chain of Responsibility – powerful combination
> 3. Khi objects của bạn quá tightly coupled, hãy nghĩ đến Mediator
>
> Bài tiếp theo: **State Pattern** – object thay đổi behavior khi state thay đổi. Không còn if/switch khổng lồ để kiểm tra state. Order state machine: Pending → Confirmed → Shipped → Delivered – mỗi state là một class."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | MediatR với Pipeline Behaviors – thêm ValidationBehavior |
| Visual | Diagram O(n²) connections → O(n) với Mediator |
| Điểm nhấn | Thêm NotificationHandler mới: không sửa Handler hay Controller |
