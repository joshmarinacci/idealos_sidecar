import './App.css'
import {Connection} from './connection.js'
import {MessageList} from './messageview.js'
import {ConnectStatus} from './connectionview.js'
import {AppList} from './appsview.js'
import {DisplayView} from './DisplayView.js'
import {Manager} from './WindowManager.js'
import {useState} from 'react'

let condo = new Connection()
const manager = new Manager()
condo.window_manager = manager

class PerformanceTracker {
    constructor() {
        this.messages = {}
    }
    send(msg) {
        // console.log("sending out",msg)
        this.messages[msg.id] = Date.now()
    }
    draw_rect(msg) {
        if(msg.trigger) {
            // console.log("draw rect with trigger received",msg)
            if(!this.messages[msg.trigger]) {
                // console.log("missing original")
            } else {
                let start = this.messages[msg.trigger]
                let now = Date.now()
                // console.log("comparing to", now-start)
            }
        }
    }
}

const tracker = new PerformanceTracker()
condo.tracker = tracker

function App() {
    let [messages, set_messages] = useState(true)
    let cols = '0.5fr 1fr 1fr'
    if(!messages) {
        cols = '0.5fr 1fr'
    }
    return <div className={'mainapp'} style={{
        'grid-template-columns': cols,
    }}>
        <ConnectStatus connection={condo}/>
        <div className={'actions-panel'}>
            <button onClick={()=>set_messages(!messages)}>show messages</button>
            <button onClick={()=> condo.send_redraw_windows_request()}>refresh windows</button>
        </div>
        <AppList connection={condo}/>
        <DisplayView connection={condo} manager={manager} tracker={tracker}/>
        <MessageList connection={condo} visible={messages}/>
    </div>
}

export default App;
