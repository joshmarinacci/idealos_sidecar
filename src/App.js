import './App.css'
import {Connection} from './connection.js'
import {MessageList} from './messageview.js'
import {ConnectStatus} from './connectionview.js'
import {AppList} from './appsview.js'

let condo = new Connection()

function App() {
    return <div>
        <ConnectStatus connection={condo}/>
        <AppList connection={condo}/>
        <MessageList connection={condo}/>
    </div>
}

export default App;
