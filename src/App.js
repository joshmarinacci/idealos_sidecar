import './App.css';
import {useEffect, useState} from 'react'

const on = (elm, type, cb) => elm.addEventListener(type,cb)
function log(...args) { console.log(...args) }


class Connection {
    constructor() {
        this.listeners = {}
        this.connected = false
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
            this.socket.send(JSON.stringify({type:"DEBUG_LIST"}))
            this.fire("connect",{})
        })
        on(this.socket,'error',(e)=> log("error",e))
        on(this.socket, 'close',(e)=>{
            log("closed",e)
            this.connected = false
            this.fire("disconnect",{})
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

function App() {
    let [connected, set_connected] = useState(false)
    useEffect(()=> {
        console.log("===== refreshing the app")
        conn.on('connect', () => set_connected(true));
        conn.on('disconnect', () => set_connected(false));
    },[])
    return <div>
    <ConnectStatus connected={connected}/>
    </div>
}

export default App;
