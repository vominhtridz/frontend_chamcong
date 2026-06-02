import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { getHomePath, getStoredUser, persistUser } from '../utils/auth';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = getStoredUser();
    if (token && user) {
      navigate(getHomePath(user), { replace: true });
    }
  }, [navigate]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      try {
        response = await axiosClient.post('/api/auth/login', formData);
      } catch (employeeErr) {
        const status = employeeErr.response?.status;
        if (status !== 400 && status !== 401) throw employeeErr;

        const adminRes = await axiosClient.post('/api/auth/admin-login', formData);
        const { token, admin } = adminRes.data;
        localStorage.setItem('token', token);
        persistUser({ ...admin, role: 'Admin' });
        toast.success('Đăng nhập Admin thành công!');
        navigate(getHomePath({ ...admin, role: 'Admin' }));
        return;
      }

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      persistUser(user);

      toast.success('Đăng nhập thành công!');

      if (user.status === 'Pending' || !user.isFaceRegistered) {
        toast.info('Tài khoản giới hạn. Chờ Admin duyệt và đăng ký khuôn mặt.');
      }

      navigate(getHomePath(user));
    } catch (error) {
      const networkMsg =
        !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')
          ? 'Không kết nối được máy chủ. Kiểm tra backend (port 5000) và cùng Wi-Fi với máy tính.'
          : null;
      toast.error(error.response?.data?.message || networkMsg || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Đăng Nhập</h2>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Nhập email..."
            />
          </div>

          <div className="auth-field">
            <label>Mật khẩu</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Nhập mật khẩu..."
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-eye"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit"
            style={{ backgroundColor: '#4caf50' }}
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <Link to="/register" className="auth-link">
          Chưa có tài khoản? Đăng ký ngay
        </Link>
        <Link to="/forgot-password" className="auth-link">
          Quên mật khẩu?
        </Link>
      </div>
    </div>
  );
};

export default Login;
