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

  const styles = {
    container: { maxWidth: '400px', margin: '100px auto', fontFamily: 'sans-serif', padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { textAlign: 'center', color: '#333', marginBottom: '25px' },
    inputGroup: { marginBottom: '20px', position: 'relative' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#555' },
    input: { width: '100%', padding: '12px', paddingRight: '40px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '15px' },
    eyeButton: { position: 'absolute', right: '10px', top: '35px', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px' },
    submitBtn: { width: '100%', padding: '12px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' },
    linkText: { display: 'block', textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#1976d2', textDecoration: 'none' },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Đăng Nhập</h2>
      <form onSubmit={handleSubmit}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required style={styles.input} placeholder="Nhập email..." />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Mật khẩu</label>
          <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required style={styles.input} placeholder="Nhập mật khẩu..." />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>

      <Link to="/register" style={styles.linkText}>Chưa có tài khoản? Đăng ký ngay</Link>
      <Link to="/forgot-password" style={styles.linkText}>Quên mật khẩu?</Link>
    </div>
  );
};

export default Login;
