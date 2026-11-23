# CNC Lathe Knurling — Tool Tạo Chương Trình Lăn Nhám Máy Tiện CNC

Ứng dụng web chạy trực tiếp trên trình duyệt (100% offline, không cần cài đặt hay backend) để tính toán thông số, kiểm tra khớp răng chu vi, mô phỏng 2D và xuất chương trình G-code lăn nhám cho máy tiện CNC.

## Tính năng chính

- **Hỗ trợ đa hệ điều khiển:** Fanuc / GSK / Mitsubishi (`G99`, `G04 X`), Haas (`G99`, `G04 P`), Mach3 / LinuxCNC (`G95`, `G04 P`). Tự động khóa tốc độ trục chính không đổi `G97`.
- **Phương pháp & hoa văn lăn:**
  - Lăn chạy dọc (`Traverse / Feed`) hỗ trợ chạy **Một chiều** hoặc **Hai chiều (Zig-zag)**, tùy chọn thoát dao vát 45° cuối hành trình `Z`.
  - Lăn ép tại chỗ (`Plunge / Form`).
  - Hoa văn: Ca-rô (`Diamond`), Thẳng (`Straight`), Chéo (`Diagonal`).
- **Tự động tính chế độ cắt:** Tự tính `S` (RPM), `Fx`, `Fz`, thời gian dừng đáy `Dwell` (3 vòng quay làm mượt đỉnh răng), chiều sâu răng (`0.45 × Pitch`) và số lượt cắt (`Passes`) theo vật liệu (Nhôm, Đồng thau, Thép mềm, C45, Inox 304) và đường kính phôi `D0`.
- **Kiểm tra khớp răng chu vi (Tracking Check):** Tính số răng $\pi \times D_0 / P$, cảnh báo nếu bị lệch răng (dễ nhảy răng/bóng ma) và gợi ý nút áp dụng đường kính `D0` tối ưu gần nhất.
- **Tiện tinh `D0` trước khi lăn (tùy chọn):** Chèn nguyên công tiện tinh đường kính `D0` + vát mép đầu `C` kèm `M01` để kiểm tra kích thước phôi trước khi lăn nhám.
- **Tùy biến xuất G-code linh hoạt:** Bật/tắt nhanh `Số CT (O...)`, `G21 G40 G80 G99`, `G54`, `Ghi chú`, và `Dấu ; đầu/cuối` để copy ghép trực tiếp vào chương trình có sẵn.
- **Mô phỏng 2D & In Phiếu Setup:** Bản vẽ 2D thể hiện mâm cặp, phôi, bánh lăn, đường chạy dao `G00`/`G01` cùng kích thước `ØD0`, `L`, `X_min`, `Z0`; hỗ trợ lưu/nạp cấu hình (`localStorage`), xuất `.nc`/`.txt` và in Phiếu Setup.

## Cách sử dụng

1. Mở trực tiếp file `index.html` bằng trình duyệt (Chrome, Edge, Firefox) hoặc truy cập qua GitHub Pages.
2. Nhập thông số phôi (`D0`, `Z bắt đầu`, `Z kết thúc`), chọn vật liệu và bước nhám `Pitch`.
3. Kiểm tra cảnh báo khớp răng chu vi và bản vẽ 2D.
4. Bấm **Copy** hoặc **Tải .NC** / **In Setup** để đưa ra máy tiện CNC.
