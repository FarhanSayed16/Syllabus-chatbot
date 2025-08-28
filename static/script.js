document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const typingIndicator = document.getElementById('typing-indicator');

    let sessionId = crypto.randomUUID();

    // --- Theme Management ---
    const applyTheme = (theme) => {
        document.body.classList.toggle('dark-theme', theme === 'dark');
    };

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);


    // --- Core Chat Functions ---
   // Replace the existing addMessage function in script.js
const addMessage = (sender, text) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender === 'user' ? 'user-msg' : 'bot-msg');
    
    // Use the 'marked' library to render markdown
    messageElement.innerHTML = marked.parse(text); 
    
    // Find all code blocks (<pre><code>) within the message and add a copy button
    messageElement.querySelectorAll('pre').forEach(pre => {
        const button = document.createElement('button');
        button.classList.add('copy-code-btn');
        button.innerText = 'Copy';
        
        button.addEventListener('click', () => {
            const code = pre.querySelector('code').innerText;
            navigator.clipboard.writeText(code);
            button.innerText = 'Copied!';
            setTimeout(() => {
                button.innerText = 'Copy';
            }, 2000);
        });
        
        pre.appendChild(button);
    });
    
    chatContainer.appendChild(messageElement);
    scrollToBottom();
    return messageElement;
};

    const scrollToBottom = () => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    const askBot = async () => {
        const query = userInput.value.trim();
        if (!query) return;

        addMessage('user', query);
        userInput.value = '';
        sendBtn.disabled = true;
        typingIndicator.style.display = 'flex'; // Show typing indicator

        try {
            const response = await fetch('http://127.0.0.1:8000/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, session_id: sessionId })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            typingIndicator.style.display = 'none'; // Hide typing indicator
            const botMessageElement = addMessage('bot', ''); // Create empty bot message

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                
                if (chunk.startsWith("SOURCES::")) {
                    const sourcesJson = chunk.substring(9);
                    const sources = JSON.parse(sourcesJson);
                    displaySources(botMessageElement, sources);
                } else {
                    fullResponse += chunk;
                    botMessageElement.innerHTML = marked.parse(fullResponse); // Update with rendered markdown
                    scrollToBottom();
                }
            }
        } catch (error) {
            typingIndicator.style.display = 'none';
            addMessage('bot', 'Sorry, something went wrong. Please check the server and try again.');
            console.error('Error:', error);
        } finally {
            sendBtn.disabled = false;
            userInput.focus();
        }
    };

    const displaySources = (messageElement, sources) => {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.classList.add('sources-container');
        sourcesDiv.innerHTML = '<strong>Sources:</strong>';
        
        const sourcesList = document.createElement('ul');
        sources.forEach(source => {
            const li = document.createElement('li');
            const filename = source.split(/[\\/]/).pop();
            li.innerText = filename;
            sourcesList.appendChild(li);
        });
        sourcesDiv.appendChild(sourcesList);
        messageElement.appendChild(sourcesDiv);
        scrollToBottom();
    };

    // --- Event Listeners ---
    sendBtn.addEventListener('click', askBot);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askBot();
    });
    
    newChatBtn.addEventListener('click', () => {
        chatContainer.innerHTML = '';
        sessionId = crypto.randomUUID();
    });

    // Add a welcome message
    addMessage('bot', 'Hello! How can I help you with your syllabus today?');
});
// Add this to the bottom of script.js
const scrollToBottomBtn = document.getElementById('scroll-to-bottom');

// Show or hide the button based on scroll position
chatContainer.addEventListener('scroll', () => {
    const isScrolledToBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 1;
    if (isScrolledToBottom) {
        scrollToBottomBtn.classList.remove('visible');
    } else {
        scrollToBottomBtn.classList.add('visible');
    }
});

// Click event for the button
scrollToBottomBtn.addEventListener('click', scrollToBottom);