@echo off
echo ===================================================
echo      SYLLABUS CHATBOT SETUP & LAUNCHER (WINDOWS)
echo ===================================================

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not found. Please install Python 3 and add it to your PATH.
    pause
    exit /b
)

:: 1. Create a virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

:: 2. Activate the environment and install requirements
echo Activating environment and installing packages...
call venv\Scripts\activate.bat
pip install -r requirements.txt

:: 3. Run ingestion script if the database doesn't exist
if not exist db (
    echo Database not found. Running ingestion script...
    python ingest.py
) else (
    echo Database found. Skipping ingestion.
)

:: 4. Start the chatbot server
echo ===================================================
echo  Setup complete! Starting the chatbot server now.
echo  Make sure Ollama is running in the background.
echo  Open index.html in your browser to start chatting.
echo ===================================================
uvicorn main:app --reload

pause