export const RbacService = {
  /**
   * Kiểm tra xem user có đủ tất cả các required permissions không
   * @param userPermissions Danh sách permission hiện tại của user
   * @param requiredPermissions Danh sách permission yêu cầu
   * @returns boolean
   */
  hasPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    
    // Kiểm tra phải có đầy đủ
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  },

  /**
   * Kiểm tra xem user có 1 trong các permission yêu cầu không
   */
  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  },
  
  /**
   * Kiểm tra xem role của user có khớp với các required roles không
   */
  hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    return requiredRoles.some(role => userRoles.includes(role));
  }
};
