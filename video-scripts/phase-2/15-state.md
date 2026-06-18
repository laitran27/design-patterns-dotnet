# Bài 15 – State Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 2 – Mở Rộng | **Tuần:** 6 | **Thứ tự:** 15/23  
**Thời lượng ước tính:** 22 phút  
**Độ ưu tiên:** ⭐⭐ Trung Bình

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Switch statement lớn kiểm tra order status]**

> "Bạn có Order với các states: Pending, Confirmed, Shipped, Delivered, Cancelled.
>
> Và đây là code phổ biến bạn sẽ thấy:"

```csharp
public async Task ProcessOrderAsync(Guid orderId, string action)
{
    var order = await orderRepo.GetByIdAsync(orderId);
    
    switch (order.Status)
    {
        case "Pending":
            if (action == "confirm") { order.Status = "Confirmed"; /* notify... */ }
            else if (action == "cancel") { order.Status = "Cancelled"; /* refund... */ }
            else throw new InvalidOperationException($"Cannot {action} a Pending order");
            break;
        case "Confirmed":
            if (action == "ship") { order.Status = "Shipped"; /* notify shipper... */ }
            else if (action == "cancel") { /* partial refund... */ order.Status = "Cancelled"; }
            else throw new InvalidOperationException($"Cannot {action} a Confirmed order");
            break;
        // ... Shipped, Delivered cases với logic riêng từng case
    }
}
```

> "Switch statement này sẽ ngày càng phình to khi thêm state mới hoặc action mới. Logic của state 'Pending' nằm lẫn lộn với 'Confirmed', 'Shipped'.
>
> **State Pattern** đóng gói mỗi state thành một class riêng. Mỗi state biết những actions nào hợp lệ với nó và cách chuyển sang state tiếp theo."

---

## PHẦN 2 – STATE LÀ GÌ? CONCEPT (2:30 – 6:00)

```
Order (Context)
  - currentState: IOrderState
  - Confirm() → delegates to currentState.Confirm(this)
  - Ship()    → delegates to currentState.Ship(this)
  - Cancel()  → delegates to currentState.Cancel(this)

IOrderState
     ▲
     │
┌────┼────┬────────┬──────────┐
│         │        │          │
PendingState  ConfirmedState  ShippedState  DeliveredState
- Confirm()   - Ship()        - Deliver()   - (no actions)
- Cancel()    - Cancel()      - (no cancel)
```

> "Hai thành phần chính:
>
> **Context (Order)** – Giữ reference đến current state. Delegate tất cả actions cho state.
>
> **States** – Mỗi state là một class implement cùng interface. Mỗi state biết:
> - Actions nào hợp lệ với nó
> - Cách transition sang state khác
> - Logic business riêng của state đó"

---

## PHẦN 3 – CODE WALKTHROUGH (6:00 – 17:00)

### Bước 1: State Interface (6:00 – 7:30)

```csharp
// IOrderState: interface chung cho tất cả states
public interface IOrderState
{
    // Mỗi action: default throw InvalidOperationException
    // State nào cho phép action đó thì override
    Task ConfirmAsync(Order order, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot confirm order in {GetType().Name} state");
    
    Task ShipAsync(Order order, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot ship order in {GetType().Name} state");
    
    Task DeliverAsync(Order order, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot deliver order in {GetType().Name} state");
    
    Task CancelAsync(Order order, string reason, CancellationToken ct)
        => throw new InvalidOperationException($"Cannot cancel order in {GetType().Name} state");
    
    string StateName { get; }
}
```

### Bước 2: Concrete States (7:30 – 13:00)

```csharp
// PendingState: có thể Confirm hoặc Cancel
public class PendingState(IInventoryService inventory, IEmailService email) : IOrderState
{
    public string StateName => "Pending";

    public async Task ConfirmAsync(Order order, CancellationToken ct)
    {
        // Business logic của Pending → Confirmed transition
        await inventory.ReserveAsync(order.Items, ct);
        await email.SendConfirmationAsync(order.CustomerEmail, order.Id, ct);
        
        // Transition: đổi state của Context sang ConfirmedState
        order.SetState(new ConfirmedState(/* dependencies */));
    }

    public async Task CancelAsync(Order order, string reason, CancellationToken ct)
    {
        // Pending cancel: không cần refund (payment chưa được charge)
        await email.SendCancellationAsync(order.CustomerEmail, order.Id, reason, ct);
        order.SetState(new CancelledState());
    }
    
    // ShipAsync, DeliverAsync: inherit default → throw InvalidOperationException
}

// ConfirmedState: có thể Ship hoặc Cancel (với refund)
public class ConfirmedState(IPaymentService payment, IShipmentService shipment) : IOrderState
{
    public string StateName => "Confirmed";

    public async Task ShipAsync(Order order, CancellationToken ct)
    {
        var trackingNumber = await shipment.CreateShipmentAsync(order, ct);
        order.TrackingNumber = trackingNumber;
        order.ShippedAt = DateTime.UtcNow;
        
        order.SetState(new ShippedState(shipment));
    }

    public async Task CancelAsync(Order order, string reason, CancellationToken ct)
    {
        // Confirmed cancel: phải refund payment
        if (order.PaymentTransactionId != null)
            await payment.RefundAsync(order.PaymentTransactionId, order.Total, ct);
        
        order.SetState(new CancelledState());
    }
}

// ShippedState: chỉ có thể Deliver, KHÔNG thể cancel nữa
public class ShippedState(IShipmentService shipment) : IOrderState
{
    public string StateName => "Shipped";

    public async Task DeliverAsync(Order order, CancellationToken ct)
    {
        order.DeliveredAt = DateTime.UtcNow;
        await shipment.ConfirmDeliveryAsync(order.TrackingNumber!, ct);
        
        order.SetState(new DeliveredState());
    }
    
    // CancelAsync: không override → throw "Cannot cancel in ShippedState"
    // Sau khi đã ship, không thể cancel – state machine enforce business rule này
}

// DeliveredState: terminal state, không có actions
public class DeliveredState : IOrderState
{
    public string StateName => "Delivered";
    // Tất cả methods: inherit default → throw InvalidOperationException
}

public class CancelledState : IOrderState
{
    public string StateName => "Cancelled";
    // Terminal state
}
```

### Bước 3: Context – Order class (13:00 – 17:00)

```csharp
// Order là Context: giữ state, delegate actions
public class Order
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CustomerId { get; private set; }
    public string CustomerEmail { get; private set; } = string.Empty;
    public List<OrderItem> Items { get; private set; } = [];
    public decimal Total { get; private set; }
    public string? TrackingNumber { get; set; }
    public string? PaymentTransactionId { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    
    // Current state – bắt đầu là PendingState
    private IOrderState _currentState;
    
    public string CurrentStatus => _currentState.StateName;

    public Order(/* ... */)
    {
        // Khởi tạo với PendingState
        _currentState = new PendingState(/* inject deps */);
    }

    // SetState: chỉ states mới được gọi (internal), client code không được thay đổi state trực tiếp
    internal void SetState(IOrderState newState)
    {
        Console.WriteLine($"Order {Id}: {_currentState.StateName} → {newState.StateName}");
        _currentState = newState;
    }

    // Public actions: delegate hoàn toàn cho current state
    // State quyết định action có hợp lệ không và cách xử lý
    public Task ConfirmAsync(CancellationToken ct) => _currentState.ConfirmAsync(this, ct);
    public Task ShipAsync(CancellationToken ct) => _currentState.ShipAsync(this, ct);
    public Task DeliverAsync(CancellationToken ct) => _currentState.DeliverAsync(this, ct);
    public Task CancelAsync(string reason, CancellationToken ct) => _currentState.CancelAsync(this, reason, ct);
}

// Sử dụng – clean và tự documenting
var order = new Order(/* ... */);
await order.ConfirmAsync(ct);      // Pending → Confirmed
await order.ShipAsync(ct);         // Confirmed → Shipped
await order.CancelAsync("...", ct); // InvalidOperationException: Cannot cancel in ShippedState!
```

---

## PHẦN 4 – STATE MACHINE VỚI STATELESS LIBRARY (17:00 – 20:00)

```csharp
// Stateless library: fluent API cho State Machine trong .NET
// Install: dotnet add package Stateless

var machine = new StateMachine<OrderStatus, OrderTrigger>(OrderStatus.Pending);

machine.Configure(OrderStatus.Pending)
    .Permit(OrderTrigger.Confirm, OrderStatus.Confirmed)
    .Permit(OrderTrigger.Cancel, OrderStatus.Cancelled)
    .OnEntryAsync(async () => await SendPendingEmailAsync());

machine.Configure(OrderStatus.Confirmed)
    .Permit(OrderTrigger.Ship, OrderStatus.Shipped)
    .Permit(OrderTrigger.Cancel, OrderStatus.Cancelled)
    .OnEntryAsync(async () => await ReserveInventoryAsync());

machine.Configure(OrderStatus.Shipped)
    .Permit(OrderTrigger.Deliver, OrderStatus.Delivered)
    // .Permit(OrderTrigger.Cancel, ...) – KHÔNG có → automatically throw khi cancel
    .OnEntryAsync(async () => await NotifyShipperAsync());

machine.Configure(OrderStatus.Delivered)
    .OnEntry(() => Console.WriteLine("Order delivered!"));

// Sử dụng
await machine.FireAsync(OrderTrigger.Confirm);  // Pending → Confirmed
await machine.FireAsync(OrderTrigger.Ship);     // Confirmed → Shipped
await machine.FireAsync(OrderTrigger.Cancel);   // InvalidOperationException!
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (20:00 – 21:30)

**✅ NÊN dùng khi:**
- Object có behavior thay đổi rõ ràng theo state (order lifecycle, task workflow)
- Nhiều conditional statements kiểm tra state của object
- State transitions có business rules phức tạp
- Cần enforce invalid transitions (không thể cancel đơn đã ship)

**❌ KHÔNG nên dùng khi:**
- Chỉ có 2-3 states đơn giản – if/else đủ rồi
- States không có behavior khác nhau đáng kể
- State machine logic đơn giản – enum + switch đủ rồi

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (21:30 – 22:00)

> "State Pattern: mỗi state là một class. Object delegate actions cho current state.
>
> Ba điều nhớ:
> 1. State interface với default methods throwing exception – state nào cho phép action đó thì override
> 2. State tự transition sang state khác: `order.SetState(new ConfirmedState())`
> 3. Stateless library: fluent State Machine – dùng cho state machines phức tạp trong production
>
> Bài cuối Phase 2: **Template Method** – define skeleton của một algorithm trong base class, để subclasses override các bước cụ thể. Mà không thay đổi cấu trúc tổng thể."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo 1 | Order state machine: confirm → ship → try cancel → exception |
| Demo 2 | Stateless library: visual state diagram với `machine.ToDotGraph()` |
| Visual | State diagram với mũi tên transitions |
| Điểm nhấn | Business rules được enforce bởi state machine, không phải if/else |
