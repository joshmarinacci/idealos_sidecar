import './App.css';
import {useEffect, useState} from 'react'

const on = (elm, type, cb) => elm.addEventListener(type,cb)
function log(...args) { console.log(...args) }


class Connection {
    constructor() {
        this.listeners = {}
        this.connected = false
        this.apps = []
    }
    isConnected() {
        return this.connected
    }
    disconnect() {
        this.socket.close()
    }
    connect() {
        this.socket = new WebSocket("ws://localhost:8081")
        on(this.socket,'open',()=>{
            log("connected to the server")
            this.connected = true
            this.socket.send(JSON.stringify({type:"DEBUG_LIST", sender:'DEBUG_CLIENT'}))
            this.fire("connect",{})
        })
        on(this.socket,'error',(e)=> log("error",e))
        on(this.socket, 'close',(e)=>{
            log("closed",e)
            this.connected = false
            this.fire("disconnect",{})
        })
        on(this.socket,'message',(e)=>{
            // log("incoming message",e)
            let msg = JSON.parse(e.data)
            log("message arrived",msg)
            if(msg.type === 'DEBUG_LIST_RESPONSE') {
                this.apps = msg.apps
                this.fire("apps", this.apps)
            }
        })
    }
    on(type,cb) {
        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(cb)
    }

    fire(type, payload) {
        if(!this.listeners[type]) this.listeners[type] = []
        console.log("firing",this.listeners[type])
        this.listeners[type].forEach(l => l(payload))
    }
}

let conn = new Connection()

function ConnectStatus({connected}) {
  return <div>
      <div>connect status = {connected?"true":"false"}</div>
      <button onClick={()=>{
          if(conn.isConnected()) {
              conn.disconnect()
          }else {
              conn.connect()
          }
      }}>{connected?"disconnect":"connect"}</button>
  </div>
}

function make_connection() {
}

function AppList({apps}) {
    return <ul>
        {apps.map(app => {
            return <li key={app.id}>{app.name} <button>restart</button></li>
        })}
    </ul>
}

function App() {
    let [connected, set_connected] = useState(false)
    let [apps, set_apps] = useState([])
    useEffect(()=> {
        console.log("===== refreshing the app")
        conn.on('connect', () => set_connected(true));
        conn.on('disconnect', () => set_connected(false));
        conn.on("apps",(apps)=>set_apps(apps))
    },[])
    return <div>
        <ConnectStatus connected={connected}/>
        <AppList apps={apps}/>
    </div>
}

export default App;
