module.exports = function authorize(requiredPermission) {
    return async (req, res, next) => {
      try {
        const catalystApp = req.catalystApp;
  
        /**
         * STEP 0: Get current logged-in user from Catalyst
         */
        const currentUser = await catalystApp
          .userManagement()
          .getCurrentUser();
  
        const user_id = currentUser.user_id;
        const org_id = currentUser.org_id;
       
        if (!user_id || !org_id) {
          return res.status(401).json({
            success: false,
            message: "Missing authentication or organization context",
          });
        }
  
        const zcql = catalystApp.zcql();
  
        /**
         * STEP 1: Fetch roles assigned to user in org
         */
        const roleQuery = `
          SELECT role_id
          FROM user_roles
          WHERE user_id = '${user_id}'
          AND org_id = '${org_id}'
        `;
  
        const roleResult = await zcql.executeZCQLQuery(roleQuery);
  
        if (!roleResult.length) {
          return res.status(403).json({
            success: false,
            message: "No role assigned to this user",
          });
        }
  
        const roleIds = roleResult
          .map(r => `'${r.user_roles.role_id}'`)
          .join(",");
  
        /**
         * STEP 2: Permission validation
         */
        const permQuery = `
          SELECT permission_key
          FROM role_permissions
          WHERE role_id IN (${roleIds})
          AND permission_key = '${requiredPermission}'
        `;
  
        const permResult = await zcql.executeZCQLQuery(permQuery);
  
        if (!permResult.length) {
          return res.status(403).json({
            success: false,
            message: "Permission denied",
          });
        }
  
        /**
         * STEP 3: Attach context for controllers (optional but recommended)
         */
        req.auth = {
          user_id,
          org_id,
          roles: roleResult.map(r => r.user_roles.role_id),
        };
  
        next();
  
      } catch (error) {
        console.error("RBAC Authorization Error:", error);
        return res.status(500).json({
          success: false,
          message: "Authorization failed",
        });
      }
    };
  };
  