import {useEffect, useState} from 'react'

export function ConnectStatus({connection}) {
    let [connected, set_connected] = useState(connection.isConnected())
    useEffect(() => {
        connection.on('connect', () => set_connected(true))
        connection.on('disconnect', () => set_connected(false))
    }, [connection])
    return <div>
        <div>connect status = {connected ? "true" : "false"}</div>
        <button onClick={() => {
            if (connection.isConnected()) {
                connection.disconnect()
            } else {
                connection.connect()
            }
        }}>{connected ? "disconnect" : "connect"}</button>
    </div>
}