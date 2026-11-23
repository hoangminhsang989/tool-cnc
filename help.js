(() => {
  const HELP_DATA = {
    surfaceType: {
      title: "Bề mặt gia công: Ngoài (OD) & Lỗ trong (ID)",
      text: "Chọn Ngoài (OD) khi lăn trục ngoài (dao ăn vào theo -X). Chọn Lỗ trong (ID) khi lăn bên trong lỗ ống/bạc (dao đi vào tâm lỗ rồi ăn ra thành lỗ theo +X, tự động rút Z khỏi lỗ trước khi về gốc).",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="14" y="16" width="95" height="62" rx="3" fill="#e2e8f0" stroke="#475569" stroke-width="1.4"/>
        <rect x="65" y="16" width="44" height="62" fill="rgba(217,119,6,0.2)" stroke="#d97706"/>
        <line x1="87" y1="4" x2="87" y2="15" stroke="#dc2626" stroke-width="2"/>
        <polygon points="83,12 91,12 87,17" fill="#dc2626"/>
        <text x="61" y="90" font-size="10" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Ngoài (OD): ăn -X</text>
        <rect x="148" y="14" width="98" height="16" fill="#cbd5e1" stroke="#475569" stroke-width="1.2"/>
        <rect x="148" y="64" width="98" height="16" fill="#cbd5e1" stroke="#475569" stroke-width="1.2"/>
        <rect x="195" y="30" width="51" height="34" fill="rgba(217,119,6,0.16)" stroke="#d97706" stroke-dasharray="3,2"/>
        <line x1="220" y1="47" x2="220" y2="32" stroke="#dc2626" stroke-width="2"/>
        <polygon points="216,35 224,35 220,29" fill="#dc2626"/>
        <text x="197" y="90" font-size="10" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Trong (ID): ăn +X</text>
      </svg>`
    },
    dBlank: {
      title: "Đường kính phôi D0 (mm)",
      text: "Đường kính phôi tiện sẵn trước khi lăn. Khi lăn ép bằng bánh lăn, vật liệu bị đẩy lên nên đường kính sau lăn sẽ nở thêm khoảng 0.4 × Pitch (với OD). Dùng nút 'Từ ĐK đạt' để tính ngược D0 từ kích thước bản vẽ.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="30" y="24" width="110" height="46" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
        <line x1="20" y1="47" x2="245" y2="47" stroke="#64748b" stroke-dasharray="6,3"/>
        <line x1="48" y1="24" x2="48" y2="70" stroke="#0f172a" stroke-width="1.3"/>
        <text x="54" y="43" font-size="11" font-family="monospace" font-weight="700" fill="#0f172a">D0</text>
        <rect x="140" y="20" width="90" height="54" fill="rgba(217,119,6,0.18)" stroke="#d97706" stroke-width="1.5"/>
        <text x="185" y="43" font-size="10.5" font-family="monospace" font-weight="700" fill="#b45309" text-anchor="middle">D_sau ≈</text>
        <text x="185" y="57" font-size="10.5" font-family="monospace" font-weight="700" fill="#b45309" text-anchor="middle">D0 + 0.4P</text>
      </svg>`
    },
    zRange: {
      title: "Tọa độ Z bắt đầu & Z kết thúc",
      text: "Gốc Z0 nằm ở mặt đầu phôi. Z bắt đầu thường lùi vào nhẹ (Z-1.0) nếu đã vát mép đầu; Z kết thúc là chiều dài đoạn nhám (vd Z-25.0). Không để Z bắt đầu sát mép chưa vát khi chạy dọc.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="30" y="24" width="180" height="44" fill="#e2e8f0" stroke="#475569" stroke-width="1.4"/>
        <rect x="105" y="24" width="95" height="44" fill="rgba(217,119,6,0.2)" stroke="#d97706"/>
        <line x1="210" y1="8" x2="210" y2="80" stroke="#16a34a" stroke-width="1.4" stroke-dasharray="3,2"/>
        <text x="214" y="18" font-size="10.5" font-family="monospace" font-weight="700" fill="#16a34a">Z0</text>
        <line x1="105" y1="78" x2="200" y2="78" stroke="#0f172a" stroke-width="1.2"/>
        <text x="105" y="90" font-size="10" font-family="monospace" fill="#475569" text-anchor="middle">Z_end</text>
        <text x="200" y="90" font-size="10" font-family="monospace" fill="#475569" text-anchor="middle">Z_start</text>
      </svg>`
    },
    method: {
      title: "Phương pháp tạo nhám",
      text: "• Chạy dọc (Traverse): Dùng khi đoạn nhám dài hơn bề rộng bánh lăn.\n• Ép tại chỗ (Plunge): Chỉ ăn hướng kính X, dùng khi đoạn nhám ≤ bề rộng bánh lăn.\n• Dao ren 60° (G32): Dùng mũi dao ren 60° chạy đa đầu mối tạo rãnh xoắn, không ép lực lên trục chính.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="12" y="42" width="68" height="30" fill="#e2e8f0" stroke="#475569"/>
        <rect x="26" y="16" width="22" height="16" rx="2" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
        <line x1="37" y1="34" x2="66" y2="34" stroke="#dc2626" stroke-width="2"/>
        <polygon points="63,30 69,34 63,38" fill="#dc2626"/>
        <text x="46" y="86" font-size="9.5" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Chạy dọc</text>

        <rect x="96" y="42" width="68" height="30" fill="#e2e8f0" stroke="#475569"/>
        <rect x="115" y="14" width="30" height="16" rx="2" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
        <line x1="130" y1="31" x2="130" y2="41" stroke="#dc2626" stroke-width="2"/>
        <text x="130" y="86" font-size="9.5" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Ép tại chỗ</text>

        <rect x="180" y="42" width="68" height="30" fill="#e2e8f0" stroke="#475569"/>
        <polygon points="206,16 222,16 214,34" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
        <line x1="214" y1="36" x2="238" y2="36" stroke="#dc2626" stroke-width="2"/>
        <text x="214" y="86" font-size="9.5" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Dao ren 60°</text>
      </svg>`
    },
    pattern: {
      title: "Kiểu hoa văn & Ảnh hưởng chế độ cắt",
      text: "• Ca-rô (Diamond): 2 bánh ép chéo (hoặc ren 2 chiều) → lực ép lớn nhất, tự giảm S/F và tăng số pass.\n• Thẳng (Straight): Rãnh song song trục Z.\n• Chéo (Diagonal): Răng nghiêng ăn êm, lực nhẹ nhất nên chạy được nhanh hơn.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="14" y="14" width="68" height="58" rx="4" fill="#f8fafc" stroke="#64748b"/>
        <line x1="14" y1="43" x2="82" y2="14" stroke="#d97706" stroke-width="1.5"/>
        <line x1="14" y1="72" x2="82" y2="43" stroke="#d97706" stroke-width="1.5"/>
        <line x1="14" y1="14" x2="82" y2="43" stroke="#d97706" stroke-width="1.5"/>
        <line x1="14" y1="43" x2="82" y2="72" stroke="#d97706" stroke-width="1.5"/>
        <text x="48" y="88" font-size="10" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Ca-rô</text>

        <rect x="96" y="14" width="68" height="58" rx="4" fill="#f8fafc" stroke="#64748b"/>
        <line x1="96" y1="26" x2="164" y2="26" stroke="#d97706" stroke-width="1.8"/>
        <line x1="96" y1="42" x2="164" y2="42" stroke="#d97706" stroke-width="1.8"/>
        <line x1="96" y1="58" x2="164" y2="58" stroke="#d97706" stroke-width="1.8"/>
        <text x="130" y="88" font-size="10" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Thẳng</text>

        <rect x="178" y="14" width="68" height="58" rx="4" fill="#f8fafc" stroke="#64748b"/>
        <line x1="178" y1="72" x2="218" y2="14" stroke="#d97706" stroke-width="1.8"/>
        <line x1="198" y1="72" x2="238" y2="14" stroke="#d97706" stroke-width="1.8"/>
        <line x1="218" y1="72" x2="246" y2="31" stroke="#d97706" stroke-width="1.8"/>
        <text x="212" y="88" font-size="10" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Chéo</text>
      </svg>`
    },
    pitch: {
      title: "Bước nhám Pitch P (mm) — Chuẩn DIN 82",
      text: "Khoảng cách giữa 2 đỉnh răng kế tiếp nhau (0.5 – 2.0 mm). Bước càng lớn thì chiều sâu răng càng lớn (≈ 0.45 × P) và lực ép tăng mạnh; nên chia nhiều lát cắt với bước ≥ 1.2 mm.",
      svg: `<svg viewBox="0 0 260 95">
        <polyline points="20,62 50,24 80,62 110,24 140,62 170,24 200,62 230,24" fill="none" stroke="#d97706" stroke-width="2.5"/>
        <line x1="50" y1="14" x2="110" y2="14" stroke="#0f172a" stroke-width="1.3"/>
        <line x1="50" y1="10" x2="50" y2="24" stroke="#64748b" stroke-dasharray="2,2"/>
        <line x1="110" y1="10" x2="110" y2="24" stroke="#64748b" stroke-dasharray="2,2"/>
        <text x="80" y="11" font-size="10.5" font-family="monospace" font-weight="700" fill="#0f172a" text-anchor="middle">Pitch P</text>
        <line x1="205" y1="24" x2="205" y2="62" stroke="#dc2626" stroke-width="1.4"/>
        <text x="211" y="47" font-size="10" font-family="monospace" font-weight="700" fill="#dc2626">≈0.45P</text>
        <text x="130" y="84" font-size="10" font-family="sans-serif" fill="#475569" text-anchor="middle">Khoảng cách đỉnh-đỉnh răng nhám</text>
      </svg>`
    },
    depthPerSide: {
      title: "Chiều sâu ăn X/bên & Chia lát (Passes)",
      text: "Lượng ăn dao hướng kính tính theo bán kính (mm). Tổng đường kính thay đổi là 2 × Chiều sâu. Chia nhiều pass giúp giảm tải cho trục chính và tránh mẻ răng trên thép cứng / Inox.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="25" y="34" width="210" height="36" fill="#e2e8f0" stroke="#475569"/>
        <line x1="25" y1="44" x2="235" y2="44" stroke="#0284c7" stroke-dasharray="4,3" stroke-width="1.3"/>
        <line x1="25" y1="54" x2="235" y2="54" stroke="#dc2626" stroke-width="1.6"/>
        <text x="65" y="41" font-size="9.5" font-family="monospace" fill="#0284c7">Pass 1</text>
        <text x="145" y="51" font-size="9.5" font-family="monospace" fill="#dc2626">Pass 2 (Đáy X_min)</text>
        <line x1="205" y1="34" x2="205" y2="54" stroke="#dc2626" stroke-width="1.6"/>
        <text x="210" y="26" font-size="10" font-family="monospace" fill="#dc2626" font-weight="700">Sâu/bên</text>
      </svg>`
    },
    wheelWidth: {
      title: "Bề rộng bánh lăn (mm)",
      text: "Chiều rộng mặt răng của bánh lăn (thường 6, 8, 10, 12 mm). Nếu đoạn cần lăn dài hơn bề rộng bánh lăn, bắt buộc phải dùng phương pháp Chạy dọc (Traverse).",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="30" y="50" width="200" height="28" fill="#e2e8f0" stroke="#475569"/>
        <rect x="95" y="18" width="56" height="26" rx="3" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
        <line x1="95" y1="11" x2="151" y2="11" stroke="#0f172a" stroke-width="1.3"/>
        <text x="123" y="9" font-size="10" font-family="monospace" font-weight="700" fill="#0f172a" text-anchor="middle">Rộng bánh (W)</text>
        <text x="130" y="90" font-size="10" font-family="sans-serif" fill="#475569" text-anchor="middle">Ép tại chỗ chỉ phủ được tối đa đúng bề rộng W</text>
      </svg>`
    },
    helixAngle: {
      title: "Góc xoắn α & Lead F (Dao ren 60°)",
      text: "Góc nghiêng rãnh xoắn so với trục Z. Góc 45° tạo ô ca-rô vuông đẹp nhất (Lead = π × D0). Góc 30° cho rãnh nghiêng thoải; 60° cho bước xoắn ngắn hơn giúp giảm tốc độ bàn trục Z.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="30" y="20" width="200" height="52" fill="#e2e8f0" stroke="#475569"/>
        <line x1="40" y1="46" x2="220" y2="46" stroke="#64748b" stroke-dasharray="5,3"/>
        <line x1="75" y1="72" x2="127" y2="20" stroke="#dc2626" stroke-width="2.2"/>
        <path d="M 122 46 A 20 20 0 0 0 115 32" fill="none" stroke="#0f172a" stroke-width="1.4"/>
        <text x="130" y="40" font-size="11" font-family="monospace" font-weight="700" fill="#0f172a">α = 45°</text>
        <text x="130" y="88" font-size="10" font-family="monospace" fill="#475569" text-anchor="middle">Lead F = π × D0 / tan(α)</text>
      </svg>`
    },
    threadIndexMode: {
      title: "Chia đầu mối G32: Góc pha Q vs Dịch Z_start",
      text: "• Góc pha Q: Dịch góc trục chính (0–360000 = 0–360°) ngay tại một điểm Z_start, không phải lùi dao xa (hỗ trợ Fanuc 0i-TF/TD, GSK980TDc).\n• Dịch Z_start: Dành cho máy đời cũ hoặc Mach3 không hỗ trợ Q.",
      svg: `<svg viewBox="0 0 260 95">
        <circle cx="65" cy="46" r="28" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/>
        <line x1="65" y1="46" x2="93" y2="46" stroke="#0284c7" stroke-width="1.6"/>
        <line x1="65" y1="46" x2="48" y2="24" stroke="#dc2626" stroke-width="1.8"/>
        <text x="65" y="88" font-size="9.5" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Góc pha Q (0.001°)</text>
        <rect x="135" y="34" width="110" height="28" fill="#e2e8f0" stroke="#475569"/>
        <line x1="215" y1="22" x2="215" y2="34" stroke="#0284c7" stroke-width="2"/>
        <line x1="230" y1="22" x2="230" y2="34" stroke="#dc2626" stroke-width="2"/>
        <line x1="215" y1="18" x2="230" y2="18" stroke="#0f172a" stroke-width="1.3"/>
        <text x="222" y="13" font-size="9.5" font-family="monospace" fill="#0f172a" text-anchor="middle">ΔZ</text>
        <text x="190" y="88" font-size="9.5" font-family="sans-serif" fill="#0f172a" text-anchor="middle" font-weight="600">Dịch Z_start</text>
      </svg>`
    },
    cuttingParams: {
      title: "Chế độ cắt: S (RPM), Fx, Fz & Dwell",
      text: "• S (RPM): Luôn dùng G97 vòng/phút cố định (không dùng G96).\n• Fx: Tốc độ ăn hướng kính (0.05–0.12 mm/v).\n• Fz: Tốc độ chạy dọc (0.12–0.30 mm/v).\n• Dwell: Dừng tại đáy 2–4 vòng để làm tròn đỉnh răng.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="40" y="34" width="150" height="36" fill="#e2e8f0" stroke="#475569"/>
        <path d="M 28 36 A 18 18 0 1 1 28 66" fill="none" stroke="#16a34a" stroke-width="2"/>
        <polygon points="24,64 32,68 27,72" fill="#16a34a"/>
        <text x="22" y="22" font-size="10" font-family="monospace" font-weight="700" fill="#16a34a">G97 S</text>
        <line x1="150" y1="10" x2="150" y2="32" stroke="#dc2626" stroke-width="2"/>
        <text x="156" y="22" font-size="10" font-family="monospace" font-weight="700" fill="#dc2626">Fx</text>
        <line x1="150" y1="32" x2="90" y2="32" stroke="#0284c7" stroke-width="2"/>
        <text x="118" y="26" font-size="10" font-family="monospace" font-weight="700" fill="#0284c7" text-anchor="middle">Fz</text>
        <text x="130" y="88" font-size="10" font-family="sans-serif" fill="#475569" text-anchor="middle">Dwell G04 quay 3 vòng làm mượt đỉnh răng</text>
      </svg>`
    },
    trackingBox: {
      title: "Kiểm tra khớp răng chu vi (Tracking)",
      text: "Chu vi phôi (π × D0) nên xấp xỉ bội số nguyên của bước nhám P để khi bánh lăn quay hết 1 vòng, răng ăn khớp lại đúng vào rãnh cũ — tránh hiện tượng răng kép / bóng ma.",
      svg: `<svg viewBox="0 0 260 95">
        <circle cx="65" cy="46" r="26" fill="#fef3c7" stroke="#16a34a" stroke-width="2" stroke-dasharray="4,2"/>
        <text x="65" y="50" font-size="10.5" font-family="monospace" font-weight="700" fill="#16a34a" text-anchor="middle">N = 94.0</text>
        <text x="65" y="87" font-size="9.5" font-family="sans-serif" fill="#16a34a" text-anchor="middle" font-weight="600">Khớp đều đẹp</text>
        <circle cx="190" cy="46" r="26" fill="#fee2e2" stroke="#dc2626" stroke-width="2" stroke-dasharray="6,2,2,2"/>
        <text x="190" y="50" font-size="10.5" font-family="monospace" font-weight="700" fill="#dc2626" text-anchor="middle">N = 94.45</text>
        <text x="190" y="87" font-size="9.5" font-family="sans-serif" fill="#dc2626" text-anchor="middle" font-weight="600">Dễ nhảy / bóng ma</text>
      </svg>`
    },
    gcodeToggles: {
      title: "Công tắc định dạng xuất G-Code",
      text: "• Số CT / G21... / G54 / Ghi chú: Tắt bớt khi muốn lấy đoạn lăn nhám ghép vào chương trình có sẵn.\n• Dấu ; đầu/cuối: Thêm dấu ; ở dòng đầu và dòng cuối để phân tách khối khi paste.\n• Số dòng N10: Tự đánh số N10, N20... cho từng câu lệnh.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="20" y="10" width="220" height="72" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
        <text x="32" y="27" font-size="10" font-family="monospace" fill="#64748b">;</text>
        <text x="32" y="41" font-size="10" font-family="monospace" fill="#0f172a">N10 T1010</text>
        <text x="32" y="55" font-size="10" font-family="monospace" fill="#0f172a">N20 G97 S320 M03</text>
        <text x="32" y="69" font-size="10" font-family="monospace" fill="#64748b">;</text>
      </svg>`
    },
    controller: {
      title: "Hệ điều khiển CNC",
      text: "• Fanuc / GSK / Mitsubishi: Dùng G99 (mm/vòng), G04 X (giây), hỗ trợ G32 Q & Macro.\n• Haas: Dùng G99, G04 P (ms).\n• Mach3 / LinuxCNC: Dùng G95 (mm/vòng), G04 P (ms), nên dùng Dịch Z_start cho G32.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="14" y="18" width="72" height="58" rx="6" fill="#f8fafc" stroke="#475569"/>
        <text x="50" y="43" font-size="10.5" font-family="monospace" font-weight="700" fill="#0f172a" text-anchor="middle">FANUC</text>
        <text x="50" y="59" font-size="9.5" font-family="monospace" fill="#64748b" text-anchor="middle">G99 · G04 X</text>
        <rect x="94" y="18" width="72" height="58" rx="6" fill="#f8fafc" stroke="#475569"/>
        <text x="130" y="43" font-size="10.5" font-family="monospace" font-weight="700" fill="#0f172a" text-anchor="middle">HAAS</text>
        <text x="130" y="59" font-size="9.5" font-family="monospace" fill="#64748b" text-anchor="middle">G99 · G04 P</text>
        <rect x="174" y="18" width="72" height="58" rx="6" fill="#f8fafc" stroke="#475569"/>
        <text x="210" y="43" font-size="10.5" font-family="monospace" font-weight="700" fill="#0f172a" text-anchor="middle">MACH3</text>
        <text x="210" y="59" font-size="9.5" font-family="monospace" fill="#64748b" text-anchor="middle">G95 · G04 P</text>
      </svg>`
    },
    material: {
      title: "Vật liệu phôi & Vận tốc cắt Vc",
      text: "Chọn vật liệu để tự động tính S (RPM), Fx, Fz và số lát cắt phù hợp:\n• Nhôm: 50 m/ph · Đồng: 45 m/ph\n• Thép mềm: 30 m/ph · C45: 22 m/ph\n• Inox 304: 15 m/ph (cần chia nhiều lát, tưới nguội kỹ).",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="20" y="16" width="220" height="62" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
        <rect x="32" y="28" width="160" height="8" rx="4" fill="#16a34a"/>
        <text x="200" y="35" font-size="9.5" font-family="monospace" fill="#0f172a">Al: 50</text>
        <rect x="32" y="43" width="105" height="8" rx="4" fill="#d97706"/>
        <text x="200" y="50" font-size="9.5" font-family="monospace" fill="#0f172a">Thép: 30</text>
        <rect x="32" y="58" width="55" height="8" rx="4" fill="#dc2626"/>
        <text x="200" y="65" font-size="9.5" font-family="monospace" fill="#0f172a">Inox: 15</text>
      </svg>`
    },
    preTurn: {
      title: "Tiện tinh D0 & vát mép đầu trước khi lăn",
      text: "Chèn nguyên công dao tiện tinh (vd T0101) tiện chuẩn đường kính D0 và vát mép đầu C trước khi sang dao lăn nhám, kèm lệnh M01 dừng kiểm tra kích thước phôi.",
      svg: `<svg viewBox="0 0 260 95">
        <rect x="30" y="26" width="175" height="44" fill="#e2e8f0" stroke="#475569"/>
        <polygon points="205,26 215,34 215,62 205,70" fill="#cbd5e1" stroke="#475569"/>
        <polygon points="220,14 236,14 214,32" fill="#fef3c7" stroke="#d97706" stroke-width="1.6"/>
        <text x="130" y="86" font-size="10" font-family="sans-serif" fill="#0f172a" text-anchor="middle">Vát mép C giúp bánh lăn vào phôi êm, không sứt răng</text>
      </svg>`
    },
    knurlZoom: {
      title: "Chiếu lưới nhám phóng đại (Zoom)",
      text: "Hiển thị hình dáng bề mặt lưới nhám sau khi gia công theo đúng kiểu hoa văn (Ca-rô / Thẳng / Chéo), góc nghiêng rãnh α và mật độ theo bước Pitch P.",
      svg: `<svg viewBox="0 0 260 95">
        <circle cx="130" cy="46" r="34" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <line x1="106" y1="22" x2="154" y2="70" stroke="#d97706" stroke-width="2"/>
        <line x1="154" y1="22" x2="106" y2="70" stroke="#d97706" stroke-width="2"/>
        <text x="130" y="90" font-size="10" font-family="sans-serif" fill="#475569" text-anchor="middle">Quan sát trực quan biên dạng răng</text>
      </svg>`
    }
  };

  const pop = document.createElement("div");
  pop.id = "helpPopover";
  pop.className = "help-popover";
  pop.innerHTML = `
    <div class="help-pop-head">
      <span class="help-badge">Ghi chú kỹ thuật</span>
      <strong id="helpPopTitle"></strong>
    </div>
    <p id="helpPopText" class="help-pop-text"></p>
    <div id="helpPopSvg" class="help-pop-svg"></div>
  `;
  document.body.appendChild(pop);

  let hoverTimer = null;
  let activeEl = null;

  function hideHelp() {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    activeEl = null;
    pop.classList.remove("show");
  }

  function positionPopover(target) {
    const rect = target.getBoundingClientRect();
    const popW = 340;
    const popH = pop.offsetHeight || 240;
    let left = rect.right + 12;
    if (left + popW > window.innerWidth - 12) {
      left = rect.left - popW - 12;
    }
    if (left < 12) {
      left = Math.max(12, Math.min(window.innerWidth - popW - 12, rect.left));
    }
    let top = rect.top;
    if (top + popH > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - popH - 12);
    }
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function showHelp(target, key) {
    const data = HELP_DATA[key];
    if (!data) return;
    $("helpPopTitle").textContent = data.title;
    $("helpPopText").textContent = data.text;
    $("helpPopSvg").innerHTML = data.svg;
    pop.classList.add("show");
    positionPopover(target);
  }

  const $ = (id) => document.getElementById(id);

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-help]");
    if (!target) return;
    if (activeEl === target) return;
    hideHelp();
    activeEl = target;
    const key = target.getAttribute("data-help");
    hoverTimer = setTimeout(() => {
      if (activeEl === target) showHelp(target, key);
    }, 3000);
  });

  document.addEventListener("mouseout", (e) => {
    if (!activeEl) return;
    const to = e.relatedTarget;
    if (to && (activeEl.contains(to) || pop.contains(to))) return;
    hideHelp();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideHelp();
  });
  window.addEventListener("scroll", hideHelp, { passive: true });
})();
