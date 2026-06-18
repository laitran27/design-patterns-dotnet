# Bài 09 – Command Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 3 | **Thứ tự:** 9/23  
**Thời lượng ước tính:** 24 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Controller fat với nhiều business logic]**

> "Hai vấn đề thường gặp trong .NET projects.
>
> Vấn đề thứ nhất: Controller quá béo, chứa business logic trực tiếp. Khi API và background job cần cùng một operation, bạn phải copy-paste hoặc tạo service riêng.
>
> Vấn đề thứ hai: Bạn cần undo/redo trong một banking app. Làm sao undo một giao dịch chuyển tiền đã thực hiện?
>
> **Command Pattern** giải quyết cả hai: đóng gói mỗi operation thành một object. Object đó có thể được gửi qua network, lưu vào database, execute sau, retry, hay undo.
>
> Trong .NET ecosystem, MediatR implement Command Pattern. CQRS là Command Pattern được áp dụng ở architectural level."

---

## PHẦN 2 – COMMAND LÀ GÌ? CONCEPT (2:30 – 6:00)

**[Màn hình: Sơ đồ Command flow]**

```
Sender (Controller)
      │
      │ Tạo Command object với đủ dữ liệu
      ▼
[CreateOrderCommand { CustomerId, Items, PaymentToken }]
      │
      │ Gửi qua Invoker (Mediator, Queue)
      ▼
[CreateOrderCommandHandler]
      │ Chứa business logic thực sự
      ▼
[OrderCreatedResult]
```

> "Ba thành phần:
>
> **Command** – Object chứa tất cả dữ liệu cần thiết để thực thi operation. Immutable record.
>
> **Handler/Receiver** – Xử lý Command, chứa business logic thực sự.
>
> **Invoker** – Trung gian nhận Command và dispatch đến Handler. MediatR là Invoker.
>
> **Lợi ích:** Controller không chứa business logic. Handler có thể được test riêng. Command có thể được queue, retry, log, hoặc undo."

---

## PHẦN 3 – CODE WALKTHROUGH (6:00 – 18:00)

### Bước 1: Command và Query records (6:00 – 8:30)

```csharp
// CQRS: Commands (write) và Queries (read) là hai loại Command khác nhau

// Command = write operation, có side effects
// record = immutable DTO, value equality → dễ test
// IRequest<CreateOrderResult> = marker interface cho MediatR
public record CreateOrderCommand(
    Guid CustomerId,
    List<OrderItemDto> Items,
    string ShippingAddress,
    string PaymentToken) : IRequest<CreateOrderResult>;

// Result cũng là record – immutable response
public record CreateOrderResult(Guid OrderId, string TrackingNumber);

// Query = read operation, không thay đổi state
// Query có thể được cache, routed đến read replica
public record GetOrderByIdQuery(Guid OrderId) : IRequest<OrderDetailDto?>;

public record GetOrdersByCustomerQuery(
    Guid CustomerId, 
    int Page, 
    int PageSize) : IRequest<PagedResult<OrderSummaryDto>>;
```

### Bước 2: Command Handler với business logic (8:30 – 13:00)

```csharp
// Handler là "Receiver" – nơi business logic thực sự xảy ra
// Controller không biết gì về business logic này
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
        // Domain factory method: validate business rules và tạo aggregate
        var order = Order.Create(request.CustomerId, request.Items, request.ShippingAddress);

        // Orchestration: thứ tự quan trọng
        // 1. Reserve inventory TRƯỚC khi charge payment
        await inventory.ReserveAsync(order.Items, ct);

        // 2. Charge payment
        PaymentResult paymentResult;
        try
        {
            paymentResult = await payment.ChargeAsync(
                new PaymentRequest(order.Total, "VND", request.PaymentToken), ct);
        }
        catch
        {
            // Rollback inventory nếu payment thất bại
            await inventory.ReleaseAsync(order.Items, ct);
            throw;
        }

        // 3. Confirm order với transaction ID
        order.ConfirmPayment(paymentResult.TransactionId);
        await orderRepo.CreateAsync(order, ct);

        // 4. Publish domain event – Observer pattern trong Command handler
        await eventBus.PublishAsync(new OrderCreatedEvent(order.Id, request.CustomerId), ct);

        logger.LogInformation("Order {OrderId} created for customer {CustomerId}",
            order.Id, request.CustomerId);

        return new CreateOrderResult(
            order.Id, 
            "TRACK" + order.Id.ToString()[..8].ToUpper());
    }
}

// Query Handler – tách biệt hoàn toàn khỏi write side
public class GetOrderByIdQueryHandler(IOrderReadRepository readRepo)
    : IRequestHandler<GetOrderByIdQuery, OrderDetailDto?>
{
    // readRepo có thể là read-replica DB, Redis cache, hay ElasticSearch
    public Task<OrderDetailDto?> Handle(GetOrderByIdQuery request, CancellationToken ct)
        => readRepo.GetDetailByIdAsync(request.OrderId, ct);
}
```

### Bước 3: Controller cực kỳ mỏng (13:00 – 15:00)

```csharp
[ApiController]
[Route("api/orders")]
public class OrdersController(IMediator mediator) : ControllerBase
{
    // Controller chỉ biết: nhận request → tạo Command → gửi qua Mediator → trả kết quả
    // Không một dòng business logic nào ở đây
    [HttpPost]
    public async Task<ActionResult<CreateOrderResult>> CreateOrder(
        [FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var command = new CreateOrderCommand(
            request.CustomerId, request.Items, 
            request.ShippingAddress, request.PaymentToken);
        var result = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetOrder), new { id = result.OrderId }, result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDetailDto>> GetOrder(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetOrderByIdQuery(id), ct));
}
```

### Bước 4: Undoable Command – undo/redo system (15:00 – 18:00)

```csharp
// IUndoableCommand: Command có thể hoàn tác
public interface IUndoableCommand
{
    Task ExecuteAsync(CancellationToken ct);
    Task UndoAsync(CancellationToken ct);
    string Description { get; }
}

// TransferFundsCommand chứa đủ thông tin để Execute VÀ Undo
public class TransferFundsCommand(
    IBankAccountRepository repo,
    Guid fromAccountId,
    Guid toAccountId,
    decimal amount) : IUndoableCommand
{
    public string Description => $"Transfer {amount:C} from {fromAccountId} to {toAccountId}";
    private bool _executed;

    public async Task ExecuteAsync(CancellationToken ct)
    {
        var from = await repo.GetByIdAsync(fromAccountId, ct) 
            ?? throw new InvalidOperationException("Source account not found");
        var to = await repo.GetByIdAsync(toAccountId, ct)
            ?? throw new InvalidOperationException("Destination account not found");
        
        from.Debit(amount);
        to.Credit(amount);
        
        await repo.UpdateAsync(from, ct);
        await repo.UpdateAsync(to, ct);
        _executed = true;
    }

    public async Task UndoAsync(CancellationToken ct)
    {
        if (!_executed) throw new InvalidOperationException("Cannot undo: not executed");
        
        var from = await repo.GetByIdAsync(fromAccountId, ct)!;
        var to = await repo.GetByIdAsync(toAccountId, ct)!;
        
        from.Credit(amount);  // Đảo ngược: cộng lại
        to.Debit(amount);     // Đảo ngược: trừ đi
        
        await repo.UpdateAsync(from!, ct);
        await repo.UpdateAsync(to!, ct);
        _executed = false;
    }
}

// CommandHistory – Invoker quản lý Undo/Redo stacks
public class CommandHistory
{
    private readonly Stack<IUndoableCommand> _undoStack = new();
    private readonly Stack<IUndoableCommand> _redoStack = new();

    public async Task ExecuteAsync(IUndoableCommand command, CancellationToken ct)
    {
        await command.ExecuteAsync(ct);
        _undoStack.Push(command);
        _redoStack.Clear(); // Sau khi execute mới, không thể redo cái cũ
    }

    public async Task UndoAsync(CancellationToken ct)
    {
        if (!_undoStack.TryPop(out var command)) return;
        await command.UndoAsync(ct);
        _redoStack.Push(command);
    }

    public async Task RedoAsync(CancellationToken ct)
    {
        if (!_redoStack.TryPop(out var command)) return;
        await command.ExecuteAsync(ct);
        _undoStack.Push(command);
    }
}
```

---

## PHẦN 4 – VÍ DỤ THỰC TẾ .NET (18:00 – 21:00)

> "Command Pattern xuất hiện nhiều nơi trong .NET:
>
> **MediatR** – `IRequest<T>` là Command interface, `IRequestHandler<TRequest, TResponse>` là Handler. Hầu như project .NET enterprise nào cũng dùng MediatR.
>
> **EF Core Migrations** – Mỗi migration là một Command với `Up()` và `Down()` – Execute và Undo.
>
> **Database Transactions** – `BeginTransaction()`, `Commit()`, `Rollback()` là Command History pattern.
>
> **Background Jobs với Hangfire/Quartz.NET** – Jobs được serialize thành Command objects, queue, và execute sau. Hangfire retry failed jobs – đây là Command Queue pattern.
>
> **Azure Service Bus / RabbitMQ Messages** – Messages là Commands được gửi qua network. Subscriber là Handler."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (21:00 – 23:00)

**✅ NÊN dùng khi:**
- Cần tách business logic khỏi Controller (skinny controller)
- Implement CQRS architecture
- Cần undo/redo, job queuing, retry logic
- Cùng operation cần được gọi từ nhiều nơi (API, background job, scheduled task)

**❌ KHÔNG nên dùng khi:**
- Business logic đơn giản, không cần encapsulation
- Overhead của Command class không worth it (CRUD đơn giản)
- Không cần undo/redo hay queuing

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (23:00 – 24:00)

> "Command Pattern: đóng gói request thành object. Handler chứa business logic. Controller mỏng.
>
> Ba điều nhớ:
> 1. Command là immutable record chứa dữ liệu, Handler chứa logic – tách biệt hoàn toàn
> 2. CQRS = Command (write) tách khỏi Query (read) – có thể scale độc lập
> 3. Undo/redo: Command chứa cả Execute lẫn Undo logic, CommandHistory quản lý stack
>
> Bài tiếp theo – bài cuối của Phase 1: **Chain of Responsibility** – request được chuyển qua một chuỗi handlers, mỗi handler quyết định xử lý hay chuyển tiếp. ASP.NET Core Middleware pipeline là Chain of Responsibility."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Skinny controller với MediatR, chạy thực tế |
| Demo | Undo/redo trong console app đơn giản với TransferFundsCommand |
| Điểm nhấn | Handler có thể test hoàn toàn không cần Controller hay HTTP context |
| Visual | Flow: Controller → Command → Mediator → Handler → Result |
