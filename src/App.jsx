import OpenAI from 'openai';
import { useState, useRef, useEffect } from "react"

// Initialize OpenAI instance
const openai = new OpenAI({
  baseURL: 'http://127.0.0.1:1234/v1',
  apiKey: 'random',
  dangerouslyAllowBrowser: true,
});

// Check if message is from bot
function isBotMessage(chatMessage) {
  return chatMessage.role === 'assistant'
}

// Process bot response by removing asterisks and adding line breaks
function processBotResponse(response) {
  // Remove asterisks
  let processed = response.replace(/\*/g, '').trim()
  return processed.trim()
}

function App() {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const chatContainerRef = useRef(null)

  // Scroll to bottom when chat updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory, currentStreamingMessage])

  // Handle form submission
  const submitForm = async (e) => {
    e.preventDefault()
    if (!message.trim() || isProcessing) return

    setIsProcessing(true)
    const userMessage = { role: 'user', content: message }
    setMessage('')
    setCurrentStreamingMessage('')
    
    try {
      // Add user message immediately
      setChatHistory(prev => [...prev, userMessage])

      // Call the API with streaming enabled
      const stream = await openai.chat.completions.create({
        messages: [...chatHistory, userMessage],
        model: 'lmstudio-community/llama-3.2-3b-instruct',
        stream: true,
      });

      let fullResponse = ''
      
      // Process the stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        fullResponse += content
        setCurrentStreamingMessage(processBotResponse(fullResponse))
      }

      // Add the complete message to chat history
      const processedResponse = processBotResponse(fullResponse)
      const botMessage = { role: 'assistant', content: processedResponse }
      setChatHistory(prev => [...prev, botMessage])
      setCurrentStreamingMessage('')
      
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = { role: 'assistant', content: 'Sorry, there was an error processing your request.' }
      setChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-gray-100 h-screen flex flex-col">
      <div className="container mx-auto p-4 flex flex-col h-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">ChatUI</h1>

        <div className="flex-grow overflow-y-auto mt-4 bg-white rounded shadow p-4" ref={chatContainerRef}>
          {chatHistory.map((chatMessage, i) => (
            <div key={i} className={`mb-4 flex ${isBotMessage(chatMessage) ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] ${isBotMessage(chatMessage) ? 'bg-green-100' : 'bg-blue-100'} p-3 rounded-lg`}>
                <p className="text-base whitespace-pre-wrap">{chatMessage.content}</p>
              </div>
            </div>
          ))}
          
          {/* Show streaming message */}
          {currentStreamingMessage && (
            <div className="mb-4 flex justify-end">
              <div className="max-w-[70%] bg-green-100 p-3 rounded-lg">
                <p className="text-base whitespace-pre-wrap">{currentStreamingMessage}</p>
              </div>
            </div>
          )}
        </div>

        <form className="flex mt-2" onSubmit={submitForm}>
          <input 
            type="text" 
            placeholder="Ask me anything..."
            value={message} 
            onChange={e => setMessage(e.target.value)}
            className="flex-grow p-2 rounded-l border border-gray-300"
            disabled={isProcessing}
          />
          <button 
            type="submit"
            className={`px-4 py-2 rounded-r text-white ${isProcessing ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'}`}
            disabled={isProcessing}
          >
            {isProcessing ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
