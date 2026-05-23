import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosClient from '../api/axiosClient';

const ForgotPassword = () => {
  const navigate = useNavigate();
  
  // Trạng thái quản lý các bước (1: Nhập Email | 2: Nhập OTP & Pass mới)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Bước 1: Gửi yêu cầu lấy mã OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axiosClient.post('/api/auth/forgot-password', { email });
      toast.success(response.data.message);
      setStep(2); // Chuyển sang bước 2
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác nhận đổi mật khẩu
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.warning('Mật khẩu phải có ít nhất 6 ký tự!');
    }

    setLoading(true);
    try {
      const response = await axiosClient.post('/api/auth/reset-password', {
        email,
        otp,
        newPassword
      });
      toast.success(response.data.message);
      
      // Thành công thì chuyển về trang đăng nhập
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mã OTP sai hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  // --- Styles ---
  const styles = {
    container: { maxWidth: '400px', margin: '100px auto', fontFamily: 'sans-serif', padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { textAlign: 'center', color: '#333', marginBottom: '10px' },
    subtitle: { textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '25px' },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#555' },
    input: { width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '15px' },
    submitBtn: { width: '100%', padding: '12px', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' },
    linkText: { display: 'block', textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#1976d2', textDecoration: 'none' }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Quên Mật Khẩu</h2>

      {step === 1 ? (
        // UI BƯỚC 1
        <>
          <p style={styles.subtitle}>Nhập email của bạn để nhận mã xác nhận (OTP)</p>
          <form onSubmit={handleRequestOTP}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email đăng nhập</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={styles.input} 
                placeholder="Ví dụ: nhanvien@gmail.com" 
              />
            </div>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
            </button>
          </form>
        </>
      ) : (
        // UI BƯỚC 2
        <>
          <p style={styles.subtitle}>Mã OTP đã được gửi đến: <strong>{email}</strong></p>
          <form onSubmit={handleResetPassword}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Mã xác nhận (OTP)</label>
              <input 
                type="text" 
                maxLength="6"
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                required 
                style={{...styles.input, textAlign: 'center', letterSpacing: '3px', fontSize: '18px', fontWeight: 'bold'}} 
                placeholder="------" 
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Mật khẩu mới</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                style={styles.input} 
                placeholder="Nhập mật khẩu mới" 
              />
            </div>
            <button type="submit" disabled={loading} style={{...styles.submitBtn, backgroundColor: '#4caf50'}}>
              {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
            </button>
          </form>
        </>
      )}

      <Link to="/login" style={styles.linkText}>Quay lại trang Đăng nhập</Link>
    </div>
  );
};

export default ForgotPassword;