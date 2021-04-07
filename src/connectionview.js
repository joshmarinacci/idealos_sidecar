import {useState} from 'react'
import {useConnected} from './connection.js'


export function ConnectStatus({connection}) {
    let [connected, set_connected] = useState(connection.isConnected())
    useConnected(connection,()=> set_connected(connection.isConnected()))
    return <div>
        <button
            className={connected?"connected":"disconnected"}
            onClick={() => connection.isConnected()?connection.disconnect():connection.connect()}
            >{connected ? "disconnect" : "connect"}</button>
    </div>
}