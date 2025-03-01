import json
import base64
import logging
import os
from io import BytesIO
import tempfile
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel
from google import genai
logger = logging.getLogger()
logger.setLevel(logging.INFO)  # Set logging level

class FoodRelationship(str, Enum):
    BEFORE_FOOD = "before_food"
    AFTER_FOOD = "after_food"

class TimingsRelationship(str, Enum):
    MORNING = "morning"
    NOON = "noon"
    EVENING = "evening"
    NIGHT = "night"

class Medication(BaseModel):
    medicine_name: str
    time_of_day: TimingsRelationship
    number_of_days: int
    food_relationship: FoodRelationship
    dosage: int

class MedicalInfoModel(BaseModel):
    medications: List[Medication]

def lambda_handler(event, context):
    try:
        logger.info("Lambda function started")
        logger.info(f"Received event: {json.dumps(event)}")

        # Get the image data from the request body (Correct Way)
        if 'isBase64Encoded' in event and event['isBase64Encoded']:
            image_data = base64.b64decode(event['body'])

        # Extract filename (if provided)
        filename = 'prescription.png'  # Default filename
        if 'headers' in event:
            content_disposition = event['headers'].get('Content-Disposition')
            if content_disposition:
                try:
                    filename = content_disposition.split('filename=')[1]
                except IndexError:
                    logger.warning("Filename not found in Content-Disposition header")
            
            # For Content-Type
            content_type = event['headers'].get('Content-Type')
            logger.info(f"Content-Type: {content_type}")

        logger.info(f"Processing image with filename: {filename}")

        # Initialize the Gemini client
        try:
            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                logger.error("GEMINI_API_KEY environment variable not set")
                raise ValueError("GEMINI_API_KEY environment variable not set")
            logger.info("Initializing Gemini client")
            client = genai.Client(api_key=api_key)
            logger.info("Initialized Gemini client successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {str(e)}")
            raise

        # Process the image with Gemini
        try:
            # Save image data to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp_file:
                BytesIO(image_data).seek(0)
                tmp_file.write(image_data)
                tmp_file.flush()
                logger.info(f"Saved image to temporary file: {tmp_file.name}")

                try:
                    # Upload the file to Gemini
                    logger.info("Uploading file to Gemini API")
                    file = client.files.upload(file=tmp_file.name)
                    logger.info("File uploaded successfully to Gemini")

                    # Create the content prompt
                    content = """You need to be my pharmacist and extract the important information related to my medicines in the prescription."""
                    
                    logger.info("Generating content with Gemini API")
                    response = client.models.generate_content(
                        model='gemini-2.0-pro-exp-02-05',
                        contents=[content, file],
                        config=genai.types.GenerateContentConfig(
                            response_mime_type='application/json',
                            response_schema=MedicalInfoModel,
                            temperature=0
                        ),
                    )
                    logger.info("Successfully received response from Gemini API")

                    # Parse the response
                    med_info = response.text
                    med_info_parsed = json.loads(med_info)
                    logger.info(f"Parsed medication info: {json.dumps(med_info_parsed)}")

                finally:
                    # Clean up the temporary file
                    os.unlink(tmp_file.name)
                    logger.info("Cleaned up temporary file")

                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'medications': med_info_parsed,
                        'filename': filename
                    })
                }

        except Exception as e:
            logger.error(f"Error processing image with Gemini: {str(e)}")
            raise

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }