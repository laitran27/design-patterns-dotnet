# Bài 06 – Facade Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 1 – Nền Tảng | **Tuần:** 2 | **Thứ tự:** 6/23  
**Thời lượng ước tính:** 19 phút  
**Độ ưu tiên:** ⭐⭐⭐ Cao

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: Controller với 7 services được inject]**

> "Nhìn vào Controller này. Để xử lý một đơn hàng, controller phải inject và gọi:
> `IInventoryService`, `IPaymentService`, `IOrderRepository`, `IEmailService`, `INotificationService`, `ILoyaltyService`, `IAuditService`.
>
> Bảy services. Controller biết toàn bộ workflow nội bộ của việc đặt hàng. Nếu business process thay đổi – thêm bước kiểm tra fraud chẳng hạn – bạn phải sửa Controller.
>
> **Facade Pattern** giải quyết điều này: thay vì Controller biết 7 services, chỉ cần biết một `IOrderFacade` với một method `PlaceOrderAsync()`. Controller không cần biết bên trong có bao nhiêu bước."

---

## PHẦN 2 – FACADE LÀ GÌ? CONCEPT (2:00 – 5:30)

**[Màn hình: Sơ đồ before/after]**

```
BEFORE (không có Facade):
Controller ──▶ IInventoryService
           ──▶ IPaymentService
           ──▶ IOrderRepository
           ──▶ IEmailService
           ──▶ ILoyaltyService

AFTER (có Facade):
Controller ──▶ IOrderFacade ──▶ IInventoryService
                            ──▶ IPaymentService
                            ──▶ IOrderRepository
                            ──▶ IEmailService
                            ──▶ ILoyaltyService
```

> "Facade là một interface đơn giản hóa che giấu sự phức tạp của subsystem.
>
> Quan trọng: Facade không thay thế subsystem. Các services vẫn tồn tại và có thể được dùng trực tiếp nếu cần. Facade chỉ là *shortcut* cho use case phổ biến nhất.
>
> Khác với Adapter: Adapter dịch interface không tương thích. Facade *gom* nhiều interfaces phức tạp thành một interface đơn giản."

---

## PHẦN 3 – CODE WALKTHROUGH (5:30 – 14:00)

### Bước 1: Interface Facade (5:30 – 7:30)

```csharp
// Facade interface – đây là TẤT CẢ những gì Controller cần biết về order flow
public interface IOrderFacade
{
    Task<PlaceOrderResult> PlaceOrderAsync(PlaceOrderRequest request, CancellationToken ct);
    Task<CancelOrderResult> CancelOrderAsync(Guid orderId, string reason, CancellationToken ct);
    Task<OrderStatusDto> GetOrderStatusAsync(Guid orderId, CancellationToken ct);
}
```

### Bước 2: Facade Implementation (7:30 – 12:00)

```csharp
// OrderFacade biết TẤT CẢ các bước, nhưng Controller không cần biết
public class OrderFacade(
    IInventoryService inventory,
    IPaymentService payment,
    IOrderRepository orderRepo,
    IEmailService email,
    ILoyaltyService loyalty,
    IAuditService audit,
    ILogger<OrderFacade> logger) : IOrderFacade
{
    public async Task<PlaceOrderResult> PlaceOrderAsync(
        PlaceOrderRequest request, CancellationToken ct)
    {
        logger.LogInformation("Placing order for customer {CustomerId}", request.CustomerId);

        // Bước 1: Validate và reserve inventory
        var reservationId = await inventory.ReserveItemsAsync(request.Items, ct);
        
        // Bước 2: Process payment
        PaymentResult payment;
        try
        {
            payment = await this.payment.ChargeAsync(new PaymentRequest(
                request.TotalAmount, request.PaymentToken), ct);
        }
        catch
        {
            // Rollback: release inventory reservation nếu payment thất bại
            await inventory.ReleaseReservationAsync(reservationId, ct);
            throw;
        }

        // Bước 3: Create order record
        var order = Order.Create(request.CustomerId, request.Items, payment.TransactionId);
        await orderRepo.CreateAsync(order, ct);

        // Bước 4: Send confirmation email (fire-and-forget, không block)
        _ = email.SendOrderConfirmationAsync(request.Email, order.Id, ct);

        // Bước 5: Award loyalty points (fire-and-forget)
        _ = loyalty.AwardPointsAsync(request.CustomerId, order.Total, ct);

        // Bước 6: Audit log
        await audit.LogAsync($"Order {order.Id} placed", request.CustomerId, ct);

        return new PlaceOrderResult(order.Id, "TRACK" + order.Id.ToString()[..8].ToUpper());
    }

    public async Task<CancelOrderResult> CancelOrderAsync(
        Guid orderId, string reason, CancellationToken ct)
    {
        var order = await orderRepo.GetByIdAsync(orderId, ct)
            ?? throw new OrderNotFoundException(orderId);

        order.Cancel(reason);
        await orderRepo.UpdateAsync(order, ct);

        // Refund và restore inventory xảy ra bên trong Facade
        await payment.RefundAsync(order.PaymentTransactionId, order.Total, ct);
        await inventory.RestoreAsync(order.Items, ct);
        
        _ = email.SendCancellationNotificationAsync(order.CustomerEmail, orderId, ct);
        
        return new CancelOrderResult(orderId, "Cancelled successfully");
    }
}
```

> "Facade chứa toàn bộ orchestration logic. Controller trở nên cực kỳ mỏng:"

### Bước 3: Controller với Facade (12:00 – 14:00)

```csharp
// Controller cực kỳ mỏng – không biết gì về internal workflow
[ApiController]
[Route("api/orders")]
public class OrdersController(IOrderFacade orderFacade) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<PlaceOrderResult>> PlaceOrder(
        PlaceOrderRequest request, CancellationToken ct)
    {
        var result = await orderFacade.PlaceOrderAsync(request, ct);
        return CreatedAtAction(nameof(GetOrder), new { id = result.OrderId }, result);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<CancelOrderResult>> CancelOrder(
        Guid id, [FromBody] string reason, CancellationToken ct)
    {
        var result = await orderFacade.CancelOrderAsync(id, reason, ct);
        return Ok(result);
    }
}
```

> "Controller này inject duy nhất `IOrderFacade`. Nó không biết inventory, payment, hay email service tồn tại. Thêm bước fraud check vào `PlaceOrderAsync`? Sửa Facade, Controller không đổi."

---

## PHẦN 4 – VÍ DỤ THỰC TẾ .NET (14:00 – 17:00)

> "MediatR là Facade Pattern ở cấp độ framework.
>
> Thay vì inject nhiều services, bạn inject `IMediator` và gửi Commands/Queries:"

```csharp
// Không có MediatR:
public class OrdersController(
    IOrderService orderService,
    IInventoryService inventory,
    INotificationService notifications) : ControllerBase { }

// Với MediatR (Facade):
public class OrdersController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> PlaceOrder(PlaceOrderCommand command, CancellationToken ct)
        => Ok(await mediator.Send(command, ct)); // Mediator là Facade cho toàn bộ request handling
}
```

> "`DbContext` trong EF Core cũng là Facade: một interface đơn giản che giấu ADO.NET connections, transactions, change tracking, SQL generation.
>
> `app.UseXxx()` trong ASP.NET Core là Facade cho middleware pipeline registration."

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (17:00 – 18:30)

**✅ NÊN dùng khi:**
- Controller/caller cần gọi nhiều services theo một workflow cố định
- Muốn ẩn sự phức tạp nội bộ của subsystem khỏi client
- Cần một integration layer cho external system (third-party API với nhiều bước)
- Muốn đơn giản hóa testing – mock một Facade dễ hơn mock 7 services

**❌ KHÔNG nên dùng khi:**
- Facade trở thành God Object với quá nhiều trách nhiệm
- Clients cần truy cập linh hoạt vào các services riêng lẻ
- Tạo thêm layer không có giá trị thực sự (wrap đơn giản mà không simplify gì)

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (18:30 – 19:00)

> "Facade: một interface đơn giản che giấu một hệ thống phức tạp.
>
> Nhớ ba điều:
> 1. Facade không thay thế subsystem – nó chỉ là shortcut
> 2. Controller nên inject Facade, không inject 5-7 services
> 3. MediatR, DbContext là Facade pattern đã có sẵn – hãy nhận ra chúng
>
> Bài tiếp theo: **Strategy Pattern** – thay vì if/else chọn algorithm, Strategy cho phép swap algorithm tại runtime. Ví dụ: sorting strategy, pricing strategy, shipping strategy."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Before (7 injections) → After (1 Facade injection) |
| Điểm nhấn | Thêm fraud check vào Facade không ảnh hưởng Controller |
| Visual | Sơ đồ "building facade" – mặt ngoài đơn giản, bên trong phức tạp |
