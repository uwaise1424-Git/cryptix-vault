import json
import boto3
import os
import uuid
from botocore.client import Config

# Force the region and endpoint URL to bypass the 307 Redirect loop!
s3_client = boto3.client(
    's3', 
    region_name='ap-southeast-2', 
    endpoint_url='https://s3.ap-southeast-2.amazonaws.com',
    config=Config(signature_version='s3v4')
)

BUCKET_NAME = os.environ.get('BUCKET_NAME')

def lambda_handler(event, context):
    try:
        raw_body = event.get('body')
        if not raw_body:
            raw_body = '{}'
            
        body = json.loads(raw_body)
        
        # Check if the frontend wants to upload or download (defaults to upload)
        action = body.get('action', 'upload')
        
        if not BUCKET_NAME:
            raise ValueError("BUCKET_NAME environment variable is missing!")

        if action == 'upload':
            filename = body.get('filename', 'encrypted-file.cryptix')
            file_key = f"vault/{uuid.uuid4()}-{filename}"
            
            # Generate the secure pre-signed PUT URL
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': BUCKET_NAME,
                    'Key': file_key,
                    'ContentType': 'application/octet-stream'
                },
                ExpiresIn=300
            )
            
        elif action == 'download':
            file_key = body.get('fileKey')
            if not file_key:
                raise ValueError("Missing fileKey for download request!")
                
            # Generate the secure pre-signed GET URL
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': BUCKET_NAME,
                    'Key': file_key
                },
                ExpiresIn=300
            )
            
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            'body': json.dumps({
                'url': presigned_url,
                'fileKey': file_key,
                'status': 'SUCCESS'
            })
        }
        
    except Exception as e:
        print(f"CRASH LOG: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            'body': json.dumps({'error': str(e), 'message': 'Lambda crashed'})
        }