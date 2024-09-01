import os
import json
import requests
import logging
import time
import backoff
from flask import Flask, request, jsonify, Response, stream_with_context
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

@app.route('/api/chat', methods=['POST'])
def chat():
    logging.info(colored("Received request to /api/chat", "cyan"))
    data = request.json
    if not data or 'messages' not in data:
        logging.error(colored("Invalid request: 'messages' not found in request data", "red"))
        return jsonify(error="Invalid request"), 400

    messages = data['messages']
    logging.info(colored(f"Received {len(messages)} messages", "green"))
    logging.info(colored(f"Messages: {messages}", "cyan"))

    def generate():
        try:
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                stream=True
            )
            
            output = []
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    # logging.info(colored(f"Chunk: {content}", "cyan"))
                    output.append(content)
                    yield content
                    time.sleep(0.01)  # Add a small delay between characters

            logging.info(colored(output, "green"))
            
        except Exception as e:
            logging.error(colored(f"Error processing chat request: {str(e)}", "red"))
            yield "An error occurred while processing your request"

    return Response(stream_with_context(generate()), content_type='text/plain')

if __name__ == '__main__':
    logging.info(colored("Starting Flask app...", "cyan"))
    app.run(debug=True)