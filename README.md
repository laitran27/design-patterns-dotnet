# .NET Design Patterns - Vietnamese Learning Site

Website tinh hoc 23 GoF Design Patterns cho .NET Developer, viet bang HTML/CSS/JavaScript thuan. Noi dung tap trung vao vi du C#/.NET 8, lo trinh 16 tuan va theo doi tien do hoc bang trinh duyet.

## Noi dung chinh

- Tong quan lo trinh hoc 16 tuan.
- Danh sach 23 GoF Design Patterns, co loc theo nhom va tim kiem.
- Trang chi tiet tung pattern voi intent, UML text, vi du C# va khi nen/khong nen dung.
- Checklist tien do, thanh tich va thong ke theo Creational/Structural/Behavioral.
- Tien do duoc luu local trong `localStorage`, khong can dang nhap.

## Cau truc

```text
.
|-- index.html
|-- patterns.html
|-- pattern-detail.html
|-- progress.html
|-- css/
|   `-- style.css
|-- js/
|   |-- main.js
|   `-- patterns-data.js
`-- tests/
    `-- smoke.spec.js
```

## Chay local

Neu chi can xem nhanh:

```bash
npm run serve
```

Sau do mo:

```text
http://localhost:4177
```

Neu chua cai dependencies:

```bash
npm install
```

## Kiem thu

Smoke tests dung Playwright de dam bao cac trang chinh render dung, filter/search hoat dong, va tien do co the luu qua refresh.

```bash
npm test
```

Lan dau chay Playwright tren may moi co the can:

```bash
npx playwright install
```

## Them pattern moi

1. Them object moi vao `js/patterns-data.js`.
2. Dam bao co cac truong: `id`, `name`, `nameVi`, `category`, `priority`, `readingTime`, `phase`, `description`, `intent`, `dotnetExample`, `whenToUse`, `whenNotToUse`, `codeExample`, `umlDiagram`.
3. Neu pattern thuoc lo trinh, cap nhat `PHASES_DATA`.
4. Chay `npm test` de kiem tra cac trang render va filter van dung.

## Ghi chu van hanh

- Project dang dung CDN cho Google Fonts, Font Awesome va Highlight.js.
- Neu deploy noi bo/offline, nen dua cac asset nay ve local.
- Neu mo rong thanh app lon hon, nen can nhac tach component template ra file rieng hoac chuyen sang build tool nhe nhu Vite.
