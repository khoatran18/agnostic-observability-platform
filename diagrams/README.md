# 🔍 Cơ chế & Thứ tự kiểm tra Anomaly Detection

Tài liệu này giải thích chi tiết logic hoạt động của động cơ phát hiện bất thường (`AnomalyEngine`), quy trình kiểm tra chỉ số và sự khác biệt khi bật/tắt các chiến lược **Threshold Strategy** và **MAD Strategy**.

---

## 1. Mạch logic tổng quan (`AnomalyEngine`)

Mỗi 10 giây, chỉ số của từng node được đưa vào `_evaluate_resource()`.

Ngưỡng an toàn cơ sở được định nghĩa là **MAD Boundary**:
$$\text{MAD Boundary} = \frac{2}{3} \times Th_1$$
*(Mặc định $Th_1 = 0.55 \Rightarrow \text{MAD Boundary} \approx 0.3667$)*

### Thứ tự các bước kiểm tra trong code:
1. **Kiểm tra MAD Strategy** (nếu `MAD_enabled = True`):
   - Gọi `MadStrategy.evaluate()` để truy vấn lịch sử 5 phút từ Prometheus và tính điểm **Modified Z-Score**.
   - Trả về biến boolean `is_mad_triggered`.
2. **Kiểm tra ngưỡng Hồi phục / Giá trị thấp (`value < Th1`)**:
   - Nếu trước đó node đang bị theo dõi vi phạm (`tracker_key` tồn tại): Xóa tracker và phát tín hiệu **`recovered`** (Hệ thống quay về bình thường).
   - Nếu `value < MAD Boundary` và `is_mad_triggered = False`: Trả về **`NORMAL`** (không gửi cảnh báo).
   - Nếu `value >= MAD Boundary` hoặc `is_mad_triggered = True`: Trả về **`SPIKE_MAD_SAFE`** (vẫn coi là an toàn, không gửi cảnh báo).
3. **Kiểm tra Threshold Strategy** (khi `value >= Th1` và `Threshold_enabled = True`):
   - Cập nhật thời gian vi phạm tích lũy (duration).
   - Quyết định mức cảnh báo (**`warning`** hoặc **`alert`**).

---

## 2. Chi tiết thứ tự kiểm tra & Hành vi trong 3 Trường hợp

### 🔷 Trường hợp 1: Chỉ bật Threshold Strategy (`Threshold = True`, `MAD = False`)

Trong trường hợp này, `is_mad_triggered` luôn bằng `False`.

- **Quy trình kiểm tra**:
  1. Khi `value < Th1`:
     - Nếu node đang bị theo dõi vi phạm $\rightarrow$ Phát tín hiệu **`recovered`** $\rightarrow$ Gửi thông báo hệ thống đã bình thường.
     - Nếu node không bị theo dõi $\rightarrow$ Trả về `NORMAL` (không gửi thông báo).
  2. Khi `value >= Th1`:
     - **Lần đầu vượt ngưỡng ($Th_1$ hoặc $Th_2$)**: Ghi nhận thời điểm bắt đầu vi phạm (`start_time`), trả về kịch bản **`warning`** $\rightarrow$ **Gửi thông báo WARNING**.
     - **Duy trì vi phạm $< 30$ giây**: Tiếp tục trả về **`warning`** (bị khống chế tần suất gửi - throttle mỗi 20s) $\rightarrow$ Không gửi trùng lặp liên tục.
     - **Duy trì vi phạm $\ge 30$ giây**:
       - Nếu vi phạm ngưỡng cao $Th_2$ ($\ge 0.75$): Leo thang thành **`alert`** $\rightarrow$ **Gửi thông báo ALERT nguy hiểm (Th2 Danger)**.
       - Nếu chỉ vi phạm ngưỡng thấp $Th_1$ ($0.55 \le \text{value} < 0.75$): Do MAD bị TẮT (`is_mad_triggered = False`), vi phạm $Th_1$ **không bao giờ leo thang thành ALERT nguy hiểm**, mà chỉ tiếp tục giữ mức **`warning`** (duy trì cảnh báo vàng).

---

### 🔶 Trường hợp 2: Chỉ bật MAD Strategy (`Threshold = False`, `MAD = True`)

Trong trường hợp này, `th_enabled = False`.

- **Quy trình kiểm tra**:
  1. Khi chỉ số được gửi vào, `MadStrategy.evaluate()` truy vấn 5 phút lịch sử, tính $\text{MAD} = \text{median}(|x_i - \text{median}|)$ và điểm $\text{Modified Z-Score} = 0.6745 \times \frac{\text{current\_value} - \text{median}}{\text{MAD}}$.
  2. Nếu $|\text{Modified Z-Score}| > k$ (mặc định $k = 3.0$): `is_mad_triggered = True`.
  3. **Đánh giá đầu ra**:
     - Do Threshold Strategy bị TẮT, động cơ **không theo dõi thời gian vi phạm (duration)** và **không có ngưỡng $Th_2$**.
     - Nếu `is_mad_triggered = True`: Động cơ ghi nhận kịch bản `SPIKE_MAD_SAFE`.
     - **Kết quả gửi thông báo**: `notification_type` trả về `None` $\rightarrow$ **KHÔNG GỬI THÔNG BÁO BẢO ĐỘNG**.
- **Ý nghĩa**: Khi chỉ bật MAD, hệ thống hoạt động ở chế độ *giám sát ngầm* (passive observation). MAD tự nó chỉ đóng vai trò phân tích thống kê biến động bất thường chứ không đứng độc lập để phát cảnh báo đẩy ra ngoài.

---

### 🟢 Trường hợp 3: Bật CẢ 2 Strategy (`Threshold = True`, `MAD = True`) — *Chế độ phối hợp chuẩn*

Đây là chế độ hoạt động tối ưu nhất của hệ thống, kết hợp giữa **ngưỡng cố định** và **biến động thống kê**.

- **Quy trình kiểm tra & Phối hợp**:
  1. **Tín hiệu xác nhận (Confirmation Signal)**:
     - Khi $Th_1 \le \text{value} < Th_2$ và thời gian duy trì vi phạm $\ge 30$ giây:
       - Nếu `is_mad_triggered = True` (MAD xác nhận đây là đột biến thống kê thực sự chứ không phải tăng đều ổn định) $\Rightarrow$ **Leo thang ngay thành `ALERT` nguy hiểm (Th1 Danger)** $\rightarrow$ **Gửi thông báo ALERT**.
       - Nếu `is_mad_triggered = False` (chỉ số vượt $Th_1$ nhưng biến động đồng đều với lịch sử) $\Rightarrow$ **Giữ ở mức `WARNING`** $\rightarrow$ **Gửi thông báo WARNING**.
  2. **Ngưỡng nguy cơ cao $Th_2$**:
     - Khi $\text{value} \ge Th_2$ và duy trì $\ge 30$ giây $\Rightarrow$ **Luôn nâng cấp thành `ALERT` nguy hiểm (Th2 Danger)** mà không phụ thuộc vào kết quả MAD.

---

## 📊 Bảng so sánh tổng hợp sự khác biệt

| Tiêu chí | 1. Chỉ bật Threshold | 2. Chỉ bật MAD | 3. Bật CẢ 2 (Threshold + MAD) |
| :--- | :--- | :--- | :--- |
| **Cơ sở phát hiện** | Ngưỡng tuyệt đối ($Th_1, Th_2$) | Biến động thống kê (Z-Score) | Ngưỡng tuyệt đối + Điểm lệch thống kê |
| **Tính thời gian (Duration $\ge 30s$)** | Có | Không | Có |
| **Khi $Th_1 \le \text{value} < Th_2$ duy trì $\ge 30s$** | Chỉ phát **WARNING** | Không phát thông báo | Phát **ALERT** nếu MAD xác nhận, ngược lại phát **WARNING** |
| **Khi $\text{value} \ge Th_2$ duy trì $\ge 30s$** | Phát **ALERT** | Không phát thông báo | Phát **ALERT** |
| **Lọc nhiễu / Tăng đột ngột** | Dễ bị nhiễu nếu $Th_1$ đặt thấp | Chỉ phát hiện outlier ngầm | Tối ưu: Dùng MAD để lọc nhiễu cho $Th_1$ |
| **Gửi thông báo (Telegram/Gmail/Webhook)** | Có (Warning & Alert) | **Không gửi** (`notification_type = None`) | Có (Warning & Alert) |
