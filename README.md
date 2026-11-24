# CNC Tool — Tạo Chương Trình Lăn Nhám & Tính Chế Độ Cắt CNC

Bộ công cụ web chạy trực tiếp trên trình duyệt (100% offline, không cần cài đặt hay backend) gồm 2 tab chuyên dụng cho xưởng gia công CNC:

- **Chạy trực tiếp online:** https://hoangminhsang989.github.io/tool-cnc/

## 1. Tab `Lăn nhám CNC`

- **Đa hệ điều khiển:** Fanuc / GSK / Mitsubishi (`G99`, `G04 X`), Haas (`G99`, `G04 P`), Mach3 / LinuxCNC (`G95`, `G04 P`). Khóa tốc độ trục chính không đổi `G97`.
- **Gia công Ngoài (`OD`) & Lỗ trong (`ID`):** Tự động đảo chiều tiến dao và trình tự rút dao an toàn khi lăn lỗ trong.
- **3 phương pháp tạo nhám:**
  - **Bánh lăn chạy dọc (`Traverse`):** Hỗ trợ chạy Một chiều hoặc Hai chiều (`Zig-zag`), thoát dao vát 45° cuối hành trình.
  - **Bánh lăn ép tại chỗ (`Plunge`):** Chia lát ăn hướng kính kèm `Dwell`, cảnh báo nếu đoạn lăn dài hơn bề rộng bánh lăn (`8 mm` mặc định).
  - **Dao ren 60° (`G32` đa đầu mối):** Tự tính bước xoắn $L = \pi D_0 / \tan\alpha$, số đầu mối, chia lát giảm dần theo diện tích phoi ($\sqrt{i/N}$), thêm `Spring Pass` vét bavia, xuất **Code thẳng** hoặc **Macro `WHILE`**, chia đầu mối bằng góc pha `Q` hoặc dịch `Z_start`.
- **Tự tính thông số & Kiểm tra khớp răng:** Tự tính `S`, `Fx`, `Fz`, `Dwell`, `Passes` khác nhau theo vật liệu và hoa văn (`Ca-rô` / `Thẳng` / `Chéo`); kiểm tra khớp răng chu vi $\pi D_0 / P$ và tính ngược `D0` từ đường kính thành phẩm.
- **Mô phỏng 2D & Chiếu lưới nhám (Zoom):** Vẽ mặt cắt phôi, mâm cặp, bánh lăn / dao ren 60°, góc xoắn $\alpha$, nút **`▶ Chạy thử`** hoạt hình đường chạy dao, và khung soi lưới nhám 3D phóng đại.
- **Tùy biến xuất G-code & Tiện ích:** Bật/tắt `Số CT`, `G21 G40 G80 G99`, `G54`, `Ghi chú`, `Dấu ; đầu/cuối`, `Số dòng N10`; lưu Preset (`localStorage`), chia sẻ link cấu hình (`Share`), tải `.nc`/`.txt`, và in Phiếu Setup (`@media print`).

## 2. Tab `Tính Chế Độ Cắt`

- **3 nguyên công:** Tiện ngoài / Tiện lỗ, Phay ngón / Phay mặt, Khoan / Taro.
- **7 nhóm vật liệu & 6 dòng chíp/dao:** Tự điều chỉnh `Vc`, `f / fz` theo `CVD/PVD`, `Cermet`, `Hợp kim không phủ`, `HSS`, `CBN`, `PCD`.
- **Tính 2 chiều & Phân tích:** Tính `S (RPM)`, `Vf (mm/ph)`, năng suất bóc phôi `MRR (cm³/ph)`, công suất cắt `Pc (kW)`, độ bóng lý thuyết `Ra (µm)` theo bán kính mũi dao `R`, ước tính thời gian cắt `L`, kèm bảng tra nhanh `Vc` và **Bảng mũi khoan lỗ trước khi Taro (M3–M20)**.

## 3. Hướng dẫn trực tiếp (Hover 3 giây)

- Giữ chuột **3 giây** tại bất kỳ ô chức năng nào để hiện bảng giải thích chi tiết bằng tiếng Việt kèm hình minh họa SVG.
