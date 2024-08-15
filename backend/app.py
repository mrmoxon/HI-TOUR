import os
import json
import requests
import logging
import time
import backoff
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai
from termcolor import colored

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

# OpenAI API configuration
API_KEY = os.getenv("OPENAI_APIKEY")
if not API_KEY:
    logging.error(colored("OPENAI_APIKEY not found in environment variables", "red"))
    raise ValueError("OPENAI_APIKEY not set")

openai_client = openai.Client(api_key=API_KEY)

MAX_RETRIES = 5
RETRY_DELAY = 5

@backoff.on_exception(backoff.expo, openai.RateLimitError, max_tries=MAX_RETRIES)
def make_openai_request(messages):
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        return response.choices[0].message.content
    except openai.RateLimitError:
        logging.warning(colored("Rate limit exceeded. Retrying...", "orange"))
        raise
    except Exception as e:
        logging.error(colored(f"Error making OpenAI request: {str(e)}", "red"))
        raise

@app.route('/api/hello', methods=['GET'])
def hello():
    logging.info(colored("Received request to /api/hello", "cyan"))
    return jsonify(message="Hello from the backend!")

@app.route('/api/chat', methods=['POST'])
def chat():
    logging.info(colored("Received request to /api/chat", "cyan"))
    data = request.json
    if not data or 'message' not in data:
        logging.error(colored("Invalid request: 'message' not found in request data", "red"))
        return jsonify(error="Invalid request"), 400

    user_message = data['message']
    logging.info(colored(f"User message: {user_message}", "green"))

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": user_message}
    ]

    try:
        ai_response = make_openai_request(messages)
        logging.info(colored(f"AI response: {ai_response}", "green"))
        return jsonify(response=ai_response)
    except Exception as e:
        logging.error(colored(f"Error processing chat request: {str(e)}", "red"))
        return jsonify(error="An error occurred while processing your request"), 500

if __name__ == '__main__':
    logging.info(colored("Starting Flask app...", "cyan"))
    app.run(debug=True)