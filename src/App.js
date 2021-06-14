import './App.css'
import {Connection} from './connection.js'
import {MessageList} from './messageview.js'
import {ConnectStatus} from './connectionview.js'
import {AppList} from './appsview.js'
import {DisplayView} from './DisplayView.js'
import {Manager} from './WindowManager.js'

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

function ActionsPanel({connection}) {
    return <div className={"actions-panel"}>
        <button onClick={()=>{
            connection.send_redraw_windows_request()
        }
        }>refresh windows</button>
    </div>
}

function App() {
    return <div className={'mainapp'}>
        <ConnectStatus connection={condo}/>
        <ActionsPanel connection={condo}/>
        <AppList connection={condo}/>
        <DisplayView connection={condo} manager={manager} tracker={tracker}/>
        <MessageList connection={condo}/>
    </div>
}

export default App;
