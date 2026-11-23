# CNC Lathe Knurling — Tool Tạo Chương Trình Lăn Nhám Máy Tiện CNC

Ứng dụng web chạy trực tiếp trên trình duyệt (100% offline, không cần cài đặt hay backend) để tính toán thông số, kiểm tra khớp răng chu vi, mô phỏng 2D và xuất chương trình G-code lăn nhám cho máy tiện CNC.

- **Chạy trực tiếp online:** https://hoangminhsang989.github.io/tool-cnc/

## Tính năng chính

- **Hỗ trợ đa hệ điều khiển:** Fanuc / GSK / Mitsubishi (`G99`, `G04 X`), Haas (`G99`, `G04 P`), Mach3 / LinuxCNC (`G95`, `G04 P`). Tự động khóa tốc độ trục chính không đổi `G97`.
- **Gia công Ngoài (`OD`) & Lỗ trong (`ID`):** Tự động đảo chiều tiến dao và trình tự rút dao an toàn khi lăn nhám lỗ trong.
- **3 phương pháp tạo nhám:**
  - **Bánh lăn chạy dọc (`Traverse`):** Hỗ trợ chạy Một chiều hoặc Hai chiều (Zig-zag), thoát dao vát 45° cuối hành trình.
  - **Bánh lăn ép tại chỗ (`Plunge`):** Chia lát ăn sâu hướng kính kèm `Dwell` làm mượt đỉnh răng.
  - **Dao ren 60° (`G32` đa đầu mối):** Tự tính bước xoắn $L = \pi D_0 / \tan\alpha$, số đầu mối, chia lát giảm dần theo diện tích phoi ($\sqrt{i/N}$), hỗ trợ `Spring Pass` vét bavia đáy, xuất **Code thẳng** hoặc **Macro `WHILE`**, chia đầu mối bằng góc pha `Q` hoặc dịch `Z_start`.
- **Tự động tính chế độ cắt:** Tự tính `S`, `Fx`, `Fz`, `Dwell` và `Passes` theo vật liệu (Nhôm, Đồng thau, Thép mềm, C45, Inox 304) và đường kính `D0`.
- **Kiểm tra khớp răng chu vi (Tracking Check):** Tính số răng $\pi \times D_0 / P$, cảnh báo lệch răng và gợi ý `D0` tối ưu.
- **Mô phỏng 2D & Chiếu lưới nhám (Zoom):** Vẽ mặt cắt phôi, mâm cặp, bánh lăn / dao ren 60°, góc xoắn $\alpha$, nút **`▶ Chạy thử`** hoạt hình đường chạy dao, và khung soi lưới nhám 3D phóng đại.
- **Tùy biến xuất G-code linh hoạt:** Bật/tắt `Số CT`, `G21 G40 G80 G99`, `G54`, `Ghi chú`, `Dấu ; đầu/cuối` và `Số dòng N10`.
- **Lưu Preset & In Phiếu Setup:** Lưu cấu hình vào `localStorage`, tải `.nc`/`.txt`, và in Phiếu Setup qua `@media print`.
