import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosClient from '../api/axiosClient';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axiosClient.post('/api/auth/forgot-password', { email });
      toast.success(response.data.message);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

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
        newPassword,
      });
      toast.success(response.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mã OTP sai hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Quên Mật Khẩu</h2>

        {step === 1 ? (
          <>
            <p className="auth-subtitle">Nhập email của bạn để nhận mã xác nhận (OTP)</p>
            <form onSubmit={handleRequestOTP}>
              <div className="auth-field">
                <label>Email đăng nhập</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Ví dụ: nhanvien@gmail.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="auth-submit"
                style={{ backgroundColor: '#f57c00' }}
              >
                {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              Mã OTP đã được gửi đến: <strong>{email}</strong>
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="auth-field">
                <label>Mã xác nhận (OTP)</label>
                <input
                  type="text"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  style={{
                    textAlign: 'center',
                    letterSpacing: '3px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    paddingRight: '0.75rem',
                  }}
                  placeholder="------"
                />
              </div>
              <div className="auth-field">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu mới"
                  style={{ paddingRight: '0.75rem' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="auth-submit"
                style={{ backgroundColor: '#4caf50' }}
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
              </button>
            </form>
          </>
        )}

        <Link to="/login" className="auth-link">
          Quay lại trang Đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
