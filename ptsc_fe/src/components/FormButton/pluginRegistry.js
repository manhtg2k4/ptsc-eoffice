/**
 * Plugin Registry System for FormButton
 * 
 * Hệ thống này tự động load tất cả các file *.plugin.js trong thư mục plugins/
 * và cung cấp API để render các custom dialogs/components
 * 
 * @example
 * // Tạo plugin mới trong plugins/myDialog.plugin.js
 * export default {
 *   name: 'MyDialog',
 *   component: MyDialogComponent,
 *   mapProps: (openDialog, allProps) => ({ ... })
 * }
 * 
 * // Plugin sẽ tự động được load và có thể sử dụng
 * setOpenDialog({ MyDialog: true });
 */

class PluginRegistry {
  constructor() {
    this.plugins = new Map();
    this.loadPlugins();
  }

  /**
   * Tự động load tất cả plugins từ thư mục plugins/
   * Sử dụng webpack's require.context để auto-discovery
   */
  loadPlugins() {
    try {
      // eslint-disable-next-line no-undef
      const pluginContext = require.context('./plugins', false, /\.plugin\.js$/);
      
      pluginContext.keys().forEach((key) => {
        try {
          const plugin = pluginContext(key).default;
          
          // Validate plugin structure
          if (!plugin || !plugin.name) {
            logger.warn(`Plugin ${key} không có tên hoặc export default hợp lệ`);
            return;
          }

          // Check for duplicate plugin names
          if (this.plugins.has(plugin.name)) {
            logger.warn(`Plugin "${plugin.name}" đã tồn tại, bỏ qua ${key}`);
            return;
          }

          // Register plugin
          this.plugins.set(plugin.name, plugin);
          // logger.log(`✓ Đã load plugin: ${plugin.name}`);
        } catch (error) {
          logger.error(`Lỗi khi load plugin ${key}:`, error);
        }
      });
    } catch (error) {
      // Nếu thư mục plugins chưa tồn tại hoặc không có file nào
      logger.info('Chưa có plugin nào được tìm thấy trong thư mục plugins/');
    }
  }

  /**
   * Lấy tất cả plugins đã đăng ký
   * @returns {Map} Map của các plugins
   */
  getAllPlugins() {
    return this.plugins;
  }

  /**
   * Lấy một plugin theo tên
   * @param {string} name - Tên plugin
   * @returns {Object|null} Plugin object hoặc null nếu không tìm thấy
   */
  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Đăng ký plugin thủ công (không thông qua file)
   * @param {Object} plugin - Plugin object với structure: { name, component, mapProps? }
   * @returns {boolean} True nếu thành công, false nếu thất bại
   */
  registerPlugin(plugin) {
    if (!plugin || !plugin.name) {
      logger.error('Plugin phải có thuộc tính "name"');
      return false;
    }

    if (this.plugins.has(plugin.name)) {
      logger.warn(`Plugin "${plugin.name}" đã tồn tại, sẽ ghi đè`);
    }

    this.plugins.set(plugin.name, plugin);
    logger.log(`✓ Đã đăng ký plugin: ${plugin.name}`);
    return true;
  }

  /**
   * Xóa plugin khỏi registry
   * @param {string} name - Tên plugin
   * @returns {boolean} True nếu xóa thành công, false nếu plugin không tồn tại
   */
  unregisterPlugin(name) {
    const result = this.plugins.delete(name);
    if (result) {
      logger.log(`✓ Đã xóa plugin: ${name}`);
    }
    return result;
  }

  /**
   * Kiểm tra xem plugin đã được đăng ký chưa
   * @param {string} name - Tên plugin
   * @returns {boolean} True nếu plugin tồn tại
   */
  hasPlugin(name) {
    return this.plugins.has(name);
  }

  /**
   * Lấy số lượng plugins đã đăng ký
   * @returns {number} Số lượng plugins
   */
  getPluginCount() {
    return this.plugins.size;
  }

  /**
   * Lấy danh sách tên tất cả plugins
   * @returns {Array<string>} Mảng tên plugins
   */
  getPluginNames() {
    return Array.from(this.plugins.keys());
  }
}

// Export singleton instance
const pluginRegistry = new PluginRegistry();

export default pluginRegistry;
