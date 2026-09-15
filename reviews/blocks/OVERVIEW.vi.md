# Hệ thống Block — tổng quan để review

**Ngày:** 15/09/2026 · **Nhánh:** `plan/block-system` · **Chưa push**
Bản tiếng Việt của [README.md](README.md). Các tài liệu kỹ thuật chi tiết vẫn bằng tiếng Anh vì
agent đọc chúng khi implement; file này để **bạn đọc và phản biện**.

> Phần quan trọng nhất là **§7 — Những quyết định cần bạn duyệt**. Các phần trước chỉ là bối cảnh
> để §7 có nghĩa.

---

## 1. Vấn đề đang giải

Phase 1–17 đã biến bản fork tldraw 2021 thành một editor slide dùng được: có khung slide cố định,
theme, template, trình chiếu, API cho host (`app.deck.*`), và render SVG không cần trình duyệt.

Thứ nó vẫn thiếu là **mô hình nội dung**. Hiện tại một slide chỉ là một túi hình chữ nhật, đường
thẳng và text dạng chuỗi thuần. Với sản phẩm "AI dựng slide", đó là vấn đề chí mạng: AI không thể
phát ra toạ độ và màu hex mà vẫn cho ra slide đẹp.

**Block** là lớp còn thiếu đó. Một block là một đơn vị nội dung **có kiểu, có schema, ăn theo
theme, có animation** — "KPI tile", "timeline", "bảng so sánh". AI chọn block và điền slot, không
bao giờ đụng tới toạ độ.

---

## 2. Trạng thái hiện tại

**Đã xong: P18 (nền móng) và P19 (design tokens).** Toàn bộ nằm trong
`packages/tldraw/src/blocks/`.

| Hạng mục | Trạng thái |
|---|---|
| `BlockSpec` — cấu trúc dữ liệu của một block | ✅ có thật, có test, lưu/đọc qua document được |
| Registry + cầu nối `blockToShape`/`shapeToBlock` | ✅ |
| Toán tương phản WCAG + bộ giải màu | ✅ |
| Thang type/spacing/radius/elevation/motion | ✅ |
| `BlockDefinition`, `layout()`, `capacity()` | ⚠️ **mới chỉ khai báo, chưa block nào implement** |
| Renderer (DOM và SVG) | ❌ chưa có |
| `SlideSpec`, `SlideLayout`, `MasterSpec`, `DeckSpec` | ❌ chưa định nghĩa |

**Trả lời thẳng câu "đã có cấu trúc dữ liệu cho block và slide chưa":**
**Block thì có. Slide thì chưa.**

Cần phân biệt cho chính xác: slide ở **tầng lưu trữ** đã có từ lâu — `TDPage` mang
`size`/`background`/`notes`/`skipInPresentation` từ Phase 3 và 11. Cái thiếu là tầng
**authoring/compile**: SlideSpec, region layout, master, DeckSpec — tức đúng phần mà AI nhắm vào.

Kiểm tra bằng số, đo trên cây làm việc hiện tại:

| | Giá trị |
|---|---|
| Jest | 99/99 suite · 726 pass · 77 todo · 19 snapshot |
| Typecheck | 10 lỗi, **toàn bộ nằm trong file `.spec.ts`**, 0 lỗi trong source |
| eslint `src/blocks` | 0 error |

---

## 3. Kiến trúc — bốn quyết định cốt lõi

**1. Xây trên `ComponentShape` có sẵn, không tạo shape type mới.**
Phase 5 đã có `ComponentShape` render React tuỳ ý lên canvas và chỉ lưu `{ componentId, props }`
dạng JSON. Nếu làm 170 shape type mới thì phải viết 170 shape util, 170 enum member, và host
không có cách nào tự thêm block. Registry mới là chỗ mở rộng.

*Cái giá phải trả, nói thẳng:* `ComponentShape` render bằng HTML nên **không render headless
được** — hiện `renderPageToSvg` vẽ nó thành ô gạch đứt. Task **A5** sinh ra để trả cái giá này.

**2. Một `layout()`, hai renderer, và phải chứng minh chúng khớp nhau.**
Block hạng A được viết **một lần** dưới dạng hàm `layout()` thuần, trả về danh sách primitive.
Renderer DOM (editor) và renderer SVG (export) cùng ăn kết quả đó. Không ai được viết block hai
lần. Sự khớp nhau được **kiểm bằng test tự động**, không bằng mắt.

Đây là thứ khiến AI generation, thumbnail phía server, export và linter đều chạy được từ **một**
lần viết.

**3. Màu là vai trò, không phải mã hex.**
Block xin `accent` / `textMuted`, theme trả lời. Và màu chữ được **giải theo độ sáng của nền thật
mà block đang nằm trên**, lấy mẫu tại đúng ô của block — không phải theo nền của theme.

Việc này đóng một lỗi đã được ghi nhận từ trước: đặt stat row `mono-grid` lên nền gradient teal thì
caption gần như không đọc được. Đo theo nền theme ra ~7,1:1 (tưởng ổn), đo theo nền thật ra
**~1,16:1**.

**4. Document lưu *đặc tả*, không lưu React và không lưu pixel.**
Một block trong file `.tldr` là JSON thuần. Nó sống sót qua lưu trữ, multiplayer, và qua cả một
host chưa từng nghe tên block đó.

---

## 4. Cách chạy tiếp

Ba file, ba mục đích:

| File | Dùng khi |
|---|---|
| [RUN.md](RUN.md) | **Dán prompt trong đó mỗi lần muốn chạy.** AI tự đọc repo để biết đang tới đâu, tự chọn task, tự test. |
| [BACKLOG.md](BACKLOG.md) | ~40 task cỡ một session, 8 epic, có dependency và acceptance riêng. Cột status ở đây là **nguồn sự thật duy nhất** về tiến độ. |
| [CONTINUE.md](CONTINUE.md) | Brief cho session mới: trạng thái, lệnh đã verify, các bẫy. |

**Quy ước làm việc:** subagent implement, người điều phối review. Cách này đã bắt được **3 bug
thật**, và **không bug nào bị test xanh của chính người viết phát hiện**.

Trong repo có **ba cái bẫy** đã được ghi lại vì đều từng báo "thành công" trong khi đang lỗi:
`npx tsc` (giải sai đường dẫn), `npx turbo` (bắt nhầm version), và `cmd | tail` rồi đọc `$?` (đọc
ra exit code của `tail`).

---

## 5. Backlog tóm tắt

| Epic | Nội dung | Số task |
|---|---|---|
| **A** | Xương sống render — layout engine, 2 renderer, parity harness, headless | 6 |
| **B** | Motion — driver, 34 preset, build step, transition | 5 |
| **C** | Text — rich text, đo chữ, autofit, list | 4 |
| **D** | Cấu trúc dữ liệu slide & deck | 6 |
| **E** | Thư viện 170 block | 10 |
| **F** | UX soạn thảo — inserter, inspector, master mode | 5 |
| **G** | Deck Doctor (linter thiết kế) | 4 |
| **H** | Đóng gói + nợ kỹ thuật | 5 |

**Ba thứ tự quan trọng:**

1. **A5 trước mọi lời hứa về thumbnail/export/PDF.** Task nhỏ, nhưng là ranh giới giữa sản phẩm và
   demo.
2. **A4 (parity harness) trước Epic E.** Viết 170 block trước khi có harness = viết lại lần hai.
3. **D1–D3 làm được ngay.** Type thuần và hình học thuần, không phụ thuộc block nào.

---

## 6. Kết quả kỳ vọng khi xong hết

**Trong editor:** chèn block từ inserter có search; block ăn theme, lồng nhau, resize thì reflow;
slide theo 16 layout có region; master sửa một chỗ hiện mọi slide; trình chiếu có build step;
Deck Doctor báo lỗi thiết kế.

**Cho host Next.js:** `compileDeckSpec(json) → TDDocument` chạy **trên server không cần mount
editor**; `renderPageToSvg` ra SVG thật → thumbnail grid, PNG, và công thức PDF mới thật sự chạy
được.

**Cho AI:** phát ra `DeckSpec` JSON với từ vựng đóng (16 layout, ~170 block type, slot có tên và
budget ký tự), **không bao giờ phát ra toạ độ/màu/cỡ chữ**. `validateDeckSpec()` trả finding hành
động được → vòng lặp sửa. Đây là đòn bẩy chất lượng rẻ nhất, hơn mọi việc tinh chỉnh prompt.

**Vẫn sẽ KHÔNG có**, kể cả khi làm xong hết — nói rõ để không kỳ vọng nhầm:

- **PPTX export** — không nằm trong backlog (block khiến nó *khả thi*, nhưng chưa ai làm)
- **PDF cả deck dưới dạng method** — vẫn là công thức, vì package không thể chọn rasterizer thay host
- **Pipeline AI thật** — prompting, gọi model, ingest PDF/DOCX/URL
- **Block morph giữa 2 slide** — đã thiết kế, cần mount 2 slide cùng lúc, ghi là follow-up
- **RTL/bidi** — ghi rõ chưa xử lý, có fixture cố tình fail
- **Collab real-time trên block**, và **product shell** (tài khoản, chia sẻ, billing)

---

## 7. Những quyết định cần bạn duyệt

Đây là phần đáng đọc kỹ nhất. Mỗi mục là một lựa chọn tôi đã chốt mà bạn có thể không đồng ý — và
càng đổi sớm càng rẻ.

**7.1 — Tiền đề lớn nhất chưa được chứng minh.**
Cả kế hoạch 170 block dựa lên giả định "viết `layout()` một lần, hai renderer tự khớp". **Chưa
block nào chứng minh điều đó.** Nó bị thử lửa lần đầu ở task **A4**. Tôi xếp A4 trước Epic E chính
vì vậy: nếu parity không giữ được trong thực tế, phải sửa kiến trúc khi mới có 3 block, chứ không
phải khi đã có 170.
→ *Nếu bạn muốn giảm rủi ro hơn nữa: làm A4 rồi dừng lại đánh giá trước khi cam kết Epic E.*

**7.2 — Quyết định "tự xây hay đổi nền" (R-03) vẫn đang mở.**
Đây là bản fork đóng băng từ 2021, không có upstream. **Bạn sở hữu 100% chi phí bảo trì mãi mãi.**
tldraw v2/v3 hiện đại đã có sẵn frame, custom-shape API, rich text, React 18/19 — tức là cho không
một phần lớn công việc này.

Điều đó đúng từ lúc audit đầu tiên và **vẫn đúng**. Cái đã thay đổi: chi phí chuyển đổi đã tăng
thêm 17 phase. Nếu câu hỏi này còn thật sự mở, **phải chốt trước E1**, không phải sau khi có 170
block.

**7.3 — 170 block có nhiều quá không?**
Con số đến từ việc đối chiếu với `ppt-master` (mọi device, mọi page type của 5 hệ layout), nên nó
phủ đủ. Nhưng chi phí thật là 170 × 10 điểm definition-of-done.
→ *Lựa chọn khác: làm ~60 block dùng nhiều nhất trước, đo xem AI thực sự gọi tới block nào, rồi
mới mở rộng.* Tôi không chọn phương án này vì AI chọn kém khi từ vựng quá hẹp, nhưng đây là lựa
chọn của bạn, không phải của tôi.

**7.4 — GSAP là adapter, không phải dependency.**
Bạn có nhắc GSAP. Tôi chọn Web Animations API làm driver mặc định (0 byte, có sẵn mọi trình duyệt,
làm được cả 34 preset), còn GSAP là entry point tuỳ chọn nhận instance **của host**.
Lý do: mọi dependency của package là dependency của **mọi consumer**, và điều khoản license của
GSAP đã đổi nhiều lần — đó là quyết định của host, không phải của package. Nếu bạn muốn GSAP là
mặc định, nói sớm, vì nó ảnh hưởng B1.

**7.5 — Tôi đã sửa plan của chính mình về thứ tự.**
Bản đầu xếp cấu trúc slide vào P29, phụ thuộc 38 block. **Phụ thuộc đó sai** — type và hình học
region không cần block nào tồn tại. Đã kéo lên thành D1–D3, làm được ngay. Chỉ overflow cascade
(D5) mới thật sự cần `capacity()`.

**7.6 — Cắt scope có chủ đích, chưa làm.**
`packages/blocks` (package thư viện riêng) **chưa tạo** — nó cần sửa workspace/turbo và cài lại,
mà chưa có block cụ thể nào để bỏ vào. Hoãn tới H1. Nếu bạn muốn tách package sớm hơn, đây là chỗ
để nói.

**7.7 — Số liệu trong bản demo là hư cấu.**
Bản demo deck ([link artifact](https://claude.ai/artifact/Xwxn2BRaCEFCh1kh5Q8hAP)) dùng một
roastery **không có thật**, và có ghi nhãn "scenario data" ngay trên slide theo đúng luật của
`ppt-master` về việc không để KPI bịa trông như số thật. Tôi cố ý không bịa số liệu xuất khẩu thật.

---

## 8. Ghi chú về bản demo

Link: https://claude.ai/artifact/Xwxn2BRaCEFCh1kh5Q8hAP

**Đó là prototype thiết kế, không phải editor đang chạy.** P20 chưa có renderer nên editor thật
hiện vẫn vẽ block thành ô xám — xem được ở `examples/nextjs-sample` (nút **Add P18 block**).

Cái khiến prototype đáng tin: mọi con số trong đó lấy từ plan chứ không phải từ thẩm mỹ — thang
type là `02-design-language.md` §2.3 tính theo slide unit thật (`display 152/1920 = 7.917cqw`),
màu là §2.2 (nên "green cost ▲11.4%" ra **đỏ** vì chi phí tăng là tin xấu), motion là token
transitions.dev nguyên bản.

Khi P20 xong, phép thử chính là: block thật có dựng lại được đúng mấy slide đó không.
