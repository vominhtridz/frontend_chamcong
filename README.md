

3. TÍCH HỢP BÊN THỨ BA (FACE-API & IMGBB)
Service ImgBB: Code một hàm uploadToImgBB(base64Image). Khi chụp ảnh từ Webcam, chuyển ảnh sang base64, ném cho hàm này gọi API ImgBB và trả về URL ảnh trực tiếp.

Service Face-API.js:

Load models (ssdMobilenetv1, faceLandmark68Net, faceRecognitionNet).

Hàm extractFaceDescriptor(imageVideoElement): Lấy ra mảng 128 thông số khuôn mặt.

Hàm compareFaces(descriptor1, descriptor2): Tính khoảng cách Euclidean. Nếu khoảng cách < 0.45 hoặc 0.4 (tùy độ khắt khe) thì là cùng 1 người.

4. CHI TIẾT CÁC TRANG DÀNH CHO ADMIN
1. Trang Dashboard (Tổng quan):

Thống kê: Tổng nhân viên, Số người đi làm hôm nay, Đi muộn, Vắng mặt.

Thông báo: Hiển thị popup hoặc badge nhắc nhở "Có X nhân viên mới chờ lấy mẫu khuôn mặt".

2. Trang Quản lý Nhân viên (CRUD Employee & Face):

Danh sách: Hiển thị nhân viên, trạng thái (Đã đăng ký mặt / Chưa).

Thêm/Sửa thông tin: Cập nhật tên, phòng ban.

Chức năng Đăng ký Khuôn mặt (Cực kỳ quan trọng):

Admin mở camera, yêu cầu nhân viên mới ngồi vào.

Chụp 1 ảnh tĩnh tải lên ImgBB làm profileImage.

Quét Face-API lấy 3-5 góc mặt khác nhau (trực diện, hơi nghiêng trái, nghiêng phải) -> Lưu mảng descriptors vào MongoDB.

Nút "Test Nhận Diện": Test thử ngay tại chỗ, nếu OK thì đổi trạng thái nhân viên thành Active và isFaceRegistered = true.


2. Trang Chấm công (Máy chấm công bằng Face-API) - CHỐNG MẠO DANH:
Trang này cần code rất chặt chẽ. Để đảm bảo "không mạo danh", bạn không thể chỉ dùng ảnh tĩnh (vì nhân viên có thể cầm điện thoại giơ ảnh của đồng nghiệp ra trước camera). Bạn phải làm Liveness Detection (Chống giả mạo thực thể):

Giao diện: Khung Camera lớn, có overlay khung viền khuôn mặt.

Luồng hoạt động (Code Frontend + Backend):

Check Liveness (Bắt buộc): Khi nhân viên đưa mặt vào, hệ thống yêu cầu một hành động ngẫu nhiên. Ví dụ: "Vui lòng chớp mắt 2 lần" hoặc "Quay đầu nhẹ sang trái". (Dùng faceLandmark68Net để bắt tọa độ mắt/mũi, tính toán tỷ lệ để biết họ có chớp mắt hay ngoảnh đầu thật không).

Trích xuất: Sau khi vượt qua bài test Liveness, tự động chụp 1 frame ảnh, trích xuất descriptor ngay trên Frontend (nhằm giảm tải cho server).

Gửi API Check-in: Gửi mảng descriptor này cùng Base64 của tấm ảnh đó xuống Backend.

Xác thực Backend (Bảo mật cao): Backend lấy descriptor này so sánh với toàn bộ faceData trong MongoDB. Nếu độ trùng khớp cao nhất và đạt chuẩn -> Xác định được nhân viên A.

Lưu ImgBB: Backend đẩy Base64 lên ImgBB lấy URL.

Ghi nhận DB: Lưu Log check-in gồm Giờ + URL ảnh. Trả về thông báo thành công cho Frontend kèm âm thanh "Tít! Xin chào Nguyễn Văn A".backend nodejs lưu ảnh vào imgbb api frontend vite react jsx  firebase database realtime 
=======
MỤC LỤC
LỜI CẢM ƠN
CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI
1.1. Đặt vấn đề và Lý do chọn đề tài 
1.2. Mục tiêu và phạm vi nghiên cứu
1.3. Đối tượng và phương pháp  nghiên cứu
1.4. Đặt vấn đề và tính cấp thiết
1.5. Ý nghĩa thực tiễn của đề tài 
CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ
2.1. Tổng quan về công nghệ nhận diện khuôn mặt
2.2. Nghiên cứu thư viện Face-API và Tensor-Flow.js
2.2.1.Mạng nơ-ron tích chập (CNN) cơ bản 
2.2.2.Thuật toán phát hiện khuôn mặt (SSD MobileNet V1) 
2.2.3.Thuật toán trích xuất đặc trưng (ResNet-34) 
2.3. Kiến trúc Backend với Node.js và mô hình MVC
2.4. Công nghệ Frontend: React.js và Single Page Application
2.5. Cơ sở dữ liệu đám mây (Firebase Realtime Database) 
2.6. Quy trình xử lý ảnh và Img-API
CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG
3.1. Phân tích yêu cầu hệ thống
3.2. Thiết kế Kiến trúc hệ thống tổng thể
3.3. Thiết kế Cơ sở dữ liệu (Collections và Ràng buộc)
3.4. Thiết kế RESTful API (Endpoints và Luồng dữ liệu)
3.5. Lưu đồ thuật toán chấm công
3.6. Thiết kế giao diện (UI/UX)
3.7.Biểu đồ Use-case (Use-case Diagram): Chức năng của Admin, Nhân viên 
3.8. Biểu đồ tuần tự (Sequence Diagram) 
CHƯƠNG 4. XÂY DỰNG VÀ TRIỂN KHAI HỆ THỐNG
4.1. Cấu trúc mã nguồn (Frontend/Backend)
4.2. Hiện thực hóa mô hình MVC và Middleware
4.3. Tích hợp Face-API: Thuật toán đăng ký và đối sánh khuôn mặt
4.4. Cơ chế đồng bộ dữ liệu Realtime
4.5. Cấu hình triển khai trên Render Cloud
4.6. Xử lý luồng Camera trực tiếp (Live Stream WebRTC/getUserMedia API). 
4.7. Giao diện website hoàn chỉnh
CHƯƠNG 5. KIỂM THỬ VÀ ĐÁNH GIÁ
5.1. Kịch bản kiểm thử (Test cases)
5.2. Đánh giá hiệu năng (Độ trễ, Độ chính xác)
5.3. Thảo luận về các thách thức kỹ thuật

CHƯƠNG 6. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

PHỤ LỤC: Các đoạn code quan trọng và danh mục hình ảnh.

