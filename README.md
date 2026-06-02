
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