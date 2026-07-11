import React from 'react'
import { Bot , User,SendHorizontal } from 'lucide-react';
import "../styles/chatWindow.scss"
const chatWindow = () => {
  return (
    <div className="chatWindow">
        <div className="nav-bar">
            <div className="icon">
                <Bot/>
                <p> IRIS</p>
            </div>
            <div className="user-icon">
                <User/>
            </div>            
        </div>
        <div className="chat-input">
            <div className="box">
                <input type="text" placeholder="Type your message" />
                <SendHorizontal/>
            </div>
            <p>IRIS can make small Mistakes</p>
        </div>
    </div>
  )
}

export default chatWindow