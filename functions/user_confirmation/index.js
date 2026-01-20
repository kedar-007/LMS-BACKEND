/**
 * @param {import('./types/event').EventDetails} event
 * @param {import('./types/event').Context} context
 * 
 */
const catalyst = require("zcatalyst-sdk-node");
module.exports = async (event, context) => {
	try {
	  const catalystApp = context.catalystApp;
	  const app = catalyst.initialize(context);
	  const datastore = app.datastore();
	  const zcql = app.zcql();
  
	  const userDetails = event.getData();
  
	  console.log("USER_DETAILS ---", userDetails);
  
	  // 1️⃣ Safety check
	  if (!userDetails || userDetails.is_confirmed !== true) {
		console.log("User not confirmed. Skipping...");
		return context.closeWithSuccess();
	  }
  
	  const { user_id,email_id } = userDetails;
  
	  // 2️⃣ Fetch user from users table using auth_user_id
	  const fetchUserQuery = `
		SELECT ROWID, status 
		FROM users 
		WHERE auth_user_id = ${user_id}
		LIMIT 1
	  `;
  
	  const userResult = await zcql.executeZCQLQuery(fetchUserQuery);
	  console.log("USER_RESULT",userResult);
  
	  if (!userResult || userResult.length === 0) {
		console.log("User not found in users table");
		return context.closeWithSuccess();
	  }
  
	  const userRow = userResult[0].users;
	  const usersRowId = userRow.ROWID;
  
	  // 3️Update ONLY status
	  const usersTable = datastore.table("users");
  
	  const updated = await usersTable.updateRow({
		ROWID: usersRowId,
		status: "ACTIVE",
	  });
	  
	  console.log("UPDATED_DATA--",updated);
	  console.log(`User ${email_id} status updated to ACTIVE`);
  
	//   //Insert audit log
	//   const logsTable = datastore.table("user_activity_logs");
  
	//   await logsTable.insertRow({
	// 	user_id: usersRowId,          // DataStore ROWID
	// 	auth_user_id: user_id,        // Zoho auth user id
	// 	zuid: zuid,
	// 	org_id: org_id,
	// 	event_type: "USER_CONFIRMED",
	// 	event_source: event.getSource(), // UserManagement
	// 	platform: data.platform_type,
	// 	description: "User confirmed signup and account activated",
	// 	event_time: new Date(event.getTime())
	//   });
  
	//   console.log("Confirmation event logged");
  
	  context.closeWithSuccess();
	} catch (err) {
	  console.error("Event function failed:", err);
	  context.closeWithFailure();
	}
  };
  