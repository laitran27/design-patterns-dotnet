# Bài 08 – Observer Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 3 | **Thứ tự:** 8/23  
**Thời lượng ước tính:** 22 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: OrderService với 6 method calls sau khi tạo order]**

> "Hãy nhìn vào `OrderService.PlaceOrderAsync()` này:"

```csharp
public async Task<Guid> PlaceOrderAsync(PlaceOrderRequest request)
{
    var order = await orderRepo.CreateAsync(/* ... */);
    
    // Gọi trực tiếp: OrderService biết VÀ PHỤ THUỘC vào tất cả thứ này
    await emailService.SendConfirmationAsync(order);    // Gửi email
    await loyaltyService.AwardPointsAsync(order);       // Cộng điểm
    await inventoryService.ReserveItemsAsync(order);    // Reserve kho
    await analyticsService.TrackPurchaseAsync(order);   // Analytics
    await notificationService.PushNotifyAsync(order);   // Push notification
    await auditService.LogOrderCreatedAsync(order);     // Audit log
    
    return order.Id;
}
```

> "Sáu dependencies. Mỗi lần cần thêm một hành động khi tạo order – ví dụ gửi SMS – bạn phải mở `OrderService` lên, thêm một dependency nữa, và sửa method này.
>
> `OrderService` đang làm quá nhiều việc. Nó biết quá nhiều thứ.
>
> **Observer Pattern** giải phóng `OrderService` khỏi tất cả những điều này. Nó chỉ cần publish một event: *'Đơn hàng vừa được tạo.'* Ai muốn biết thì tự subscribe. `OrderService` không cần biết ai đang lắng nghe."

---

## PHẦN 2 – OBSERVER LÀ GÌ? CONCEPT (2:30 – 6:30)

**[Màn hình: Sơ đồ pub/sub]**

```
Order được tạo
      │
      ▼
OrderService.Publish(OrderPlacedEvent)
      │
      ▼
[DomainEventPublisher]
      │
      ├──▶ SendOrderConfirmationEmail.HandleAsync()
      ├──▶ AwardLoyaltyPoints.HandleAsync()
      ├──▶ ReserveInventory.HandleAsync()
      ├──▶ TrackAnalytics.HandleAsync()
      └──▶ (thêm handler mới không cần sửa gì)
```

> "Hai vai trò:
>
> **Subject/Publisher** – `OrderService` publish event. Nó không biết ai lắng nghe.
>
> **Observers/Subscribers** – Các handlers tự đăng ký lắng nghe event. Chúng độc lập nhau.
>
> Loose coupling hoàn toàn: Subject và Observer không biết nhau. Thêm Observer mới không cần sửa Subject."

---

## PHẦN 3 – CODE WALKTHROUGH (6:30 – 17:00)

### Bước 1: Domain Event – immutable record (6:30 – 8:30)

```csharp
// IDomainEvent: interface base cho tất cả events
public interface IDomainEvent
{
    Guid EventId { get; }       // Unique ID: tránh xử lý event hai lần (idempotency)
    DateTime OccurredAt { get; } // Khi nào xảy ra – quan trọng cho event sourcing
}

// OrderPlacedEvent: record = immutable, không ai sửa được sau khi tạo
// Tên dùng past tense (PlacedEvent, không phải PlaceEvent) – điều đã xảy ra
public record OrderPlacedEvent(
    Guid EventId,
    DateTime OccurredAt,
    Guid OrderId,
    Guid CustomerId,
    decimal TotalAmount,
    List<string> ItemIds) : IDomainEvent;

// StockDepletedEvent: event khác, Observer khác sẽ handle
public record StockDepletedEvent(
    Guid EventId,
    DateTime OccurredAt,
    Guid ProductId,
    int RemainingQuantity) : IDomainEvent;
```

### Bước 2: Observer Interface và Implementations (8:30 – 13:00)

```csharp
// IDomainEventHandler<TEvent> – Observer interface
// Generic constraint: handler biết chính xác event type mình xử lý
public interface IDomainEventHandler<TEvent> where TEvent : IDomainEvent
{
    Task HandleAsync(TEvent domainEvent, CancellationToken ct);
}

// Observer 1: Gửi email xác nhận
public class SendOrderConfirmationEmail(IEmailService emailService, IOrderRepository orderRepo)
    : IDomainEventHandler<OrderPlacedEvent>
{
    public async Task HandleAsync(OrderPlacedEvent @event, CancellationToken ct)
    {
        // @ trước event tránh conflict với keyword 'event' của C#
        var order = await orderRepo.GetByIdAsync(@event.OrderId, ct);
        await emailService.SendConfirmationAsync(order!.CustomerEmail, order.Id, ct);
    }
}

// Observer 2: Cộng điểm loyalty
public class AwardLoyaltyPointsOnOrderPlaced(ILoyaltyService loyalty)
    : IDomainEventHandler<OrderPlacedEvent>
{
    public async Task HandleAsync(OrderPlacedEvent @event, CancellationToken ct)
    {
        // Business rule: 1 điểm cho mỗi 10,000đ
        var points = (int)(@event.TotalAmount / 10_000);
        await loyalty.AddPointsAsync(@event.CustomerId, points, ct);
    }
}

// Observer 3: Cảnh báo kho khi hàng sắp hết – khác event, hoàn toàn độc lập
public class NotifyRestockingTeam(INotificationService notifications)
    : IDomainEventHandler<StockDepletedEvent>
{
    public async Task HandleAsync(StockDepletedEvent @event, CancellationToken ct)
    {
        if (@event.RemainingQuantity <= 10)
            await notifications.SendAlertAsync(
                "warehouse@company.com",
                $"Còn {@ event.RemainingQuantity} sản phẩm {@ event.ProductId}",
                ct);
    }
}
```

> "Ba Observers, mỗi cái hoàn toàn độc lập. Nếu `AwardLoyaltyPointsOnOrderPlaced` throw exception, nó không ảnh hưởng `SendOrderConfirmationEmail`. Và OrderService không biết gì về cả ba."

### Bước 3: Publisher và OrderService (13:00 – 17:00)

```csharp
// Publisher – infrastructure để dispatch events đến handlers
public class DomainEventPublisher(IServiceProvider serviceProvider) : IDomainEventPublisher
{
    public async Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct)
        where TEvent : IDomainEvent
    {
        // Resolve tất cả handlers đã đăng ký cho event type này
        var handlers = serviceProvider
            .GetServices<IDomainEventHandler<TEvent>>();
        
        // Chạy song song hoặc tuần tự tùy yêu cầu
        // Song song: nhanh hơn nhưng khó handle lỗi
        // Tuần tự: chậm hơn nhưng predictable
        foreach (var handler in handlers)
            await handler.HandleAsync(domainEvent, ct);
    }
}

// OrderService – chỉ biết IDomainEventPublisher, không biết handlers
public class OrderService(
    IOrderRepository orderRepo,
    IDomainEventPublisher eventPublisher)
{
    public async Task<Guid> PlaceOrderAsync(PlaceOrderRequest request, CancellationToken ct)
    {
        var order = Order.Create(request.CustomerId, request.Items, request.ShippingAddress);
        await orderRepo.CreateAsync(order, ct);
        
        // Publish event – OrderService KHÔNG biết ai sẽ handle
        await eventPublisher.PublishAsync(new OrderPlacedEvent(
            Guid.NewGuid(), DateTime.UtcNow,
            order.Id, request.CustomerId, order.Total,
            order.Items.Select(i => i.ProductId.ToString()).ToList()), ct);
        
        return order.Id;
    }
}

// DI Registration – đây là nơi kết nối Subject và Observers
builder.Services.AddScoped<IDomainEventPublisher, DomainEventPublisher>();
builder.Services.AddScoped<IDomainEventHandler<OrderPlacedEvent>, SendOrderConfirmationEmail>();
builder.Services.AddScoped<IDomainEventHandler<OrderPlacedEvent>, AwardLoyaltyPointsOnOrderPlaced>();
builder.Services.AddScoped<IDomainEventHandler<StockDepletedEvent>, NotifyRestockingTeam>();
// Thêm handler mới: chỉ cần thêm một dòng DI – OrderService không đổi
```

---

## PHẦN 4 – VÍ DỤ THỰC TẾ .NET (17:00 – 20:00)

> "C# có Observer built-in với `event` keyword và `INotifyPropertyChanged`:

```csharp
// INotifyPropertyChanged – Observer pattern built-in cho UI binding
public class ProductViewModel : INotifyPropertyChanged
{
    private decimal _price;
    
    // event PropertyChangedEventHandler là "subscribe mechanism"
    // WPF/MAUI tự động subscribe vào event này để update UI
    public event PropertyChangedEventHandler? PropertyChanged;

    public decimal Price
    {
        get => _price;
        set
        {
            if (_price == value) return; // Guard: tránh vòng lặp vô hạn
            _price = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(FormattedPrice)); // Computed property cũng được notify
        }
    }
    
    public string FormattedPrice => $"{_price:C}"; // UI tự cập nhật khi Price thay đổi

    protected virtual void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

> "WPF/MAUI/Blazor subscribe vào `PropertyChanged` event và tự động cập nhật UI khi property thay đổi. Đây là Observer pattern – ViewModel là Subject, UI framework là Observer.
>
> **MediatR với Notifications** cũng là Observer: `INotification` + `INotificationHandler<T>`.
>
> **`IObservable<T>`/`IObserver<T>`** là Observer interface built-in cho reactive streams."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (20:00 – 21:30)

**✅ NÊN dùng khi:**
- Một sự kiện cần trigger nhiều reactions độc lập nhau
- Subject không nên biết và phụ thuộc vào Observers
- Implement event-driven architecture hoặc domain events
- UI cần phản ứng với thay đổi data (MVVM pattern)

**❌ KHÔNG nên dùng khi:**
- Notification chain gây cascading updates khó debug (A notify B notify C notify A...)
- Thứ tự xử lý event quan trọng và khó đảm bảo
- Performance critical – notification overhead không chấp nhận được
- Chỉ có 1-2 observers cố định – direct call đơn giản hơn

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (21:30 – 22:00)

> "Observer: Subject publish event, Observers subscribe và react. Loose coupling hoàn toàn.
>
> Ba điều nhớ:
> 1. Subject chỉ biết `IDomainEventPublisher`, không biết handlers cụ thể
> 2. Mỗi Handler là một Observer độc lập – thêm mới = thêm class + DI registration
> 3. C# `event` keyword, `INotifyPropertyChanged`, MediatR Notifications – tất cả là Observer
>
> Bài tiếp theo: **Command Pattern** – nếu Observer là về *phản ứng* với sự kiện đã xảy ra, Command là về *đóng gói request* thành object. CQRS, undo/redo, job queues – tất cả từ Command Pattern."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Thêm SMSNotificationHandler mà không sửa OrderService |
| So sánh | 6 direct calls → 1 PublishAsync + N handlers |
| Visual | Diagram pub/sub với arrows từ Publisher đến nhiều Observers |
| Điểm nhấn | Tắt một handler (comment out DI): chỉ feature đó tắt, không ảnh hưởng gì khác |
