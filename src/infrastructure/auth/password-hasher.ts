import bcrypt from 'bcrypt';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

export const PasswordHasher = {
  /**
   * Sinh mã băm (Hash) từ một chuỗi mật khẩu gốc
   * Dùng để mã hóa mật khẩu trước khi lưu vào database
   * @param password Mật khẩu gốc
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  /**
   * Kiểm tra mật khẩu gốc có khớp với mã băm trong database không
   * @param password Mật khẩu gốc nhập từ người dùng
   * @param hash Mã băm lưu trong cơ sở dữ liệu
   */
  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
};
