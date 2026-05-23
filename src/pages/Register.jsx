import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password.length < 6) {
      toast.warning('Mật khẩu phải có ít nhất 6 ký tự!');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!');
      setLoading(false);
      return;
    }

    try {
      const response = await axiosClient.post('/api/auth/register', formData);
      toast.success(response.data.message);
      setFormData({ email: '', password: '', confirmPassword: '' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: { maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { textAlign: 'center', color: '#333', marginBottom: '20px' },
    inputGroup: { marginBottom: '15px', position: 'relative' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#555' },
    input: { width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '15px' },
    eyeButton: { position: 'absolute', right: '10px', top: '32px', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px' },
    submitBtn: { width: '100%', padding: '12px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', opacity: loading ? 0.7 : 1, marginTop: '10px' },
    linkText: { display: 'block', textAlign: 'center', marginTop: '15px', fontSize: '14px', color: '#1976d2', textDecoration: 'none' },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Đăng ký tài khoản</h2>

      <form onSubmit={handleSubmit}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Nhập email..."
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Mật khẩu</label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Tạo mật khẩu (ít nhất 6 ký tự)"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Xác nhận mật khẩu</label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Nhập lại mật khẩu"
          />
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>

      <Link to="/login" style={styles.linkText}>
        Đã có tài khoản? Đăng nhập ngay
      </Link>
    </div>
  );
};

export default Register;
