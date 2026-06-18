# OVERVIEW – Series: 23 GoF Design Patterns trong .NET 8

**Đối tượng:** .NET Developer 8+ năm kinh nghiệm  
**Ngôn ngữ:** Tiếng Việt  
**Thời lượng ước tính:** ~480 phút (~8 giờ content)  
**Lịch quay:** 16 tuần – 1-2 bài/tuần

---

## CẤU TRÚC KỊCH BẢN

Mỗi bài kịch bản gồm 6 phần theo cấu trúc chuẩn:

| Phần | Nội dung | Thời lượng |
|------|----------|------------|
| 1 | INTRO & HOOK – vấn đề thực tế, tại sao cần pattern này | ~2 phút |
| 2 | CONCEPT – sơ đồ, thành phần, so sánh với patterns liên quan | ~3 phút |
| 3 | CODE WALKTHROUGH – từng bước implement với .NET 8 C# | ~8 phút |
| 4 | VÍ DỤ THỰC TẾ .NET – ASP.NET Core, EF Core, framework examples | ~3 phút |
| 5 | KHI NÀO DÙNG / KHÔNG DÙNG – checklist thực hành | ~2 phút |
| 6 | TÓM TẮT & PREVIEW – recap + giới thiệu bài tiếp theo | ~2 phút |

---

## DANH SÁCH 23 BÀI THEO TỪNG GIAI ĐOẠN

### GIAI ĐOẠN 1 – Nền Tảng (Tuần 1-4) · 10 bài

| # | Tên Pattern | File | Ưu tiên | Thời lượng |
|---|-------------|------|---------|-----------|
| 01 | Singleton | [phase-1/01-singleton.md](phase-1/01-singleton.md) | ⭐⭐⭐ | 22 phút |
| 02 | Factory Method | [phase-1/02-factory-method.md](phase-1/02-factory-method.md) | ⭐⭐⭐ | 24 phút |
| 03 | Builder | [phase-1/03-builder.md](phase-1/03-builder.md) | ⭐⭐⭐ | 23 phút |
| 04 | Adapter | [phase-1/04-adapter.md](phase-1/04-adapter.md) | ⭐⭐⭐ | 20 phút |
| 05 | Decorator | [phase-1/05-decorator.md](phase-1/05-decorator.md) | ⭐⭐⭐ | 22 phút |
| 06 | Facade | [phase-1/06-facade.md](phase-1/06-facade.md) | ⭐⭐⭐ | 19 phút |
| 07 | Strategy | [phase-1/07-strategy.md](phase-1/07-strategy.md) | ⭐⭐⭐ | 21 phút |
| 08 | Observer | [phase-1/08-observer.md](phase-1/08-observer.md) | ⭐⭐⭐ | 22 phút |
| 09 | Command | [phase-1/09-command.md](phase-1/09-command.md) | ⭐⭐⭐ | 24 phút |
| 10 | Chain of Responsibility | [phase-1/10-chain-of-responsibility.md](phase-1/10-chain-of-responsibility.md) | ⭐⭐⭐ | 21 phút |

### GIAI ĐOẠN 2 – Mở Rộng (Tuần 5-7) · 6 bài

| # | Tên Pattern | File | Ưu tiên | Thời lượng |
|---|-------------|------|---------|-----------|
| 11 | Abstract Factory | [phase-2/11-abstract-factory.md](phase-2/11-abstract-factory.md) | ⭐⭐ | 23 phút |
| 12 | Composite | [phase-2/12-composite.md](phase-2/12-composite.md) | ⭐⭐ | 20 phút |
| 13 | Proxy | [phase-2/13-proxy.md](phase-2/13-proxy.md) | ⭐⭐ | 21 phút |
| 14 | Mediator | [phase-2/14-mediator.md](phase-2/14-mediator.md) | ⭐⭐ | 22 phút |
| 15 | State | [phase-2/15-state.md](phase-2/15-state.md) | ⭐⭐ | 22 phút |
| 16 | Template Method | [phase-2/16-template-method.md](phase-2/16-template-method.md) | ⭐⭐ | 19 phút |

### GIAI ĐOẠN 3 – Bổ Sung (Tuần 8-10) · 3 bài

| # | Tên Pattern | File | Ưu tiên | Thời lượng |
|---|-------------|------|---------|-----------|
| 17 | Prototype | [phase-3/17-prototype.md](phase-3/17-prototype.md) | ⭐ | 19 phút |
| 18 | Bridge | [phase-3/18-bridge.md](phase-3/18-bridge.md) | ⭐ | 20 phút |
| 19 | Iterator | [phase-3/19-iterator.md](phase-3/19-iterator.md) | ⭐ | 18 phút |

### GIAI ĐOẠN 4 – Nâng Cao (Tuần 11-13) · 3 bài

| # | Tên Pattern | File | Ưu tiên | Thời lượng |
|---|-------------|------|---------|-----------|
| 20 | Flyweight | [phase-4/20-flyweight.md](phase-4/20-flyweight.md) | ⭐ | 20 phút |
| 21 | Memento | [phase-4/21-memento.md](phase-4/21-memento.md) | ⭐ | 21 phút |
| 22 | Visitor | [phase-4/22-visitor.md](phase-4/22-visitor.md) | ⭐ | 21 phút |

### GIAI ĐOẠN 5 – Tổng Hợp (Tuần 14-16) · 1 bài

| # | Tên Pattern | File | Ưu tiên | Thời lượng |
|---|-------------|------|---------|-----------|
| 23 | Interpreter | [phase-5/23-interpreter.md](phase-5/23-interpreter.md) | ⭐⭐ | 24 phút |

---

## BẢNG NỐI PATTERNS LIÊN QUAN

| Cặp patterns | Sự khác biệt |
|---|---|
| Adapter vs Decorator vs Proxy | Adapter: dịch interface. Decorator: thêm behavior. Proxy: kiểm soát access |
| Factory Method vs Abstract Factory | Factory: 1 product. Abstract Factory: họ products |
| Strategy vs Template Method | Strategy: composition, swap algorithm. Template Method: inheritance, hook |
| Command vs Observer | Command: request thành object. Observer: broadcast state change |
| Mediator vs Observer | Mediator: two-way hub. Observer: one-to-many broadcast |
| Composite vs Decorator | Composite: cấu trúc cây. Decorator: thêm behavior bằng wrapping |
| State vs Strategy | State: behavior thay đổi theo state của object. Strategy: swap algorithm từ bên ngoài |
| Memento vs Command | Memento: lưu state snapshot. Command: đóng gói operation với Undo logic |

---

## SETUP QUAY VIDEO

### Công cụ cần thiết
- **IDE:** Visual Studio 2022 hoặc JetBrains Rider
- **Screen recorder:** OBS Studio hoặc Camtasia
- **Microphone:** Bất kỳ mic USB chất lượng tốt
- **Resolution:** 1920×1080 minimum

### Template mỗi video
```
0:00 - 0:30  Intro screen với tên bài, giai đoạn, số thứ tự
0:30 - 2:00  Hook & problem statement (không code)
2:00 - 5:00  Concept & diagram
5:00 - 18:00 Code walkthrough (PHẦN CHÍNH)
18:00 - 21:00 .NET real-world examples
21:00 - 23:00 When to use / not use
23:00 - 25:00 Summary + preview next
25:00 -      Outro screen với CTA (like, subscribe, comment)
```

### Code template cho mỗi bài
- Tạo Visual Studio Solution riêng: `PatternName.Demo`
- Project structure:
  ```
  PatternName.Demo/
  ├── Before/          # Code không có pattern (vấn đề)
  ├── After/           # Code có pattern (giải pháp)
  └── Tests/           # Unit tests minh họa
  ```

---

## CHECKLIST TRƯỚC KHI QUAY

- [ ] Đọc kịch bản ít nhất 2 lần
- [ ] Chạy thử tất cả code demos
- [ ] Chuẩn bị diagrams (draw.io hoặc trình chiếu)
- [ ] Screenshot ví dụ .NET framework (NuGet, source code)
- [ ] Kiểm tra microphone và screen recording
- [ ] Set Visual Studio: font 16pt, theme Dark, no notification

---

## ĐIỂM NỐI XUYÊN SUỐT SERIES

### "Red Thread" – Chủ đề xuyên suốt
**Order Processing System:** tất cả examples đều xoay quanh một e-commerce system. Viewer thấy cùng một domain được refactor và cải tiến qua từng pattern.

- **Singleton:** Configuration service
- **Factory Method:** Notification sender
- **Builder:** Query builder cho order filtering
- **Adapter:** Payment gateway (Stripe, VNPay)
- **Decorator:** Repository với caching + logging
- **Facade:** OrderFacade orchestrating all services
- **Strategy:** Shipping cost calculation
- **Observer:** Domain events khi order được tạo
- **Command:** CQRS với CreateOrderCommand
- **Chain of Responsibility:** Discount approval workflow
- **State:** Order lifecycle (Pending → Delivered)
- **Mediator:** MediatR pipeline

### Câu hỏi mở đầu mỗi bài (hook format)
> "Bạn đã bao giờ gặp tình huống... [problem]? Hôm nay chúng ta học cách giải quyết nó với [Pattern Name]."
