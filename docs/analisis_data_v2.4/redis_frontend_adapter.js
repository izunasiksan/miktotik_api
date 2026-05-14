import axios from 'axios';

/**
 * Redis Adapter v2.4 (Frontend/React)
 * Digunakan untuk Caching & Session Management via Backend Proxy (API V2)
 * Frontend tidak boleh mengakses Redis secara langsung (Security Best Practice)
 */
const RedisAdapter = {
  /**
   * Simpan data ke Cache (via Backend Proxy)
   * @param {string} key - Identifier data (misal: 'analysis_result_123')
   * @param {any} value - Data yang akan disimpan
   * @param {number} ttl - Time To Live dalam detik (Default: 3600)
   */
  async set(key, value, ttl = 3600) {
    try {
      const response = await axios.post('/api/v2/cache/set', {
        key: `fe_v24_${key}`, // Prefix v2.4 untuk menghindari tabrakan
        value,
        ttl
      });
      return response.data;
    } catch (error) {
      console.error('❌ Redis Adapter Set Error:', error);
      throw error;
    }
  },

  /**
   * Ambil data dari Cache
   * @param {string} key 
   */
  async get(key) {
    try {
      const response = await axios.get(`/api/v2/cache/get/${key}`);
      return response.data;
    } catch (error) {
      console.error('❌ Redis Adapter Get Error:', error);
      return null;
    }
  },

  /**
   * Hapus data dari Cache
   * @param {string} key 
   */
  async del(key) {
    try {
      await axios.delete(`/api/v2/cache/del/${key}`);
      return true;
    } catch (error) {
      console.error('❌ Redis Adapter Del Error:', error);
      return false;
    }
  }
};

export default RedisAdapter;
