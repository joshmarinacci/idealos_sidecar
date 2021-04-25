import {useEffect} from 'react'
import {DEBUG, MAKE_apps_list} from 'idealos_schemas/js/debug.js'
import {GENERAL} from 'idealos_schemas/js/general.js'

const on = (elm, type, cb) => elm.addEventListener(type,cb)
function log(...args) { console.log(...args) }

export class Connection {
    constructor() {
        this.listeners = {}
        this.connected = false
        this.apps = []
        this.messages = []
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
            this.send(GENERAL.MAKE_ScreenStart())
        })
        on(this.socket,'error',(e)=> log("error",e))
        on(this.socket, 'close',(e)=>{
            log("closed",e)
            this.connected = false
            this.messages = []
            this.apps = []
            this.fire("disconnect",{})
        })
        on(this.socket,'message',(e)=>{
            // log("incoming message",e)
            let msg = JSON.parse(e.data)
            // log("message arrived",msg)
            if(msg.type === DEBUG.TYPE_ListAppsResponse) {
                this.apps = msg.apps
                this.fire("apps", this.apps)
            }
            this.messages = this.messages.slice().concat([msg])
            this.fire('message',msg)
        })
    }
    on(type,cb) {
        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(cb)
    }
    off(type,cb) {
        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type] = this.listeners[type].filter(c => c === cb)
    }
    fire(type, payload) {
        if(!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].forEach(l => l(payload))
    }
    send(msg) {
        this.socket.send(JSON.stringify(msg))
    }
    request_stop(appid) {
        this.send(DEBUG.MAKE_StopApp({target:appid}))
    }
    request_start(appid) {
        this.send(DEBUG.MAKE_StartApp({target:appid}))
    }
    request_restart(appid) {
        this.send(DEBUG.MAKE_RestartApp({target:appid}))
    }
    request_apps_list() {
        this.send(DEBUG.MAKE_ListAppsRequest())
    }
}


export function useConnected(connection,cb) {
    useEffect(() => {
        let hand = () => cb(connection.isConnected())
        connection.on('connect', hand)
        connection.on('disconnect', hand)
        return () => {
            connection.off('connect',hand)
            connection.off('disconnect',hand)
        }
    }, [connection])
}
