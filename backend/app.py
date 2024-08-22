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
            
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    logging.info(colored(f"Chunk: {content}", "cyan"))
                    yield content
                    time.sleep(0.01)  # Add a small delay between characters
        except Exception as e:
            logging.error(colored(f"Error processing chat request: {str(e)}", "red"))
            yield "An error occurred while processing your request"

    return Response(stream_with_context(generate()), content_type='text/plain')

if __name__ == '__main__':
    logging.info(colored("Starting Flask app...", "cyan"))
    app.run(debug=True)


# So in the Interface panel I'd have an agent that runs the below prompt, showing the ADD/DELETE/REPLACE changes,
# These should be formatted in a particular way: ```ADD would spin out an embedded code visualiser for the user to see, and ``` would return to normal text

# Then in the gantt panel there would be the agent that spins out the various agents, like the coder agent.

# This means the interface panel will also have tabs, where each tab is a different agent, and the gantt panel will have a tab for each agent that is spun out.
# A gantt chart will be generated based on the reports and jobs that get spun out and responded to. 





# PROMPT for code editor:

# 1. CODE ANALYSIS:
#    The current code sets up a Flask application with a single route '/api/chat' that processes user messages using the OpenAI API. It streams the response back to the client.

# 2. GOAL/BUGG DESCRIPTION:
#    Add error logging and implement rate limiting for the API calls.

# 3. PROPOSED CHANGES:

# --- ADD:
# ADD 3:
# import time
# from flask_limiter import Limiter
# from flask_limiter.util import get_remote_address
# END_ADD
# Explanation: Import necessary modules for rate limiting.

# --- ADD:
# ADD 16:
# # Configure rate limiter
# limiter = Limiter(app, key_func=get_remote_address)
# END_ADD
# Explanation: Initialize the rate limiter.

# --- REPLACE:
# ADD 26:
# @app.route('/api/chat', methods=['POST'])
# @limiter.limit("5 per minute")
# def chat():
#     start_time = time.time()
#     logging.info(colored("Received request to /api/chat", "cyan"))
# END_ADD
# DELETE 25-27
# Explanation: Add rate limiting decorator and start time logging.

# --- ADD:
# ADD 59:
#     logging.info(colored(f"Request processed in {time.time() - start_time:.2f} seconds", "cyan"))
# END_ADD
# Explanation: Log the total processing time for each request.

# 4. OVERALL EXPLANATION:
#    These changes implement rate limiting to prevent abuse of the API and add more comprehensive logging. We've added a rate limit of 5 requests per minute per IP address. We've also added timing information to log how long each request takes to process.

# 5. VERIFICATION:
#    To verify these changes:
#    1. Test the API by sending more than 5 requests in a minute from the same IP. The 6th request should be rate limited.
#    2. Check the logs to ensure that start and end times are being logged for each request.
#    3. Intentionally cause an error (e.g., by providing invalid input) and verify that it's properly logged.

# [Maybe include a simple demo]



# Prompt for general assistant

# You are an advanced AI project manager and task delegator. Your role is to analyze user requests, determine the necessary tools and agents to complete the task, and coordinate their efforts. You should also create and maintain a Gantt chart to track all ongoing jobs. Respond using the following structure:

# 1. REQUEST ANALYSIS:
#    Briefly describe your understanding of the user's request.

# 2. TASK BREAKDOWN:
#    List the subtasks required to fulfill the request.

# 3. AGENT DELEGATION:
#    For each subtask that requires an agent, create a report in the following format:

#    ```REPORT
#    AGENT: [Agent Name]
#    JOB: [Detailed job description]
#    ESTIMATED TIME: [Time in hours]
#    DEPENDENCIES: [List any jobs this task depends on, if any]
#    ```

# Possible agents include, but are not limited to:

# - Code Editor
# - Report Writer
# - Data Analyst
# - UI/UX Designer
# - Testing Engineer

# 4. TOOL UTILIZATION:
# - If any specific tools are needed, specify them and their purpose.

# 5. GANTT CHART UPDATE:
# - Provide a text-based representation of the Gantt chart for all current jobs, including the new ones. Use the following format:

# ```[Agent Name]: [Job Description]
# Start: [Start Date/Time]
# Duration: [Estimated Duration]
# Dependencies: [Job IDs of dependencies, if any]
# ```

# 6. NEXT STEPS:
# Outline the immediate next steps and any instructions for the user.

# Remember:

# Be precise and detailed in your job descriptions for each agent.
# Ensure that the Gantt chart accurately reflects all current jobs and their dependencies.
# If a request doesn't require multiple agents or tools, explain why and provide a direct solution if possible.

# Now, please analyze the following request and respond accordingly:

# [INSERT USER REQUEST HERE]

# [Also include a demo]         