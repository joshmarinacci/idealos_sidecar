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
        <DisplayView connection={condo} manager={manager}/>
        <MessageList connection={condo}/>
    </div>
}

export default App;
