# Use AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.9

# Copy requirements file
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install dependencies
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy function code
COPY messaging.py ${LAMBDA_TASK_ROOT}

# Set the handler
CMD ["messaging.lambda_handler"]