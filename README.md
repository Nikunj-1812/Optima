project-root/
|-- backend/
|   |-- app.py                  # Flask/FastAPI entry point
|   |-- config.py               # DB + API key config
|   |-- requirements.txt
|   |-- routes/
|   |   |-- auth_routes.py       # login, signup, logout
|   |   |-- analyze_routes.py    # complexity + optimize
|   |   |-- execute_routes.py    # run code (Judge0/Piston)
|   |   |-- abtest_routes.py     # A/B comparison
|   |   |-- questions_routes.py  # interview questions
|   |   |-- pattern_routes.py    # pattern recognition
|   |   |-- debug_routes.py      # debug suggestions
|   |   |-- learn_routes.py      # learn module + progress
|   |-- services/
|   |   |-- claude_service.py    # Claude API wrapper
|   |   |-- executor_service.py  # Judge0/Piston wrapper
|   |   |-- auth_service.py      # session/JWT handling
|   |-- models/
|   |   |-- user.py
|   |   |-- submission.py
|   |   |-- ab_test.py
|   |   |-- question.py
|   |   |-- pattern.py
|   |   |-- debug_session.py
|   |   |-- learn_progress.py
|   |-- db/
|       |-- schema.sql           # PostgreSQL schema
|       |-- db_connection.py
|
|-- frontend/
|   |-- index.html               # landing / redirect
|   |-- login.html
|   |-- signup.html
|   |-- dashboard.html
|   |-- ide.html
|   |-- learn.html
|   |-- css/
|   |   |-- style.css            # global styles
|   |   |-- dashboard.css
|   |   |-- ide.css
|   |-- js/
|       |-- auth.js              # login/signup/logout logic
|       |-- dashboard.js
|       |-- ide.js               # Monaco setup, run, analyze
|       |-- abtest.js
|       |-- questions.js
|       |-- pattern.js
|       |-- debug.js
|       |-- learn.js
|       |-- api.js               # fetch() wrapper for backend calls
|
|-- README.md



Database Schema (PostgreSQL)
users
  id, name, email, password_hash, created_at
 
submissions
  id, user_id, language, code,
  time_complexity, space_complexity,
  optimized_code, created_at
 
ab_tests
  id, user_id, code_a, code_b,
  result_json, created_at
 
questions
  id, submission_id, question_text,
  user_answer, ai_feedback
 
patterns
  id, submission_id, pattern_name, confidence
 
debug_sessions
  id, submission_id, error_type, suggestion
 
learn_progress
  id, user_id, topic, status
