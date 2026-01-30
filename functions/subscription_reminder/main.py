import sys
sys.path.insert(0, 'lib')

import logging
import traceback
from datetime import datetime, date
import zcatalyst_sdk
import json

# ================== CONFIG ==================
ORG_ADMIN_ROLE = "17682000000568001"
NOTIFY_DAYS = [6, 3, 1]
FROM_EMAIL = "catalystadmin@dsv360.ai"
RENEWAL_LINK = "https://app.yourdomain.com/billing"

# ================== HANDLER ==================
def handler(cron_details, context):
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    logger.info("🔔 Subscription Reminder Cron STARTED")

    try:
        # --------------------------------------------------
        # 1️⃣ Initialize Catalyst
        # --------------------------------------------------
        logger.info("🔧 Initializing Catalyst SDK")
        app = zcatalyst_sdk.initialize()
        logger.info("✅ Catalyst SDK initialized")

        zcql = app.zcql()
        email_service = app.email()
        logger.info("✅ ZCQL & Email services initialized")

        today = date.today()
        logger.info(f"📅 Today: {today}")

        # --------------------------------------------------
        # 2️⃣ Fetch Active Subscriptions
        # --------------------------------------------------
        logger.info("📦 Fetching ACTIVE subscriptions")

        subscriptions = zcql.execute_query("""
            SELECT ROWID, plan_id, org_id, end_date,
                   billing_cycle, price_at_purchase, currency
            FROM subscriptions
            WHERE subscription_status = 'ACTIVE'
        """)

        if not subscriptions:
            logger.warning("⚠️ No ACTIVE subscriptions found")
            context.close_with_success()
            return

        logger.info(f"📊 Total ACTIVE subscriptions fetched: {len(subscriptions)}")
        logger.info(f"📄 Subscriptions raw data:\n{json.dumps(subscriptions, indent=2)}")

        # --------------------------------------------------
        # 3️⃣ Process Each Subscription
        # --------------------------------------------------
        for index, row in enumerate(subscriptions, start=1):
            logger.info(f"➡️ Processing subscription #{index}")

            sub = row.get("subscriptions")
            if not sub:
                logger.warning("⚠️ Missing subscriptions object")
                continue

            logger.info(f"📄 Subscription data:\n{json.dumps(sub, indent=2)}")

            if not sub.get("end_date"):
                logger.warning("⚠️ end_date is NULL, skipping")
                continue

            end_date = datetime.strptime(sub["end_date"], "%Y-%m-%d").date()
            days_left = (end_date - today).days

            logger.info(
                f"⏳ Org:{sub['org_id']} | Plan:{sub['plan_id']} | Days left:{days_left}"
            )

            if days_left not in NOTIFY_DAYS:
                logger.info("⏭️ Not a notification day, skipping")
                continue

            # --------------------------------------------------
            # 4️⃣ Fetch Plan Details
            # --------------------------------------------------
            logger.info(f"📘 Fetching plan details for Plan ID: {sub['plan_id']}")

            plan_result = zcql.execute_query(f"""
                SELECT plan_name, price, billing_cycle
                FROM plans
                WHERE ROWID = {sub['plan_id']}
                  AND is_active = true
            """)

            if not plan_result:
                logger.error("❌ Plan not found or inactive")
                continue

            logger.info(f"📄 Plan raw data:\n{json.dumps(plan_result, indent=2)}")

            plan = plan_result[0]["plans"]
            logger.info(
                f"📘 Plan Found: {plan['plan_name']} | {plan['price']} | {plan['billing_cycle']}"
            )

            # --------------------------------------------------
            # 5️⃣ Fetch Org Admin Users
            # --------------------------------------------------
            logger.info(f"👤 Fetching Org Admin users for Org ID: {sub['org_id']}")

            admins = zcql.execute_query(f"""
                SELECT name, email
                FROM users
                WHERE org_id = {sub['org_id']}
                  AND role = '{ORG_ADMIN_ROLE}'
                  AND status = 'ACTIVE'
            """)

            if not admins:
                logger.warning("⚠️ No active org admins found")
                continue

            logger.info(f"👥 Org Admins count: {len(admins)}")
            logger.info(f"📄 Org Admins raw data:\n{json.dumps(admins, indent=2)}")

            # --------------------------------------------------
            # 6️⃣ Send Emails
            # --------------------------------------------------
            for admin_index, admin in enumerate(admins, start=1):
                user = admin.get("users")
                if not user:
                    logger.warning("⚠️ Invalid users row")
                    continue

                logger.info(f"📧 [{admin_index}] Preparing email for {user['email']}")
                logger.info(f"📄 Email user data:\n{json.dumps(user, indent=2)}")

                html_body = f"""
                <html>
                <body style="font-family:Arial,sans-serif;">
                  <h3>⚠️ Subscription Expiry Reminder</h3>

                  <p>Hi <b>{user['name']}</b>,</p>

                  <p>
                    Your subscription plan <b>{plan['plan_name']}</b>
                    will expire in <b>{days_left} day(s)</b>.
                  </p>

                  <table cellpadding="6" cellspacing="0" border="1">
                    <tr><td><b>Plan</b></td><td>{plan['plan_name']}</td></tr>
                    <tr><td><b>Price</b></td><td>{plan['price']} {sub['currency']}</td></tr>
                    <tr><td><b>Billing Cycle</b></td><td>{plan['billing_cycle']}</td></tr>
                    <tr><td><b>Expiry Date</b></td><td>{end_date.strftime('%d %b %Y')}</td></tr>
                  </table>

                  <p style="margin-top:15px;">
                    <a href="{RENEWAL_LINK}">👉 Renew Subscription</a>
                  </p>

                  <p>Regards,<br><b>Support Team</b></p>
                </body>
                </html>
                """

                # ✅ CORRECT Python SDK email format
                mail_obj = {
                    "from_email": FROM_EMAIL,
                    "to_email": [user["email"]],
                    "subject": f"⚠️ Subscription Expiring in {days_left} Day(s)",
                    "content": html_body,
                    "html_mode": True
                }

                logger.info(f"📨 Sending email payload:\n{json.dumps(mail_obj, indent=2)}")

                response = email_service.send_mail(mail_obj)

                logger.info(f"✅ Email sent successfully to {user['email']}")
                logger.info(f"📩 Email response: {response}")

        # --------------------------------------------------
        # 7️⃣ Success
        # --------------------------------------------------
        logger.info("✅ Subscription Reminder Cron COMPLETED SUCCESSFULLY")
        context.close_with_success()

    except Exception:
        logger.error(
            "❌ Subscription Reminder Cron FAILED\n%s",
            traceback.format_exc()
        )
        context.close_with_failure()
