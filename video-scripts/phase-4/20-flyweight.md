# Bài 20 – Flyweight Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 4 – Nâng Cao | **Tuần:** 11 | **Thứ tự:** 20/23  
**Thời lượng ước tính:** 20 phút  
**Độ ưu tiên:** ⭐ Thấp

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:00)

**[Màn hình: Memory profiler với nhiều string objects trùng lặp]**

> "Một game có 100.000 cây trong rừng. Mỗi cây có: vị trí (x, y), loại cây, texture (50KB), mesh data (200KB). Nếu mỗi cây lưu texture và mesh riêng: 100.000 × 250KB = **24GB RAM**. Game sẽ crash ngay lập tức.
>
> Nhưng thực ra: rừng chỉ có 5 loại cây. Tất cả cây cùng loại có cùng texture và mesh. Chỉ vị trí là khác nhau.
>
> **Flyweight Pattern:** chia sẻ phần không thay đổi (intrinsic state – texture, mesh) giữa nhiều objects. Mỗi object chỉ lưu phần riêng của nó (extrinsic state – vị trí). 24GB → 5 × 250KB + 100.000 × 8 bytes = **1.25MB + ~800KB = ~2MB**."

---

## PHẦN 2 – FLYWEIGHT LÀ GÌ? CONCEPT (2:00 – 5:00)

```
Intrinsic State (Shared):        Extrinsic State (Unique per instance):
TreeType {                        TreeInstance {
  typeName: "Oak"                   x: 100, y: 200
  texture: [50KB binary]            treeType: → shared TreeType
  mesh: [200KB binary]            }
  color: "#8B4513"
}
```

> "Hai loại state:
>
> **Intrinsic (nội tại):** Không thay đổi giữa các instances. Được chia sẻ. Lưu trong Flyweight.
>
> **Extrinsic (ngoại vi):** Thay đổi theo từng instance. Được truyền vào khi sử dụng.
>
> Flyweight Factory: đảm bảo chỉ tạo một Flyweight object cho mỗi unique intrinsic state. Cache và reuse."

---

## PHẦN 3 – CODE WALKTHROUGH (5:00 – 14:00)

### Bước 1: Flyweight (Shared State) (5:00 – 8:00)

```csharp
// Flyweight: chứa Intrinsic State – được chia sẻ giữa hàng nghìn instances
public sealed class TreeType
{
    // Intrinsic state: KHÔNG thay đổi, được share
    public string Name { get; }
    public string Color { get; }
    public byte[] Texture { get; }  // 50KB, shared!
    public byte[] MeshData { get; } // 200KB, shared!

    // Constructor internal: chỉ Factory có thể tạo
    internal TreeType(string name, string color, byte[] texture, byte[] meshData)
    {
        Name = name;
        Color = color;
        Texture = texture;
        MeshData = meshData;
    }

    // Draw: nhận Extrinsic State (position) làm tham số
    public void Draw(int x, int y, float scale, IRenderer renderer)
    {
        // Combine intrinsic (this.Texture, this.MeshData) với extrinsic (x, y, scale)
        renderer.Render(x, y, scale, Texture, MeshData, Color);
    }
}

// Tree instance: chỉ lưu Extrinsic State + reference đến Flyweight
public class Tree
{
    // Extrinsic state: unique per tree
    public int X { get; set; }
    public int Y { get; set; }
    public float Scale { get; set; } = 1.0f;
    
    // Reference đến shared Flyweight – không duplicate texture/mesh
    public TreeType Type { get; }  // 8 bytes reference thay vì 250KB!

    public Tree(int x, int y, TreeType type, float scale = 1.0f)
    {
        X = x; Y = y; Type = type; Scale = scale;
    }

    public void Draw(IRenderer renderer) => Type.Draw(X, Y, Scale, renderer);
}
```

### Bước 2: Flyweight Factory (8:00 – 11:00)

```csharp
// Flyweight Factory: đảm bảo chỉ tạo một TreeType cho mỗi loại cây
public class TreeTypeFactory
{
    // Cache: key = tên cây, value = Flyweight object
    private readonly Dictionary<string, TreeType> _treeTypes = new();
    private readonly ITextureLoader _textureLoader;
    private readonly IMeshLoader _meshLoader;

    public TreeTypeFactory(ITextureLoader textureLoader, IMeshLoader meshLoader)
    {
        _textureLoader = textureLoader;
        _meshLoader = meshLoader;
    }

    // GetOrCreate: trả về existing nếu có, tạo mới nếu chưa
    public TreeType GetOrCreate(string name, string color)
    {
        // Cache hit: return shared object
        if (_treeTypes.TryGetValue(name, out var existing))
            return existing;
        
        // Cache miss: load expensive resources một lần
        Console.WriteLine($"Creating new TreeType: {name} (loading texture + mesh...)");
        var texture = _textureLoader.Load($"{name}.png");    // 50KB
        var mesh = _meshLoader.Load($"{name}.obj");           // 200KB
        
        var treeType = new TreeType(name, color, texture, mesh);
        _treeTypes[name] = treeType;  // Cache cho lần sau
        return treeType;
    }

    public int GetFlyweightCount() => _treeTypes.Count;
    public long GetMemorySaved(int totalTrees) 
    {
        var sharedDataSize = _treeTypes.Values.Sum(t => t.Texture.Length + t.MeshData.Length);
        var withoutFlyweight = sharedDataSize * totalTrees;
        return withoutFlyweight - sharedDataSize - totalTrees * 20; // 20 bytes per Tree instance
    }
}

// Forest: tạo 100.000 cây
public class Forest
{
    private readonly List<Tree> _trees = new(capacity: 100_000);
    private readonly TreeTypeFactory _factory;

    public Forest(TreeTypeFactory factory) => _factory = factory;

    public void PlantTree(int x, int y, string typeName, string color, float scale = 1.0f)
    {
        // Factory đảm bảo: 100 Oak trees → chỉ 1 TreeType "Oak" trong memory
        var treeType = _factory.GetOrCreate(typeName, color);
        _trees.Add(new Tree(x, y, treeType, scale));
    }

    public void Draw(IRenderer renderer)
    {
        foreach (var tree in _trees)
            tree.Draw(renderer);
    }
}

// Demo: tạo 100.000 cây
var factory = new TreeTypeFactory(textureLoader, meshLoader);
var forest = new Forest(factory);

var random = new Random(42);
string[] treeTypes = ["Oak", "Pine", "Birch", "Maple", "Willow"]; // Chỉ 5 loại

for (int i = 0; i < 100_000; i++)
    forest.PlantTree(
        x: random.Next(0, 10_000),
        y: random.Next(0, 10_000),
        typeName: treeTypes[random.Next(treeTypes.Length)],
        color: "#228B22",
        scale: (float)(0.8 + random.NextDouble() * 0.4));

Console.WriteLine($"Unique TreeTypes in memory: {factory.GetFlyweightCount()}"); // 5
Console.WriteLine($"Memory saved: {factory.GetMemorySaved(100_000) / 1_000_000}MB"); // ~24GB
```

### Bước 3: String Interning – Flyweight trong .NET (11:00 – 14:00)

```csharp
// .NET String Interning = Flyweight Pattern built-in!
// Strings với cùng value được SHARE trong memory

// String Interning thủ công
string s1 = "Hello World";
string s2 = string.Intern("Hello World");
// s1 và s2 có thể trỏ đến CÙNG object trong Intern Pool

// Thực tế: .NET tự intern string literals
string a = "Hello"; // ← interned automatically
string b = "Hello"; // ← same object as 'a'!
Console.WriteLine(object.ReferenceEquals(a, b)); // true

// SymbolTable pattern: dùng string interning cho identifiers
public class SymbolTable
{
    private readonly Dictionary<string, string> _symbols = new();
    
    // Intern tất cả property names khi deserialize JSON
    public string Intern(string value)
    {
        if (_symbols.TryGetValue(value, out var interned))
            return interned; // Return shared reference
        _symbols[value] = value;
        return value;
    }
}
```

---

## PHẦN 4 – VÍ DỤ THỰC TẾ .NET (14:00 – 16:30)

> "Flyweight trong .NET ecosystem:
>
> **String interning** – `string.Intern()` và compile-time interning của literals
>
> **`Encoding` class** – `Encoding.UTF8`, `Encoding.ASCII` là singleton Flyweights – shared instances
>
> **`Color` struct trong WPF/MAUI** – `Colors.Red`, `Colors.Blue` là named flyweights
>
> **`DbConnection` pooling** – ADO.NET connection pool là Flyweight: connections được shared thay vì tạo mới mỗi request
>
> **`IMemoryCache` với response caching** – cache objects thay vì compute lại – Flyweight mindset"

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (16:30 – 18:30)

**✅ NÊN dùng khi:**
- Số lượng objects rất lớn (thousands/millions) gây memory pressure
- Objects chia sẻ nhiều state giống nhau (intrinsic > extrinsic)
- Memory là bottleneck thực sự (profile trước khi tối ưu)

**❌ KHÔNG nên dùng khi:**
- Ít objects – premature optimization
- Objects có ít state chung – overhead của factory không worth it
- State phức tạp, khó tách intrinsic/extrinsic

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (18:30 – 20:00)

> "Flyweight: chia sẻ intrinsic state, client cung cấp extrinsic state.
>
> Ba điều nhớ:
> 1. Tách state thành Intrinsic (shared) và Extrinsic (per-instance)
> 2. Factory đảm bảo chỉ một Flyweight cho mỗi unique intrinsic state
> 3. String interning và connection pooling là Flyweight đã built-in trong .NET
>
> Bài tiếp theo: **Memento** – lưu và khôi phục state của object. Undo/redo system không dùng Command. Photoshop History panel là Memento."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Memory profiler: trước và sau Flyweight với 100K objects |
| Visual | Diagram: 5 TreeType objects được share bởi 100.000 Tree instances |
| Điểm nhấn | Tính toán memory savings: 24GB → 2MB |
