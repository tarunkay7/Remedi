import json
import logging
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        # Twilio credentials stored as environment variables
        TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
        TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
        TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

        # Debug logs (careful not to expose full credentials)
        logger.info(f"Account SID prefix: {TWILIO_ACCOUNT_SID[:6] if TWILIO_ACCOUNT_SID else 'None'}")
        logger.info(f"Auth Token length: {len(TWILIO_AUTH_TOKEN) if TWILIO_AUTH_TOKEN else 0}")
        logger.info(f"Phone Number: {TWILIO_PHONE_NUMBER}")

        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
            raise ValueError("Twilio credentials are not set in environment variables")

        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            # Verify credentials with a test API call
            client.api.accounts(TWILIO_ACCOUNT_SID).fetch()
        except TwilioRestException as te:
            logger.error(f"Twilio authentication failed: {te.msg}")
            return {
                "statusCode": te.status,
                "body": json.dumps({"error": f"Twilio authentication failed: {te.msg}"})
            }

        # Directly access the event data without expecting it inside "Records"
        phone_number = event["phoneNumber"]
        medicine_name = event["medicineName"]
        time_of_day = event["time_of_day"]
        food_relationship = event["food_relationship"]
        dosage = event["dosage"]
        time = event["time"]

        # Log the extracted values for debugging
        logger.info(f"Extracted values: {phone_number}, {medicine_name}, {time_of_day}, {food_relationship}, {dosage}, {time}")

        sms_body = (
            f"Reminder: Take your {medicine_name} at {time} ({time_of_day}). "
            f"Dosage: {dosage}. {food_relationship}"
        )

        message = client.messages.create(
            body=sms_body,
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )

        logger.info(f"SMS sent to {phone_number} with SID: {message.sid}")

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "SMS sent successfully"})
        }

    except Exception as e:
        logger.error(f"Error sending SMS: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
