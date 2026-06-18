# Bài 22 – Visitor Pattern
**Series:** 23 GoF Design Patterns trong .NET 8  
**Giai đoạn:** 4 – Nâng Cao | **Tuần:** 13 | **Thứ tự:** 22/23  
**Thời lượng ước tính:** 21 phút  
**Độ ưu tiên:** ⭐ Thấp

---

## PHẦN 1 – INTRO & HOOK (0:00 – 2:30)

**[Màn hình: Enum-based type checking rải rác]**

> "Bạn có một AST (Abstract Syntax Tree) cho một expression language: `NumberLiteral`, `StringLiteral`, `BinaryOperation`, `UnaryOperation`, `FunctionCall`.
>
> Bây giờ bạn cần: evaluate, pretty-print, type-check, và optimize. Nếu thêm logic vào từng class: mỗi class phải biết về evaluate, print, type-check, optimize. Vi phạm Single Responsibility nặng nề.
>
> **Visitor Pattern:** tách operations ra khỏi classes. Mỗi operation là một Visitor. Classes chỉ có một method `Accept(visitor)`. Thêm operation mới = thêm Visitor class, không sửa AST classes."

---

## PHẦN 2 – VISITOR LÀ GÌ? CONCEPT (2:30 – 6:00)

```
Element (Expression classes):        Visitor (Operations):
├── NumberLiteral.Accept(v)  ──▶      ├── IExpressionVisitor
├── BinaryOp.Accept(v)       ──▶      │   ├── EvaluateVisitor
└── FunctionCall.Accept(v)   ──▶      │   ├── PrettyPrintVisitor
                                      │   └── TypeCheckVisitor
                             ◀── v.Visit(this)  ── double dispatch
```

> "**Double Dispatch:** thông thường C# dùng single dispatch (method được chọn dựa vào type của object). Visitor cần two-level dispatch:
>
> 1. `element.Accept(visitor)` – dispatch dựa vào type của element
> 2. Bên trong `Accept`: `visitor.Visit(this)` – dispatch dựa vào type của visitor
>
> Kết quả: đúng method của đúng visitor được gọi cho đúng element type."

---

## PHẦN 3 – CODE WALKTHROUGH (5:00 – 16:00)

### Bước 1: Element Hierarchy (6:00 – 9:00)

```csharp
// Element interface: mỗi node trong AST có thể Accept visitor
public interface IExpression
{
    T Accept<T>(IExpressionVisitor<T> visitor);
}

// Concrete elements – các node trong AST
public class NumberLiteral(double value) : IExpression
{
    public double Value { get; } = value;
    
    // Accept: gọi visitor.Visit(this) – "this" là NumberLiteral
    // C# compiler biết gọi IExpressionVisitor<T>.Visit(NumberLiteral)
    public T Accept<T>(IExpressionVisitor<T> visitor) => visitor.Visit(this);
}

public class StringLiteral(string value) : IExpression
{
    public string Value { get; } = value;
    public T Accept<T>(IExpressionVisitor<T> visitor) => visitor.Visit(this);
}

public class BinaryOperation(IExpression left, string op, IExpression right) : IExpression
{
    public IExpression Left { get; } = left;
    public string Operator { get; } = op;
    public IExpression Right { get; } = right;
    public T Accept<T>(IExpressionVisitor<T> visitor) => visitor.Visit(this);
}

public class UnaryOperation(string op, IExpression operand) : IExpression
{
    public string Operator { get; } = op;
    public IExpression Operand { get; } = operand;
    public T Accept<T>(IExpressionVisitor<T> visitor) => visitor.Visit(this);
}
```

### Bước 2: Visitor Interface (9:00 – 10:30)

```csharp
// Visitor Interface: một Visit method cho MỖI element type
// Generic <T>: visitor có thể trả về bất kỳ type nào (double, string, bool...)
public interface IExpressionVisitor<out T>
{
    T Visit(NumberLiteral number);
    T Visit(StringLiteral str);
    T Visit(BinaryOperation binary);
    T Visit(UnaryOperation unary);
}
```

### Bước 3: Concrete Visitors (10:30 – 16:00)

```csharp
// Evaluate Visitor: trả về object (number hoặc string)
public class EvaluateVisitor : IExpressionVisitor<object>
{
    public object Visit(NumberLiteral number) => number.Value;
    
    public object Visit(StringLiteral str) => str.Value;
    
    public object Visit(BinaryOperation binary)
    {
        var left = binary.Left.Accept(this);   // Đệ quy: evaluate trái
        var right = binary.Right.Accept(this); // Đệ quy: evaluate phải
        
        return binary.Operator switch
        {
            "+" => left is double l && right is double r
                ? (object)(l + r)
                : (object)(left.ToString() + right.ToString()), // String concatenation
            "-" => (double)left - (double)right,
            "*" => (double)left * (double)right,
            "/" => (double)right == 0 
                ? throw new DivideByZeroException() 
                : (object)((double)left / (double)right),
            ">" => (double)left > (double)right,
            "<" => (double)left < (double)right,
            "==" => Equals(left, right),
            _ => throw new InvalidOperationException($"Unknown operator: {binary.Operator}")
        };
    }
    
    public object Visit(UnaryOperation unary)
    {
        var operand = unary.Operand.Accept(this);
        return unary.Operator switch
        {
            "-" => -(double)operand,
            "!" => !(bool)operand,
            _ => throw new InvalidOperationException($"Unknown unary operator: {unary.Operator}")
        };
    }
}

// Pretty Print Visitor: tạo human-readable string
public class PrettyPrintVisitor : IExpressionVisitor<string>
{
    public string Visit(NumberLiteral number) 
        => number.Value % 1 == 0 ? number.Value.ToString("F0") : number.Value.ToString("F2");
    
    public string Visit(StringLiteral str) => $"\"{str.Value}\"";
    
    public string Visit(BinaryOperation binary)
    {
        var left = binary.Left.Accept(this);
        var right = binary.Right.Accept(this);
        return $"({left} {binary.Operator} {right})";
    }
    
    public string Visit(UnaryOperation unary)
    {
        var operand = unary.Operand.Accept(this);
        return $"({unary.Operator}{operand})";
    }
}

// Type Check Visitor: trả về string type
public class TypeCheckVisitor : IExpressionVisitor<string>
{
    public string Visit(NumberLiteral _) => "number";
    public string Visit(StringLiteral _) => "string";
    
    public string Visit(BinaryOperation binary)
    {
        var leftType = binary.Left.Accept(this);
        var rightType = binary.Right.Accept(this);
        
        if (binary.Operator is "+" && (leftType == "string" || rightType == "string"))
            return "string";
        
        if (leftType != rightType)
            throw new TypeException($"Type mismatch: {leftType} {binary.Operator} {rightType}");
        
        return binary.Operator is ">" or "<" or "==" ? "bool" : leftType;
    }
    
    public string Visit(UnaryOperation unary)
    {
        var operandType = unary.Operand.Accept(this);
        return unary.Operator switch
        {
            "-" => operandType == "number" ? "number" 
                : throw new TypeException("Unary minus requires number"),
            "!" => operandType == "bool" ? "bool" 
                : throw new TypeException("Unary not requires bool"),
            _ => throw new InvalidOperationException()
        };
    }
}

// Sử dụng:
// Expression: (3 + 4) * 2
var expr = new BinaryOperation(
    new BinaryOperation(new NumberLiteral(3), "+", new NumberLiteral(4)),
    "*",
    new NumberLiteral(2));

var evaluator = new EvaluateVisitor();
var printer = new PrettyPrintVisitor();
var typeChecker = new TypeCheckVisitor();

Console.WriteLine(expr.Accept(evaluator));     // 14
Console.WriteLine(expr.Accept(printer));        // ((3 + 4) * 2)
Console.WriteLine(expr.Accept(typeChecker));    // number
```

---

## PHẦN 4 – C# PATTERN MATCHING ALTERNATIVE (16:00 – 18:30)

> "C# 8+ Pattern Matching là alternative cho Visitor khi không muốn double dispatch:

```csharp
// Pattern Matching thay thế Visitor (C# 9+ switch expression)
public static object EvaluateExpression(IExpression expr) => expr switch
{
    NumberLiteral n => n.Value,
    StringLiteral s => s.Value,
    BinaryOperation b => EvaluateBinary(b),
    UnaryOperation u => EvaluateUnary(u),
    _ => throw new ArgumentException($"Unknown expression type: {expr.GetType().Name}")
};

// Khi nào dùng Visitor vs Pattern Matching:
// - Thêm types mới thường xuyên → Pattern Matching dễ hơn
// - Thêm operations mới thường xuyên → Visitor dễ hơn (không sửa elements)
// - Visitor cần OOP overhead, Pattern Matching ngắn gọn hơn
```

---

## PHẦN 5 – KHI NÀO DÙNG / KHÔNG DÙNG (18:30 – 20:00)

**✅ NÊN dùng khi:**
- Cần nhiều unrelated operations trên object hierarchy (AST, DOM, IR)
- Object hierarchy ổn định nhưng operations hay thay đổi
- Muốn tránh "pollution" methods vào element classes

**❌ KHÔNG nên dùng khi:**
- Object hierarchy hay thay đổi – phải cập nhật tất cả Visitors
- Ít operations và hierarchy đơn giản – Pattern Matching đủ rồi
- Double dispatch quá phức tạp cho use case đơn giản

---

## PHẦN 6 – TÓM TẮT & BÀI TIẾP THEO (20:00 – 21:00)

> "Visitor: operations sống bên ngoài elements, không làm bẩn class hierarchy.
>
> Ba điều nhớ:
> 1. Double dispatch: `element.Accept(visitor)` → `visitor.Visit(element)` – hai lần dispatch
> 2. Thêm operation: thêm Visitor class, không sửa elements
> 3. C# Pattern Matching là alternative đơn giản hơn cho nhiều cases
>
> Bài cuối cùng: **Interpreter Pattern** – build DSL (Domain Specific Language) và evaluate expressions. Business rule engines, query builders, configuration parsers."

---

## GHI CHÚ SẢN XUẤT

| Mục | Chi tiết |
|-----|----------|
| Demo | Chạy cùng expression với 3 visitors khác nhau |
| So sánh | Visitor vs Pattern Matching – khi nào dùng cái nào |
| Visual | Double dispatch diagram |
