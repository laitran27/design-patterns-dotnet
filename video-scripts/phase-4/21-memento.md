# Bài 21 – Memento Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 4 – Nâng Cao | **Tuần:** 12 | **Thứ tự:** 21/23  
**Thời lượng ước tính:** 21 phút  
**Độ ưu tiên:** ⭐ Thấp

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: Ctrl+Z trong text editor]**

> "Ctrl+Z. Bạn nhấn nó hàng chục lần mỗi ngày mà không nghĩ về cơ chế bên trong.
>
> Để implement Undo, bạn cần lưu state của object trước khi nó thay đổi. Nhưng làm thế nào mà object ngoài có thể lưu state của đối tượng mà không phá vỡ encapsulation?
>
> **Memento Pattern** là câu trả lời. Object tự tạo *snapshot* của chính mình (Memento). Snapshot được lưu bên ngoài (Caretaker). Khi cần undo: Caretaker trả snapshot, Object tự khôi phục. Encapsulation được bảo toàn hoàn toàn."

---

## PHẦN 2 – MEMENTO LÀ GÌ? CONCEPT (2:00 – 5:00)

```
┌───────────────┐  SaveState  ┌──────────┐
│  Originator   │────────────▶│ Memento  │
│  (TextEditor) │             ├──────────┤
├───────────────┤  Restore    │-state    │ ← private data, 
│ -content      │◀────────────│+GetState │   chỉ Originator
│ +SaveState()  │             └──────────┘   có thể đọc
│ +RestoreState │                  ▲
└───────────────┘                  │ stores
                            ┌─────────────┐
                            │  Caretaker  │
                            │  (History)  │
                            ├─────────────┤
                            │ -mementos[] │
                            │ +Undo()     │
                            │ +Redo()     │
                            └─────────────┘
```

> "Ba vai trò:
> - **Originator (TextEditor):** Tạo Memento từ state hiện tại. Khôi phục từ Memento.
> - **Memento:** Snapshot bất biến của state. Dữ liệu là private.
> - **Caretaker (History):** Lưu stack Mementos. Không trực tiếp truy cập data của Memento."

---

## PHẦN 3 – CODE WALKTHROUGH (5:00 – 16:00)

### Bước 1: Memento – Immutable Snapshot (5:00 – 7:30)

```csharp
// Memento: snapshot bất biến của state
// sealed: không ai kế thừa và sửa đổi
public sealed class EditorMemento
{
    // Private data: chỉ TextEditor mới có thể truy cập nội bộ (inner class concept)
    // C# không có inner class như Java, dùng internal access modifier thay thế
    internal string Content { get; }
    internal int CursorPosition { get; }
    internal List<string> SelectedLines { get; }
    public DateTime CreatedAt { get; }
    public string Description { get; }

    // Constructor internal: chỉ code trong cùng assembly tạo được
    internal EditorMemento(string content, int cursorPosition, 
        List<string> selectedLines, string description)
    {
        Content = content;
        CursorPosition = cursorPosition;
        SelectedLines = [..selectedLines]; // Immutable copy
        CreatedAt = DateTime.UtcNow;
        Description = description;
    }

    // Kích thước memento – dùng để quản lý memory
    public long SizeInBytes => 
        System.Text.Encoding.UTF8.GetByteCount(Content) + 
        SelectedLines.Sum(s => s.Length) * 2 + 100; // approx
}
```

### Bước 2: Originator – TextEditor (7:30 – 11:00)

```csharp
// Originator: biết cách tạo và restore từ Memento
public class TextEditor
{
    private string _content = string.Empty;
    private int _cursorPosition;
    private List<string> _selectedLines = [];
    
    public string Content => _content;
    public int CursorPosition => _cursorPosition;
    public IReadOnlyList<string> SelectedLines => _selectedLines;

    // Các operations thay đổi state
    public void Type(string text)
    {
        _content = _content.Insert(_cursorPosition, text);
        _cursorPosition += text.Length;
    }
    
    public void Delete(int length)
    {
        if (_cursorPosition >= length)
        {
            _content = _content.Remove(_cursorPosition - length, length);
            _cursorPosition -= length;
        }
    }
    
    public void MoveCursor(int position)
        => _cursorPosition = Math.Clamp(position, 0, _content.Length);

    // SaveState: tạo Memento từ state hiện tại
    // "Before undo" / "Before delete" – description cho History panel
    public EditorMemento SaveState(string description = "")
        => new(_content, _cursorPosition, _selectedLines, description);

    // RestoreState: khôi phục từ Memento
    // Originator tự truy cập internal fields của Memento – không ai khác làm được
    public void RestoreState(EditorMemento memento)
    {
        _content = memento.Content;
        _cursorPosition = memento.CursorPosition;
        _selectedLines = [..memento.SelectedLines];
    }
}
```

### Bước 3: Caretaker – History Manager (11:00 – 16:00)

```csharp
// Caretaker: quản lý Undo/Redo stacks
// KHÔNG truy cập nội dung của Memento – chỉ lưu và trả lại
public class EditorHistory
{
    private readonly TextEditor _editor;
    private readonly Stack<EditorMemento> _undoStack = new();
    private readonly Stack<EditorMemento> _redoStack = new();
    
    // Giới hạn số lượng undo steps (memory management)
    private const int MaxHistorySize = 50;
    private const long MaxMemoryBytes = 50 * 1024 * 1024; // 50MB

    public EditorHistory(TextEditor editor) => _editor = editor;
    
    public bool CanUndo => _undoStack.Count > 0;
    public bool CanRedo => _redoStack.Count > 0;
    
    // Gọi trước mỗi operation có thể undo
    public void SaveCheckpoint(string description = "")
    {
        var memento = _editor.SaveState(description);
        _undoStack.Push(memento);
        _redoStack.Clear(); // Checkpoint mới → không thể redo cũ
        
        // Memory management: xóa history cũ nếu quá nhiều
        TrimHistory();
    }

    public void Undo()
    {
        if (!CanUndo) return;
        
        // Lưu state HIỆN TẠI vào redo stack trước khi restore
        var current = _editor.SaveState("Before undo");
        var previous = _undoStack.Pop();
        _redoStack.Push(current);
        _editor.RestoreState(previous);
    }

    public void Redo()
    {
        if (!CanRedo) return;
        
        var current = _editor.SaveState("Before redo");
        var next = _redoStack.Pop();
        _undoStack.Push(current);
        _editor.RestoreState(next);
    }
    
    private void TrimHistory()
    {
        // Giới hạn số steps
        while (_undoStack.Count > MaxHistorySize)
        {
            // Stack.Pop removes from top – cần remove from bottom
            // Convert to array, trim, convert back
            var items = _undoStack.ToArray();
            _undoStack.Clear();
            foreach (var item in items.Take(MaxHistorySize))
                _undoStack.Push(item);
        }
        
        // Giới hạn memory
        while (_undoStack.Sum(m => m.SizeInBytes) > MaxMemoryBytes && _undoStack.Count > 0)
        {
            var items = _undoStack.ToArray();
            _undoStack.Clear();
            foreach (var item in items.Skip(1)) // Remove oldest
                _undoStack.Push(item);
        }
    }
    
    // Cho History panel trong UI: danh sách undo steps
    public IEnumerable<string> GetHistory()
        => _undoStack.Select(m => $"{m.CreatedAt:HH:mm:ss} - {m.Description}");
}

// Sử dụng
var editor = new TextEditor();
var history = new EditorHistory(editor);

history.SaveCheckpoint("Initial");
editor.Type("Hello, World!");

history.SaveCheckpoint("After typing");
editor.Type(" How are you?");

history.SaveCheckpoint("After second typing");
editor.Delete(13); // Xóa " How are you?"

Console.WriteLine(editor.Content); // "Hello, World!"

history.Undo(); // Khôi phục về "Hello, World! How are you?"
Console.WriteLine(editor.Content); // "Hello, World! How are you?"

history.Undo(); // Khôi phục về "Hello, World!"
Console.WriteLine(editor.Content); // "Hello, World!"

history.Redo(); // Redo
Console.WriteLine(editor.Content); // "Hello, World! How are you?"
```

---

## PHẦN 4 – INCREMENTAL SNAPSHOT (16:00 – 18:00)

```csharp
// Tối ưu: lưu DELTA (thay đổi) thay vì full snapshot
// Hữu ích khi objects lớn và thay đổi nhỏ

public class IncrementalMemento
{
    public enum OperationType { Insert, Delete, Replace }
    
    public OperationType Operation { get; }
    public int Position { get; }
    public string? OldText { get; }  // Để undo
    public string? NewText { get; }  // Để redo
    public DateTime CreatedAt { get; } = DateTime.UtcNow;

    public IncrementalMemento(OperationType op, int pos, string? oldText, string? newText)
    {
        Operation = op; Position = pos; OldText = oldText; NewText = newText;
    }
}

// Delta-based undo: chỉ lưu diff, không lưu toàn bộ content
// Google Docs: operational transforms (advanced version)
// Git: content-addressable storage với delta compression
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (18:00 – 19:30)

**✅ NÊN dùng khi:**
- Cần undo/redo functionality
- Cần save/restore object state (game save points, form draft)
- Muốn lưu trữ state history mà không phá vỡ encapsulation

**❌ KHÔNG nên dùng khi:**
- State quá lớn – mỗi snapshot tốn quá nhiều memory
- Thay đổi quá thường xuyên – quá nhiều snapshots
- Dùng Command Pattern thay thế khi undo logic phức tạp hơn simple state restore

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (19:30 – 21:00)

> "Memento: Originator tạo snapshot, Caretaker lưu trữ, Originator tự khôi phục.
>
> Ba điều nhớ:
> 1. Memento là immutable – không ai sửa được sau khi tạo
> 2. Caretaker KHÔNG truy cập nội dung Memento – chỉ lưu và trả lại
> 3. Memory management quan trọng: giới hạn số snapshots và tổng kích thước
>
> Bài tiếp theo: **Visitor Pattern** – thêm operations mới vào object hierarchy mà không sửa classes. Double dispatch trong C#."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Console text editor với Undo/Redo hoạt động |
| Demo | History panel: `GetHistory()` hiển thị danh sách checkpoints |
| Điểm nhấn | Memory trimming quan trọng: không giới hạn → memory leak |
